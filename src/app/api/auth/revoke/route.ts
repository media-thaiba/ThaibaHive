import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { z } from "zod";
import { db } from "@/db";
import { staff, userSessions } from "@thaiba/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { withDPoP } from "@/lib/identity/dpop-middleware";
import { hasPermission } from "@thaiba/auth";

const revokeSchema = z.object({
  userId:    z.string().min(1),
  sessionId: z.string().min(1),
  reason:    z.string().min(1),
});

export const POST = withDPoP(requireAuth(async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId, sessionId, reason } = parsed.data;

  // Authorization: caller must own the target session, or hold system:security:revoke
  const isSelfSession = session.staffId === userId && session.sid === sessionId;
  if (!isSelfSession && !hasPermission(session.role as any, "system:security:revoke")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Tenant attribution: use caller's resolved institution, not staffId
  const tenantId = session.institutionId || "global";

  try {
    await db.transaction(async (tx) => {
      // 1. Verify target session belongs to target user (fail closed)
      const targetSession = await tx
        .select({ id: userSessions.id, staffId: userSessions.staffId, status: userSessions.status })
        .from(userSessions)
        .where(and(eq(userSessions.id, sessionId), eq(userSessions.staffId, userId)))
        .get();

      if (!targetSession) {
        throw new Error("Target session not found or does not belong to user");
      }
      if (targetSession.status !== "active") {
        throw new Error("Session already terminated");
      }

      // 2. Bump tokenVersion fatally — no silent catch
      await tx
        .update(staff)
        .set({
          tokenVersion: sql`coalesce(${staff.tokenVersion}, 1) + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(staff.id, userId))
        .run();

      // 3. Terminate target session row
      await tx
        .update(userSessions)
        .set({ status: "terminated", logoutAt: Date.now() })
        .where(and(eq(userSessions.id, sessionId), eq(userSessions.status, "active")))
        .run();

      // 4. Cryptographic audit log inside transaction
      await cryptoAuditWriter.log(
        {
          tenantId,
          userId: session.staffId,
          action: "IDENTITY_SESSION_REVOKED",
          entityType: "user_session",
          entityId: sessionId,
          payload: {
            targetStaffId: userId,
            reason,
            revokedBy: session.staffId,
          },
        },
        tx,
      );
    });
  } catch (err: any) {
    if (err?.message?.includes("not found") || err?.message?.includes("already terminated")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  return NextResponse.json({ revoked: true, sessionId, userId });
}, "system:security:revoke"), { required: true });
