import { NextResponse } from "next/server";
import { verifySession, getRoleRank, isAuthorizedDeveloper, verifyActionStepUpToken, consumeStepUpTokenInTx, getClientIp, hasPermission } from "@thaiba/auth";
import { db } from "@/db";
import { userSessions, staff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { cookies, headers } from "next/headers";

const terminateBodySchema = z.object({
  stepUpToken: z.string().min(1, "Step-up token is required"),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional().default("Administrative termination"),
});

export function checkAllowedOrigin(originHeader: string | null | undefined, isCookieAuth: boolean): boolean {
  if (!originHeader) {
    if (isCookieAuth) return false;
    return true;
  }
  try {
    const originUrl = new URL(originHeader);
    const host = originUrl.host.toLowerCase();

    if (process.env.NODE_ENV !== "production") {
      if (host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:")) {
        return true;
      }
    }

    const configured = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean);
    if (configured.some((allowed) => allowed === originHeader.toLowerCase() || allowed === host)) {
      return true;
    }

    if (/^[a-z0-9-]+\.thaiba-hive\.vercel\.app$/.test(host) || host === "thaiba-hive.vercel.app") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: targetSid } = await context.params;

  let isCookieAuth = false;
  try {
    const cookieStore = await cookies();
    isCookieAuth = Boolean(cookieStore.get("thaibahive_session")?.value);
  } catch {
    // Non-cookie environment
  }

  // 1. Origin verification
  const originHeader = request.headers.get("origin");
  if (!checkAllowedOrigin(originHeader, isCookieAuth)) {
    return NextResponse.json({ error: "Forbidden: Invalid or missing Origin header" }, { status: 403 });
  }

  // 2. Caller Authentication
  let session = null;
  try {
    session = await verifySession();
  } catch {
    // Invalid session
  }
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Permission Gate: must possess system:sessions:terminate
  if (!hasPermission(session.role, "system:sessions:terminate")) {
    return NextResponse.json({ error: "Forbidden: Missing system:sessions:terminate permission" }, { status: 403 });
  }

  // 3. Body validation
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  const parsed = terminateBodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { stepUpToken, reason } = parsed.data;

  // 4. Step-up token verification (action 'session:terminate')
  const stepUpResult = await verifyActionStepUpToken(stepUpToken, {
    staffId: session.staffId,
    sid: session.sid,
    action: "session:terminate",
  });
  if (!stepUpResult.success) {
    return NextResponse.json(
      { error: `Step-up authentication failed: ${stepUpResult.error}` },
      { status: 403 }
    );
  }

  // 5. Lookup target session from DB
  const targetSession = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, targetSid))
    .get();

  if (!targetSession) {
    return NextResponse.json({ success: true, terminated: false, message: "Session not found" }, { status: 200 });
  }

  // Self-termination protection
  if (session.sid === targetSid) {
    return NextResponse.json({ error: "Forbidden: Cannot terminate your own active session" }, { status: 403 });
  }

  // 6. Lookup live staff records for caller and target
  const callerStaff = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      emailVerifiedAt: staff.emailVerifiedAt,
    })
    .from(staff)
    .where(eq(staff.id, session.staffId))
    .get();

  if (!callerStaff || !callerStaff.isActive) {
    return NextResponse.json({ error: "Forbidden: Caller staff record inactive or missing" }, { status: 403 });
  }

  const targetStaff = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      emailVerifiedAt: staff.emailVerifiedAt,
    })
    .from(staff)
    .where(eq(staff.id, targetSession.staffId))
    .get();

  if (!targetStaff) {
    return NextResponse.json({ success: true, terminated: false, message: "Target staff record not found" }, { status: 200 });
  }

  // Special Security Rule: System accounts cannot be managed or terminated through API
  if (targetStaff.role === "system") {
    return NextResponse.json(
      { error: "Forbidden: System account sessions cannot be terminated through administrative APIs" },
      { status: 403 }
    );
  }

  // 7. Role rank & matrix evaluation - Fail closed on null rank
  const callerRank = getRoleRank(callerStaff.role);
  const targetRank = getRoleRank(targetStaff.role);
  if (callerRank === null || targetRank === null) {
    return NextResponse.json({ error: "Forbidden: Unknown role in hierarchy (fail-closed)" }, { status: 403 });
  }

  const callerIsDev = isAuthorizedDeveloper(callerStaff);
  const targetIsDev = isAuthorizedDeveloper(targetStaff);

  if (callerIsDev) {
    // Developer can terminate anyone except own current sid
  } else if (callerStaff.role === "super_admin") {
    // Super admin cannot terminate developers
    if (targetIsDev) {
      return NextResponse.json(
        { error: "Forbidden: Super admin cannot terminate developer sessions" },
        { status: 403 }
      );
    }
    // Super admin may only terminate non-developer targets strictly below super_admin rank (targetRank < callerRank)
    if (targetRank >= callerRank) {
      return NextResponse.json(
        { error: "Forbidden: Super admin may only terminate targets with rank strictly below super_admin" },
        { status: 403 }
      );
    }
  } else {
    // Everyone else receives 403
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges to terminate sessions" },
      { status: 403 }
    );
  }

  // 8. Transactional termination & audit entry
  const now = Date.now();
  let headersList: Headers | null = null;
  try {
    headersList = await headers();
  } catch {
    // Non-request context
  }

  let wasTerminated = false;
  try {
    await db.transaction(async (tx: any) => {
      // 1. Consume step-up jti inside the transaction
      await consumeStepUpTokenInTx(tx, {
        jti: stepUpResult.payload.jti,
        staffId: session.staffId,
        action: "session:terminate",
        exp: stepUpResult.exp,
      });

      // 2. Idempotent terminate via .returning()
      const result = await tx
        .update(userSessions)
        .set({
          status: "terminated",
          logoutAt: now,
        })
        .where(and(eq(userSessions.id, targetSid), eq(userSessions.status, "active")))
        .returning({ id: userSessions.id });

      wasTerminated = result.length > 0;

      // 3. Write cryptographic audit entry strictly through tx
      await cryptoAuditWriter.log(
        {
          tenantId: targetSession.institutionId || "default",
          userId: session.staffId,
          action: "SESSION_TERMINATE",
          entityType: "user_session",
          entityId: targetSid,
          payload: {
            targetStaffId: targetStaff.id,
            targetRole: targetStaff.role,
            reason,
            wasActive: wasTerminated,
          },
          ipAddress: getClientIp(headersList),
          userAgent: headersList?.get("user-agent") || null,
        },
        tx
      );
    });
  } catch (txErr: any) {
    const allMessages = [
      txErr?.message,
      txErr?.cause?.message,
      txErr?.cause?.cause?.message,
      String(txErr),
    ]
      .filter(Boolean)
      .join(" ");

    const allCodes = [
      txErr?.code,
      txErr?.rawCode,
      txErr?.cause?.code,
      txErr?.cause?.rawCode,
    ].filter(Boolean);

    // Explicit primary key / unique constraint check on step_up_used
    const isStepUpPrimaryKeyReplay =
      allCodes.includes("23505") || // Postgres unique_violation
      allCodes.includes("SQLITE_CONSTRAINT_PRIMARYKEY") || // LibSQL primary key
      allCodes.includes("SQLITE_CONSTRAINT_UNIQUE") ||
      allMessages.includes("step_up_used_pkey") ||
      allMessages.includes("step_up_used.jti") ||
      allMessages.includes("step_up_used.PRIMARY") ||
      (allMessages.includes("step_up_used") &&
        (allMessages.includes("UNIQUE") ||
          allMessages.includes("PRIMARY") ||
          allMessages.includes("constraint failed")));

    if (isStepUpPrimaryKeyReplay) {
      return NextResponse.json(
        { error: "Forbidden: Step-up token has already been used (replay detected)" },
        { status: 403 }
      );
    }
    throw txErr;
  }

  // 9. Close active WebSocket connections for terminated session
  try {
    const { ChatWebSocketHandler } = await import("@/lib/chat/ws-handler");
    ChatWebSocketHandler.getInstance().terminateSessionSockets(targetSid);
  } catch {
    // Non-fatal if chat handler not loaded
  }

  return NextResponse.json({
    success: true,
    terminated: wasTerminated,
  });
}
