import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, userSessions, usedNonces } from "@/db/schema";
import { verifyRefreshToken, createSessionWithRefresh } from "@thaiba/auth";
import { eq, and } from "drizzle-orm";
import { checkDistributedRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

/**
 * True ONLY for genuine UNIQUE / primary-key violations (SQLite + Postgres).
 * A replayed refresh token is the only case that should ever revoke a session;
 * a transient DB error (locked database, dropped connection) must not be
 * mistaken for replay, or a flaky write would kill a healthy session.
 */
function isDuplicateKeyError(err: unknown): boolean {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 4; depth++) {
    const e = cur as { code?: unknown; message?: unknown };
    const code = typeof e.code === "string" ? e.code : "";
    if (
      code === "SQLITE_CONSTRAINT_UNIQUE" ||
      code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
      code === "23505"
    ) {
      return true;
    }
    const message = typeof e.message === "string" ? e.message : "";
    if (
      message.includes("UNIQUE constraint failed") ||
      message.includes("duplicate key value violates unique constraint")
    ) {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

function hashIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = await checkDistributedRateLimit(`auth:refresh:${ip}`, "auth");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty if caller uses cookie/bearer
    }

    const refreshToken = body?.refreshToken || body?.refresh_token;

    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Verify staff exists, is active, and tokenVersion matches
    const staffMember = await db
      .select()
      .from(staff)
      .where(eq(staff.id, payload.staffId))
      .get();

    if (!staffMember || !staffMember.isActive) {
      return NextResponse.json(
        { error: "Account inactive or not found" },
        { status: 401 }
      );
    }

    if ((staffMember.tokenVersion ?? 0) !== payload.tokenVersion) {
      return NextResponse.json(
        { error: "Session revoked due to credential change" },
        { status: 401 }
      );
    }

    // Refresh Token Family Tracking (RFC 6819):
    // If the family this token belongs to was previously revoked due to reuse,
    // this descendant token MUST be rejected immediately and the session revoked.
    const familyId = payload.familyId || payload.sid;
    const familyRevokedKey = `rf_fam:${familyId}`;

    const revokedFamilyRow = await db
      .select({ jti: usedNonces.jti })
      .from(usedNonces)
      .where(eq(usedNonces.jti, familyRevokedKey))
      .get();

    if (revokedFamilyRow) {
      console.warn("[Security Audit] Attempt to use token from revoked family:", {
        sid: payload.sid,
        familyId,
        jtiHash: hashIdentifier(payload.jti),
        ip,
      });

      await db
        .update(userSessions)
        .set({ status: "revoked", logoutAt: Date.now() })
        .where(eq(userSessions.id, payload.sid))
        .run()
        .catch(() => {});

      return NextResponse.json(
        { error: "Refresh token family revoked due to previous reuse" },
        { status: 401 }
      );
    }

    // Verify existing session in userSessions
    const sessionRow = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.id, payload.sid),
          eq(userSessions.staffId, staffMember.id)
        )
      )
      .get();

    if (!sessionRow || sessionRow.status !== "active") {
      return NextResponse.json(
        { error: "Session terminated or not found" },
        { status: 401 }
      );
    }

    if (sessionRow.expiresAt <= Date.now()) {
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    const MAX_ABSOLUTE_SESSION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days absolute cap from initial login
    const remainingMs = sessionRow.loginAt + MAX_ABSOLUTE_SESSION_MS - Date.now();
    if (remainingMs <= 0) {
      return NextResponse.json(
        { error: "Session reached maximum lifetime" },
        { status: 401 }
      );
    }

    // Reuse detection (RFC 6819) via usedNonces. Consuming the jti AFTER all
    // validation above means a rejected refresh (expired / capped / inactive)
    // never burns the token.
    const consumedJti = payload.jti ? `rf:${payload.jti}` : null;
    if (consumedJti) {
      try {
        await db
          .insert(usedNonces)
          .values({
            jti: consumedJti,
            expiresAt: payload.exp
              ? new Date(payload.exp * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .run();
      } catch (err: unknown) {
        if (!isDuplicateKeyError(err)) {
          // Transient DB failure — NOT a replay. Fail with 500 and leave the
          // session untouched so the client can simply retry.
          throw err;
        }
        // Reuse detected! Immediate revocation of entire session AND token family (RFC 6819)
        console.warn("[Security Audit] Refresh token reuse detected; revoking session & token family:", {
          sid: payload.sid,
          jtiHash: hashIdentifier(payload.jti),
          familyId,
          ip,
          error: err instanceof Error ? err.message : String(err),
        });

        // 1. Revoke the token family so all descendant tokens are dead
        await db
          .insert(usedNonces)
          .values({
            jti: familyRevokedKey,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .run()
          .catch(() => {});

        // 2. Revoke the session row
        await db
          .update(userSessions)
          .set({ status: "revoked", logoutAt: Date.now() })
          .where(eq(userSessions.id, payload.sid))
          .run();

        return NextResponse.json(
          { error: "Refresh token reuse detected; session revoked" },
          { status: 401 }
        );
      }
    }

    // Sliding renewal: extend session and mint new tokens (30 days for mobile),
    // clamped so the session can NEVER outlive loginAt + 90 days — otherwise a
    // day-89 refresh would mint a token valid until day 119.
    const isMobileClient = (request.headers.get("x-client-platform") ?? "").toLowerCase() === "mobile" || sessionRow.deviceType === "mobile";
    const ttlSeconds = Math.min(30 * 24 * 60 * 60, Math.floor(remainingMs / 1000)); // 30 days renewal, capped

    const sessionPayload = {
      sid: payload.sid,
      staffId: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      employeeId: staffMember.employeeId,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      tokenVersion: staffMember.tokenVersion ?? 0,
      institutionId: sessionRow.institutionId,
    };

    try {
      // Update userSessions lastActiveAt and expiresAt
      await db
        .update(userSessions)
        .set({
          lastActiveAt: Date.now(),
          expiresAt: Date.now() + ttlSeconds * 1000,
        })
        .where(eq(userSessions.id, payload.sid));

      const nextGeneration = (payload.generation ?? 0) + 1;
      const { token: newAccessToken, refreshToken: newRefreshToken } = await createSessionWithRefresh(
        sessionPayload,
        true,
        sessionRow.deviceType ?? (isMobileClient ? "mobile" : "desktop"),
        ttlSeconds,
        {
          familyId,
          generation: nextGeneration,
        }
      );

      return NextResponse.json({
        ...(isMobileClient ? { token: newAccessToken, refreshToken: newRefreshToken } : {}),
        user: {
          id: staffMember.id,
          email: staffMember.email,
          firstName: staffMember.firstName,
          lastName: staffMember.lastName,
          role: staffMember.role,
          employeeId: staffMember.employeeId,
        },
        staff: {
          id: staffMember.id,
          email: staffMember.email,
          firstName: staffMember.firstName,
          lastName: staffMember.lastName,
          role: staffMember.role,
          employeeId: staffMember.employeeId,
        },
      });
    } catch (err) {
      // Renewal failed AFTER the jti was consumed. Release it, otherwise the
      // client's legitimate retry would look like replay and revoke the session.
      if (consumedJti) {
        await db
          .delete(usedNonces)
          .where(eq(usedNonces.jti, consumedJti))
          .run()
          .catch(() => {});
      }
      throw err;
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
