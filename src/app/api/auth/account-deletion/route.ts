import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, userSessions, userAppAssignments, auditLog, presence } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse, checkDistributedRateLimit } from "@/lib/api/rate-limit";
import { verifyPassword } from "@/lib/auth";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST /api/auth/account-deletion
 *
 * Self-service account closure required by:
 *  - Apple App Store Guideline 5.1.1(v) (in-app account deletion)
 *  - Google Play User Data Policy (account deletion support)
 *  - Digital Personal Data Protection Act, 2023 §12 (erasure by Data Principal)
 *
 * Behaviour:
 *  1. Re-authenticates the caller (local password, or exact account email for
 *     federated-only accounts that have no local password hash).
 *  2. Immediately revokes every active session: staff.tokenVersion += 1 and all
 *     user_sessions rows are terminated, so outstanding JWTs stop verifying.
 *  3. Marks the account inactive and anonymises non-statutory PII.
 *  4. Retains only records that Indian statute requires us to keep (payroll,
 *     income-tax and audit-trail data) for the statutory retention window.
 *
 * The anti-self-deletion guard on DELETE /api/staff/[id] is intentionally left
 * untouched: that endpoint is an *administrative* mutation and must not become a
 * way for an admin to erase their own audit trail without re-authentication.
 */

const DELETION_GRACE_DAYS = 30;

type DeletionBody = {
  password?: unknown;
  confirmEmail?: unknown;
};

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  // Re-authentication is a credential check, so it gets its own tighter budget.
  const attemptLimit = await checkDistributedRateLimit(`account-deletion:${session.staffId}`, {
    max: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!attemptLimit.allowed) {
    return NextResponse.json(
      { error: "Too many deletion attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: DeletionBody = {};
  try {
    body = (await request.json()) as DeletionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const target = await db
    .select({
      id: staff.id,
      role: staff.role,
      isActive: staff.isActive,
      passwordHash: staff.passwordHash,
      email: staff.email,
    })
    .from(staff)
    .where(eq(staff.id, session.staffId))
    .get();

  if (!target) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (target.role === "system") {
    return NextResponse.json(
      { error: "Forbidden: System accounts cannot be deleted" },
      { status: 403 }
    );
  }

  // Zero-lockout guard: never allow the last active super_admin to erase itself,
  // otherwise the institution loses all administrative access.
  if (target.role === "super_admin") {
    const activeSuperAdmins = await db
      .select({ count: sql<number>`count(*)` })
      .from(staff)
      .where(and(eq(staff.role, "super_admin"), eq(staff.isActive, true)))
      .get();
    if ((activeSuperAdmins?.count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "This is the last active Super Admin account. Promote another Super Admin before deleting this one.",
        },
        { status: 409 }
      );
    }
  }

  // ── Re-authentication ────────────────────────────────────────────────
  if (target.passwordHash) {
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    const valid = await verifyPassword(password, target.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
  } else {
    // Federated-only account (Google SSO): there is no local credential to
    // re-enter, so confirm by typing the account email address exactly.
    const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim() : "";
    if (!confirmEmail || confirmEmail.toLowerCase() !== target.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Type your account email address exactly to confirm deletion" },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
  const scheduledPurgeAt = new Date(
    Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  // Deterministic pseudonymous address: unique constraint is preserved without
  // retaining the Data Principal's real identifier.
  const anonymisedEmail = `deleted-${crypto
    .createHash("sha256")
    .update(target.id)
    .digest("hex")
    .slice(0, 16)}@deleted.local`;

  try {
    await db.transaction(async (tx) => {
      // 1. Kill every outstanding JWT immediately.
      await tx
        .update(staff)
        .set({ tokenVersion: sql`${staff.tokenVersion} + 1` })
        .where(eq(staff.id, target.id))
        .run();

      // 2. Terminate all server-side sessions.
      await tx
        .update(userSessions)
        .set({ status: "terminated", logoutAt: Date.now() })
        .where(and(eq(userSessions.staffId, target.id), eq(userSessions.status, "active")))
        .run();

      // 3. Deactivate the account.
      await tx
        .update(staff)
        .set({ isActive: false, updatedAt: now })
        .where(eq(staff.id, target.id))
        .run();

      // 4. Revoke application assignments.
      await tx
        .update(userAppAssignments)
        .set({
          status: "revoked",
          revokedAt: now,
          revokedById: target.id,
          revokedReason: "Account deleted by account owner",
        })
        .where(eq(userAppAssignments.staffId, target.id))
        .run();

      // 5. Anonymise non-statutory personal data.
      //    Retained on purpose: employeeId, dateOfJoining, contractEndDate,
      //    designation (employment record), aadhaar/pan/bank/ifsc (Income Tax
      //    Act retention), and the append-only audit trail.
      await tx
        .update(staff)
        .set({
          email: anonymisedEmail,
          firstName: "Deleted",
          lastName: "Account",
          phone: null,
          avatarUrl: null,
          dateOfBirth: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          qualifications: null,
          certificates: null,
          experienceYears: null,
          skills: null,
          languages: null,
          biography: null,
          teachingSubjects: null,
          nfcTagId: null,
          faceEmbedding: null,
          faceRegisteredAt: null,
          fingerprintHash: null,
          fingerprintRegisteredAt: null,
          biometricEnabled: false,
          biometricStatus: "revoked",
          googleSub: null,
          passwordHash: null,
          emailVerifiedAt: null,
          updatedAt: now,
        })
        .where(eq(staff.id, target.id))
        .run();

      // 6. Drop presence so the user disappears from live rosters.
      await tx
        .update(presence)
        .set({ online: false, lastSeenAt: now, updatedAt: now })
        .where(eq(presence.staffId, target.id))
        .run();

      await tx
        .insert(auditLog)
        .values({
          id: crypto.randomUUID(),
          staffId: target.id,
          action: "account_deleted_self",
          entityType: "staff",
          entityId: target.id,
          details: {
            initiatedBy: session.staffId,
            scheduledPurgeAt,
            retainedUntil: scheduledPurgeAt,
            retentionBasis:
              "Statutory retention: employment records 7 yrs, income-tax records 10 yrs, audit trail immutable",
          },
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        })
        .run();

      await cryptoAuditWriter.log(
        {
          tenantId: session.institutionId || "global",
          userId: target.id,
          action: "ACCOUNT_DELETE_SELF",
          entityType: "staff",
          entityId: target.id,
          payload: { scheduledPurgeAt, role: target.role },
        },
        tx
      );
    });
  } catch (err) {
    console.error("account-deletion transaction failed:", err);
    return NextResponse.json(
      { error: "Account deletion failed. Please contact the grievance officer." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    success: true,
    message:
      "Your account has been deleted. All sessions were revoked immediately; non-statutory personal data has been anonymised.",
    scheduledPurgeAt,
    retentionNotice:
      "Employment, income-tax and audit records are retained only for the period required by Indian law.",
  });

  try {
    response.cookies.delete("thaibahive_session");
  } catch {
    // Non-cookie environment
  }
  return response;
}, "profile:write");
