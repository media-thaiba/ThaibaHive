import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { authConfig, getJwtSecretBytes } from "./config";
import { db, staff, userSessions } from "@thaiba/db";
import { eq, and, lt } from "drizzle-orm";

const sessionPayloadSchema = z.object({
  sid: z.string().optional(),
  staffId: z.string(),
  email: z.string(),
  role: z.string(),
  employeeId: z.string(),
  name: z.string(),
  tokenVersion: z.union([z.number(), z.null(), z.undefined()]).transform((v) => v ?? 0),
  dpopEnabled: z.boolean().optional().default(false),
  institutionId: z.string().nullable().optional(),
});

export type SessionPayload = {
  sid: string;
  staffId: string;
  email: string;
  role: string;
  employeeId: string;
  name: string;
  tokenVersion: number;
  dpopEnabled?: boolean;
  institutionId?: string | null;
};

export type DPoPSessionPayload = SessionPayload & {
  cnfJkt?: string;
};

export function getClientIp(headersList?: Headers | null): string | null {
  if (!headersList) return null;
  const ip = headersList.get("x-vercel-forwarded-for") || headersList.get("x-real-ip");
  return ip ? ip.split(",")[0].trim() : null;
}

export function detectDeviceType(ua?: string | null, override?: string): string {
  if (override) return override;
  if (!ua) return "desktop";
  const lower = ua.toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) return "mobile";
  if (lower.includes("tablet") || lower.includes("ipad")) return "tablet";
  return "desktop";
}

interface MintSessionOptions {
  extendSession?: boolean;
  ttlSeconds?: number;
  dpopThumbprint?: string;
  deviceType?: string;
  clientIp?: string | null;
  userAgent?: string | null;
}

/**
 * Shared internal helper that mints session records and signed JWTs.
 * Ensures initial login inserts the DB row before signing the JWT (fail-closed).
 * row.expires_at === jwt.exp * 1000 (exact to the second).
 */
export async function mintSessionInternal(
  payload: Omit<SessionPayload, "sid"> & { sid?: string },
  options: MintSessionOptions = {}
): Promise<{ token: string; sid: string; expiresAtMs: number }> {
  const sid = payload.sid || `sess_${crypto.randomBytes(12).toString("hex")}`;
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  let ttlSeconds = options.ttlSeconds;
  if (!ttlSeconds) {
    ttlSeconds = options.extendSession
      ? 60 * 60 * 24 * 7 // 7 days
      : 60 * 60 * 24;    // 24 hours
  }
  const expSec = nowSec + ttlSeconds;
  const expiresAtMs = expSec * 1000;

  let clientIp: string | null = options.clientIp ?? null;
  let userAgent: string | null = options.userAgent ?? null;
  if (!clientIp || !userAgent) {
    try {
      const headersList = await headers();
      if (!clientIp) clientIp = getClientIp(headersList);
      if (!userAgent) userAgent = headersList.get("user-agent") || null;
    } catch {
      // Non-request context
    }
  }

  const deviceType = options.deviceType || detectDeviceType(userAgent);

  // Insert session row into DB. Fail closed if DB write fails.
  await db.insert(userSessions).values({
    id: sid,
    staffId: payload.staffId,
    email: payload.email,
    role: payload.role,
    institutionId: payload.institutionId ?? null,
    status: "active",
    clientIp,
    userAgent,
    deviceType,
    loginAt: nowMs,
    lastActiveAt: nowMs,
    expiresAt: expiresAtMs,
    logoutAt: null,
    createdAt: nowMs,
  });

  const fullPayload: SessionPayload = {
    ...payload,
    sid,
  };

  const jwtBuilder = new SignJWT({
    ...fullPayload,
    ...(options.dpopThumbprint ? { cnf: { jkt: options.dpopThumbprint } } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expSec)
    .setIssuedAt(nowSec);

  const token = await jwtBuilder.sign(getJwtSecretBytes("session"));

  return { token, sid, expiresAtMs };
}

export async function createSession(
  payload: Omit<SessionPayload, "sid"> & { sid?: string },
  extendSession = false,
  deviceType?: string
) {
  const { token } = await mintSessionInternal(payload, { extendSession, deviceType });

  try {
    const cookieStore = await cookies();
    const maxAge = extendSession
      ? 60 * 60 * 24 * 7  // 7 days with "Remember Me"
      : 60 * 60 * 24;     // 24 hours default

    const cookieOptions: Record<string, unknown> = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge,
    };

    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    cookieStore.set(authConfig.cookieName, token, cookieOptions);
  } catch (err) {
    console.error("[DEBUG] createSession cookieStore error:", err);
    // Non-request context (e.g. tests or background jobs)
  }

  return token;
}

export async function createDPoPSession(
  payload: Omit<SessionPayload, "sid"> & { sid?: string },
  dpopThumbprint: string,
  _extendSession = false,
  deviceType?: string
) {
  const enhancedPayload = {
    ...payload,
    dpopEnabled: true,
  };

  const { token } = await mintSessionInternal(enhancedPayload, {
    ttlSeconds: 10 * 60, // 10 minutes for DPoP sessions
    dpopThumbprint,
    deviceType,
  });

  try {
    const cookieStore = await cookies();
    const maxAge = 10 * 60; // 10 minutes

    const cookieOptions: Record<string, unknown> = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    };

    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    cookieStore.set(authConfig.cookieName, token, cookieOptions);
  } catch {
    // Non-request context
  }

  return token;
}

export async function touchSession(sid: string, now: number = Date.now()): Promise<void> {
  try {
    await db
      .update(userSessions)
      .set({ lastActiveAt: now })
      .where(
        and(
          eq(userSessions.id, sid),
          eq(userSessions.status, "active"),
          lt(userSessions.lastActiveAt, now - 120_000)
        )
      )
      .run();
  } catch (err) {
    console.warn(`[@thaiba/auth] Session heartbeat failed for ${sid}:`, err);
  }
}

export async function verifySession(): Promise<SessionPayload | null> {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(authConfig.cookieName)?.value;
  } catch {
    // Missing request store in test environment
  }

  if (!token) {
    try {
      const headersList = await headers();
      const authHeader = headersList.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    } catch {
      // Missing request store in test environment
    }
  }

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes("session"));
    if (payload.purpose === "mobile_handoff") {
      return null;
    }
    if (payload.dpopEnabled === true) {
      // SEC-DPOP: DPoP-bound tokens must not be accepted as ambient bearer/cookie tokens
      return null;
    }
    if (!payload.sid || typeof payload.sid !== "string") {
      throw new Error("LEGACY_SESSION_EXPIRED");
    }

    const result = sessionPayloadSchema.safeParse(payload);
    if (!result.success) return null;
    const session = { ...result.data, sid: payload.sid } as SessionPayload;

    // Single query joining staff and user_sessions on both keys
    const row = await db
      .select({
        staffId: staff.id,
        isActive: staff.isActive,
        tokenVersion: staff.tokenVersion,
        role: staff.role,
        sessionStatus: userSessions.status,
        sessionExpiresAt: userSessions.expiresAt,
      })
      .from(staff)
      .innerJoin(
        userSessions,
        and(
          eq(userSessions.id, session.sid),
          eq(userSessions.staffId, staff.id)
        )
      )
      .where(eq(staff.id, session.staffId))
      .get();

    if (!row) return null;
    if (!row.isActive) return null;
    if ((row.tokenVersion ?? 0) !== session.tokenVersion) return null;
    if (row.sessionStatus !== "active") return null;
    if (row.sessionExpiresAt <= Date.now()) return null;

    try {
      after(() => touchSession(session.sid, Date.now()));
    } catch {
      touchSession(session.sid, Date.now()).catch(() => {});
    }

    return {
      ...session,
      role: (row.role as any) || session.role,
    };
  } catch (error: unknown) {
    if ((error as any)?.message === "LEGACY_SESSION_EXPIRED") {
      throw error;
    }
    console.error("[Auth] Session verification failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function verifyDPoPSession(
  token: string,
  dpopProof: { jkt: string }
): Promise<DPoPSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes("session"));
    if (payload.dpopEnabled !== true) {
      return null;
    }
    const cnf = (payload as any).cnf;
    if (!cnf || typeof cnf !== "object" || cnf.jkt !== dpopProof.jkt) {
      return null;
    }
    if (!payload.sid || typeof payload.sid !== "string") {
      return null;
    }

    const result = sessionPayloadSchema.safeParse(payload);
    if (!result.success) return null;
    const session = { ...result.data, sid: payload.sid } as SessionPayload;

    const row = await db
      .select({
        staffId: staff.id,
        isActive: staff.isActive,
        tokenVersion: staff.tokenVersion,
        role: staff.role,
        sessionStatus: userSessions.status,
        sessionExpiresAt: userSessions.expiresAt,
      })
      .from(staff)
      .innerJoin(
        userSessions,
        and(
          eq(userSessions.id, session.sid),
          eq(userSessions.staffId, staff.id)
        )
      )
      .where(eq(staff.id, session.staffId))
      .get();

    if (!row) return null;
    if (!row.isActive) return null;
    if ((row.tokenVersion ?? 0) !== session.tokenVersion) return null;
    if (row.sessionStatus !== "active") return null;
    if (row.sessionExpiresAt <= Date.now()) return null;

    try {
      after(() => touchSession(session.sid, Date.now()));
    } catch {
      touchSession(session.sid, Date.now()).catch(() => {});
    }

    return {
      ...session,
      role: (row.role as any) || session.role,
      cnfJkt: cnf.jkt,
    };
  } catch (err) {
    console.error("[Auth] DPoP Session verification failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(authConfig.cookieName);
}

export async function createStepUpToken(staffId: string, challengeId: string): Promise<string> {
  return await new SignJWT({ staffId, challengeId, stepUpPending: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getJwtSecretBytes("step-up"));
}

export async function verifyStepUpToken(token: string): Promise<{ staffId: string; challengeId?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes("step-up"));
    if (payload.staffId && typeof payload.staffId === "string" && payload.stepUpPending === true) {
      return {
        staffId: payload.staffId,
        challengeId: typeof payload.challengeId === "string" ? payload.challengeId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
