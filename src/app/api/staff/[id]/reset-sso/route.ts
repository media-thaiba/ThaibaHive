import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { verifyStepUpToken, canMutateStaff, getRoleRank } from "@thaiba/auth";
import { EventBus } from "@/lib/observability/event-bus";
import { eq, sql, and, ne } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const resetSsoSchema = z.object({
  newEmail: z.string().email("Invalid email address").optional(),
  reason: z.string().max(500).optional(),
});

export const POST = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  // 1. Mandatory Step-Up Authentication for sensitive identity / SSO resets
  const stepUpHeader = request.headers.get("x-step-up-token") || "";
  const stepUp = await verifyStepUpToken(stepUpHeader);
  if (!stepUp || stepUp.staffId !== session.staffId) {
    return NextResponse.json(
      {
        error: "Step-up authentication required for staff identity or SSO link modification",
        code: "STEP_UP_REQUIRED",
      },
      { status: 403 }
    );
  }

  // 2. Caller must have tenant authorization to access this staff member
  const authorized = await canAccessStaff(session.staffId, session.role, id);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden: Cross-tenant access denied" }, { status: 403 });
  }

  const target = await db
    .select({ id: staff.id, email: staff.email, role: staff.role })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!target) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  // 3. Strict Role Hierarchy Guard: Canonical check via canMutateStaff
  if (!canMutateStaff(session.role, target.role)) {
    const callerRank = getRoleRank(session.role);
    const targetRank = getRoleRank(target.role);
    console.warn(
      `[SECURITY] Blocked reset-sso privilege escalation attempt: ${session.role} (rank ${callerRank}) attempted to modify ${target.role} (rank ${targetRank})`
    );
    return NextResponse.json(
      { error: "Forbidden: Cannot reset SSO or alter identity of equal or higher-ranked staff member" },
      { status: 403 }
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = resetSsoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { newEmail, reason } = parsed.data;
  const normalizedNewEmail = newEmail ? newEmail.toLowerCase().trim() : undefined;

  // 4. Case-insensitive collision check across all staff
  if (normalizedNewEmail && normalizedNewEmail !== target.email.toLowerCase()) {
    const collision = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(sql`lower(${staff.email})`, normalizedNewEmail), ne(staff.id, id)))
      .get();

    if (collision) {
      return NextResponse.json(
        { error: "A staff member with this email already exists" },
        { status: 409 }
      );
    }
  }

  const now = new Date().toISOString();
  const finalEmail = normalizedNewEmail || target.email;

  // 5. Atomically unbind Google SSO, update email, and bump tokenVersion to kill all active sessions
  await db
    .update(staff)
    .set({
      googleSub: null,
      email: finalEmail,
      tokenVersion: sql`${staff.tokenVersion} + 1`,
      updatedAt: now,
    })
    .where(eq(staff.id, id))
    .run();

  // 6. Audit log entry for tracking
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    action: "staff_sso_reset",
    entityType: "staff",
    entityId: id,
    details: {
      previousEmail: target.email,
      newEmail: finalEmail,
      reason: reason || "Admin reset Google SSO binding",
      resetById: session.staffId,
    },
  }).run();

  // 7. Publish security notification event
  EventBus.getInstance().publishEvent({
    eventSource: "staff_identity_management",
    severity: "info",
    message: `Staff identity/SSO reset for ${target.email} -> ${finalEmail} by admin ${session.staffId}`,
  });

  return NextResponse.json({
    success: true,
    message: "Google SSO link cleared and active sessions revoked successfully",
    staff: {
      id,
      email: finalEmail,
      googleSub: null,
    },
  });
}, "staff:update");
