import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions, userAppAssignments, auditLog, userSessions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import {
  hasPermission,
  type StaffRole,
  getRoleRank,

  canMutateStaff,
  isAuthorizedDeveloper,
  verifyActionStepUpToken,
  consumeStepUpTokenInTx,
  isStepUpReplayError,
  getStaffInstitutionMemberships,
  isRegionalScopeRole,
  resolveScopedInstitutionId,
} from "@thaiba/auth";
import { pick } from "@/lib/api/pick";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { autoAssignOffboardingChecklists } from "@/lib/onboarding/auto-assign";
import { encryptPiiField, decryptPiiField } from "@/lib/crypto/tenant-encryption";
import { staffUpdateSchema } from "@/lib/validation/schemas";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { eq, and, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const authorized = await canAccessStaff(session.staffId, session.role, id);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await db
    .select({
      id: staff.id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      employeeId: staff.employeeId,
      phone: staff.phone,
      designation: staff.designation,
      avatarUrl: staff.avatarUrl,
      isActive: staff.isActive,
      dateOfBirth: staff.dateOfBirth,
      dateOfJoining: staff.dateOfJoining,
      qualifications: staff.qualifications,
      certificates: staff.certificates,
      experienceYears: staff.experienceYears,
      skills: staff.skills,
      languages: staff.languages,
      emergencyContactName: staff.emergencyContactName,
      emergencyContactPhone: staff.emergencyContactPhone,
      aadhaar: staff.aadhaar,
      pan: staff.pan,
      bankAccount: staff.bankAccount,
      ifscCode: staff.ifscCode,
      contractEndDate: staff.contractEndDate,
      teachingSubjects: staff.teachingSubjects,
      biography: staff.biography,
      nfcTagId: staff.nfcTagId,
    })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const departments = await db.select().from(staffDepartments).where(eq(staffDepartments.staffId, id)).all();
  const institutions = await db.select().from(staffInstitutions).where(eq(staffInstitutions.staffId, id)).all();

  // Decrypt sensitive PII fields before sending to authorized client
  const decryptedMember = {
    ...member,
    aadhaar: decryptPiiField(member.aadhaar),
    pan: decryptPiiField(member.pan),
    bankAccount: decryptPiiField(member.bankAccount),
    ifscCode: decryptPiiField(member.ifscCode),
  };

  return NextResponse.json({ staff: decryptedMember, departments, institutions });
}, "staff:read");

const UPDATABLE_FIELDS = [
  "firstName", "lastName", "phone", "designation", "avatarUrl",
  "dateOfBirth", "dateOfJoining", "qualifications", "certificates",
  "experienceYears", "skills", "languages",
  "emergencyContactName", "emergencyContactPhone",
  "aadhaar", "pan", "bankAccount", "ifscCode",
  "contractEndDate", "teachingSubjects", "biography", "nfcTagId",
  "role", "isActive",
] as const;

const PII_FIELDS = new Set(["aadhaar", "pan", "bankAccount", "ifscCode"]);
const SELF_UPDATABLE_FIELDS = new Set([
  "phone", "avatarUrl", "biography", "skills", "languages",
  "emergencyContactName", "emergencyContactPhone", "dateOfBirth"
]);

export const PUT = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const isSelf = session.staffId === id;
  await resolveScopedInstitutionId(session.institutionId, session, { allowGlobal: true });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // ── Self-Mutation Lock (Invariant B & Rule 2) ──────────────────────────────
  if (isSelf) {
    if (
      body.role !== undefined ||
      body.institutionId !== undefined ||
      body.institutionIds !== undefined ||
      body.departmentId !== undefined ||
      body.departmentIds !== undefined ||
      body.isActive !== undefined
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot modify role, institution, department, or active status on your own account" },
        { status: 403 }
      );
    }
  }

  if (!isSelf) {
    const authorized = await canAccessStaff(session.staffId, session.role, id);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const parsed = staffUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const target = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      tokenVersion: staff.tokenVersion,
      emailVerifiedAt: staff.emailVerifiedAt,
    })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!target) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  // ── Subordinate Rank & Peer Protection (Invariant B) ───────────────────────
  if (!isSelf) {
    if (target.role === "system") {
      return NextResponse.json(
        { error: "Forbidden: System accounts cannot be modified through administrative APIs" },
        { status: 403 }
      );
    }

    const targetNewRole = parsed.data.role;
    if (!canMutateStaff(session.role, target.role, targetNewRole)) {
      return NextResponse.json(
        { error: "Forbidden: Cannot modify an account with equal or higher rank, and cannot promote to equal or higher rank" },
        { status: 403 }
      );
    }

    if (session.role === "super_admin") {
      const targetIsDev = isAuthorizedDeveloper(target);
      const callerIsDev = isAuthorizedDeveloper(session as any);
      if (targetIsDev && !callerIsDev) {
        return NextResponse.json(
          { error: "Forbidden: Super admin cannot mutate developer accounts" },
          { status: 403 }
        );
      }
    }
  }

  const { departmentIds, institutionIds, ...fields } = parsed.data;

  // ── Tenant Boundary Check on Institution Reassignment ──────────────────────
  if (!isSelf && institutionIds && session.role !== "super_admin") {
    if (isRegionalScopeRole(session.role)) {
      const cluster = await getStaffInstitutionMemberships(session.staffId);
      const clusterSet = new Set(cluster);
      if (institutionIds.some((instId: string) => !clusterSet.has(instId))) {
        return NextResponse.json(
          { error: "Cannot assign staff to institutions outside your assigned region" },
          { status: 403 }
        );
      }
    } else {
      const memberships = await getStaffInstitutionMemberships(session.staffId);
      const allowedSet = new Set(memberships);
      if (institutionIds.some((instId: string) => !allowedSet.has(instId))) {
        return NextResponse.json(
          { error: "Cannot assign staff to institutions outside your own" },
          { status: 403 }
        );
      }
    }
  }

  // ── Step-Up Verification Requirement for High-Risk Mutations ───────────────
  const targetRank = getRoleRank(target.role);
  const requiresStepUp =
    !isSelf &&
    ((parsed.data.role !== undefined && parsed.data.role !== target.role) ||
      institutionIds !== undefined ||
      (parsed.data.isActive === false && targetRank !== null && targetRank >= 60));

  let stepUpResult: { success: true; payload: any; exp: number } | null = null;
  if (requiresStepUp) {
    const stepUpToken = (body as any)?.stepUpToken || parsed.data.stepUpToken || request.headers.get("x-step-up-token");
    if (!stepUpToken) {
      return NextResponse.json(
        { error: "Step-up authentication required for role, institution, or administrative account mutations" },
        { status: 403 }
      );
    }
    const verification = await verifyActionStepUpToken(stepUpToken, {
      staffId: session.staffId,
      sid: session.sid,
      action: ["staff:role:change", "staff:mutate"],
    });
    if (!verification.success) {
      return NextResponse.json(
        { error: `Step-up authentication failed: ${verification.error}` },
        { status: 403 }
      );
    }
    stepUpResult = verification;
  }

  const safeFields: Record<string, unknown> = {};
  const allowedFieldKeys = isSelf ? SELF_UPDATABLE_FIELDS : new Set(UPDATABLE_FIELDS);
  for (const key of UPDATABLE_FIELDS) {
    if (key in fields && allowedFieldKeys.has(key)) {
      const val = (fields as Record<string, unknown>)[key];
      if (PII_FIELDS.has(key)) {
        safeFields[key] = typeof val === "string" ? encryptPiiField(val) : (val ?? null);
      } else {
        safeFields[key] = val;
      }
    }
  }

  let result;
  try {
    result = await db.transaction(async (tx) => {
      if (requiresStepUp && stepUpResult) {
        await consumeStepUpTokenInTx(tx, {
          jti: stepUpResult.payload.jti,
          staffId: session.staffId,
          action: stepUpResult.payload.action,
          exp: stepUpResult.exp,
        });
      }

      const updated = await tx
        .update(staff)
        .set({ ...safeFields, updatedAt: new Date().toISOString() })
        .where(eq(staff.id, id))
        .returning()
        .get();

      if (departmentIds) {
        await tx.delete(staffDepartments).where(eq(staffDepartments.staffId, id)).run();
        if (departmentIds.length) {
          await tx.insert(staffDepartments).values(
            departmentIds.map((deptId: string) => ({
              id: crypto.randomUUID(),
              staffId: id,
              departmentId: deptId,
            }))
          ).run();
        }
      }

      if (institutionIds) {
        await tx.delete(staffInstitutions).where(eq(staffInstitutions.staffId, id)).run();
        if (institutionIds.length) {
          await tx.insert(staffInstitutions).values(
            institutionIds.map((instId: string) => ({
              id: crypto.randomUUID(),
              staffId: id,
              institutionId: instId,
            }))
          ).run();
        }
      }

      const roleOrTenantChanged =
        !isSelf &&
        ((parsed.data.role !== undefined && parsed.data.role !== target.role) ||
          institutionIds !== undefined ||
          parsed.data.isActive === false);

      if (roleOrTenantChanged) {
        await tx
          .update(staff)
          .set({ tokenVersion: sql`${staff.tokenVersion} + 1` })
          .where(eq(staff.id, id))
          .run();

        await tx
          .update(userSessions)
          .set({ status: "terminated", logoutAt: Date.now() })
          .where(and(eq(userSessions.staffId, id), eq(userSessions.status, "active")))
          .run();
      }

      if (requiresStepUp || roleOrTenantChanged) {
        await cryptoAuditWriter.log(
          {
            tenantId: session.institutionId || "default",
            userId: session.staffId,
            action: "STAFF_MUTATE",
            entityType: "staff",
            entityId: id,
            payload: {
              targetOldRole: target.role,
              targetNewRole: parsed.data.role || target.role,
              institutionIds,
              isActive: parsed.data.isActive,
            },
          },
          tx
        );
      }

      return updated;
    });
  } catch (txErr: any) {
    if (isStepUpReplayError(txErr)) {
      return NextResponse.json(
        { error: "Forbidden: Step-up token has already been used (replay detected)" },
        { status: 403 }
      );
    }
    throw txErr;
  }

  const safeStaff = {
    ...pick(result, [
      "id", "email", "firstName", "lastName", "role", "employeeId",
      "phone", "designation", "avatarUrl", "isActive", "dateOfJoining",
      "dateOfBirth", "qualifications", "certificates", "experienceYears",
      "skills", "languages", "emergencyContactName", "emergencyContactPhone",
      "contractEndDate", "teachingSubjects", "biography", "nfcTagId",
    ]),
    aadhaar: decryptPiiField(result.aadhaar),
    pan: decryptPiiField(result.pan),
    bankAccount: decryptPiiField(result.bankAccount),
    ifscCode: decryptPiiField(result.ifscCode),
  };

  return NextResponse.json({ staff: safeStaff });
}, "staff:update");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const isSelf = session.staffId === id;
  await resolveScopedInstitutionId(session.institutionId, session, { allowGlobal: true });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // ── Self-Mutation Lock (Invariant B & Rule 2) ──────────────────────────────
  if (isSelf) {
    if (
      body.role !== undefined ||
      body.institutionId !== undefined ||
      body.institutionIds !== undefined ||
      body.departmentId !== undefined ||
      body.departmentIds !== undefined ||
      body.isActive !== undefined
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot modify role, institution, department, or active status on your own account" },
        { status: 403 }
      );
    }
  }

  if (isSelf) {
    if (!hasPermission(session.role as StaffRole, "profile:write")) {
      return NextResponse.json({ error: "Forbidden: profile:write required" }, { status: 403 });
    }
  } else {
    if (!hasPermission(session.role as StaffRole, "staff:update")) {
      return NextResponse.json({ error: "Forbidden: staff:update required" }, { status: 403 });
    }
    const authorized = await canAccessStaff(session.staffId, session.role, id);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const parsed = staffUpdateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const target = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      tokenVersion: staff.tokenVersion,
      emailVerifiedAt: staff.emailVerifiedAt,
    })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!target) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  // ── Subordinate Rank & Peer Protection (Invariant B) ───────────────────────
  if (!isSelf) {
    if (target.role === "system") {
      return NextResponse.json(
        { error: "Forbidden: System accounts cannot be modified through administrative APIs" },
        { status: 403 }
      );
    }

    const targetNewRole = parsed.data.role;
    if (!canMutateStaff(session.role, target.role, targetNewRole)) {
      return NextResponse.json(
        { error: "Forbidden: Cannot modify an account with equal or higher rank, and cannot promote to equal or higher rank" },
        { status: 403 }
      );
    }

    if (session.role === "super_admin") {
      const targetIsDev = isAuthorizedDeveloper(target);
      const callerIsDev = isAuthorizedDeveloper(session as any);
      if (targetIsDev && !callerIsDev) {
        return NextResponse.json(
          { error: "Forbidden: Super admin cannot mutate developer accounts" },
          { status: 403 }
        );
      }
    }
  }

  const { departmentIds, institutionIds, ...fields } = parsed.data;

  // ── Tenant Boundary Check on Institution Reassignment ──────────────────────
  if (!isSelf && institutionIds && session.role !== "super_admin") {
    if (isRegionalScopeRole(session.role)) {
      const cluster = await getStaffInstitutionMemberships(session.staffId);
      const clusterSet = new Set(cluster);
      if (institutionIds.some((instId: string) => !clusterSet.has(instId))) {
        return NextResponse.json(
          { error: "Cannot assign staff to institutions outside your assigned region" },
          { status: 403 }
        );
      }
    } else {
      const memberships = await getStaffInstitutionMemberships(session.staffId);
      const allowedSet = new Set(memberships);
      if (institutionIds.some((instId: string) => !allowedSet.has(instId))) {
        return NextResponse.json(
          { error: "Cannot assign staff to institutions outside your own" },
          { status: 403 }
        );
      }
    }
  }

  // ── Step-Up Verification Requirement for High-Risk Mutations ───────────────
  const targetRank = getRoleRank(target.role);
  const requiresStepUp =
    !isSelf &&
    ((parsed.data.role !== undefined && parsed.data.role !== target.role) ||
      institutionIds !== undefined ||
      (parsed.data.isActive === false && targetRank !== null && targetRank >= 60));

  let stepUpResult: { success: true; payload: any; exp: number } | null = null;
  if (requiresStepUp) {
    const stepUpToken = (body as any)?.stepUpToken || parsed.data.stepUpToken || request.headers.get("x-step-up-token");
    if (!stepUpToken) {
      return NextResponse.json(
        { error: "Step-up authentication required for role, institution, or administrative account mutations" },
        { status: 403 }
      );
    }
    const verification = await verifyActionStepUpToken(stepUpToken, {
      staffId: session.staffId,
      sid: session.sid,
      action: ["staff:role:change", "staff:mutate"],
    });
    if (!verification.success) {
      return NextResponse.json(
        { error: `Step-up authentication failed: ${verification.error}` },
        { status: 403 }
      );
    }
    stepUpResult = verification;
  }

  const safeFields: Record<string, unknown> = {};
  const allowedFieldKeys = isSelf ? SELF_UPDATABLE_FIELDS : new Set(UPDATABLE_FIELDS);
  for (const key of UPDATABLE_FIELDS) {
    if (key in fields && allowedFieldKeys.has(key)) {
      const val = (fields as Record<string, unknown>)[key];
      if (PII_FIELDS.has(key)) {
        safeFields[key] = typeof val === "string" ? encryptPiiField(val) : (val ?? null);
      } else {
        safeFields[key] = val;
      }
    }
  }

  let result;
  try {
    result = await db.transaction(async (tx) => {
      if (requiresStepUp && stepUpResult) {
        await consumeStepUpTokenInTx(tx, {
          jti: stepUpResult.payload.jti,
          staffId: session.staffId,
          action: stepUpResult.payload.action,
          exp: stepUpResult.exp,
        });
      }

      const updated = await tx
        .update(staff)
        .set({ ...safeFields, updatedAt: new Date().toISOString() })
        .where(eq(staff.id, id))
        .returning()
        .get();

      if (departmentIds) {
        await tx.delete(staffDepartments).where(eq(staffDepartments.staffId, id)).run();
        if (departmentIds.length) {
          await tx.insert(staffDepartments).values(
            departmentIds.map((deptId: string) => ({
              id: crypto.randomUUID(),
              staffId: id,
              departmentId: deptId,
            }))
          ).run();
        }
      }

      if (institutionIds) {
        await tx.delete(staffInstitutions).where(eq(staffInstitutions.staffId, id)).run();
        if (institutionIds.length) {
          await tx.insert(staffInstitutions).values(
            institutionIds.map((instId: string) => ({
              id: crypto.randomUUID(),
              staffId: id,
              institutionId: instId,
            }))
          ).run();
        }
      }

      const roleOrTenantChanged =
        !isSelf &&
        ((parsed.data.role !== undefined && parsed.data.role !== target.role) ||
          institutionIds !== undefined ||
          parsed.data.isActive === false);

      if (roleOrTenantChanged) {
        await tx
          .update(staff)
          .set({ tokenVersion: sql`${staff.tokenVersion} + 1` })
          .where(eq(staff.id, id))
          .run();

        await tx
          .update(userSessions)
          .set({ status: "terminated", logoutAt: Date.now() })
          .where(and(eq(userSessions.staffId, id), eq(userSessions.status, "active")))
          .run();
      }

      if (requiresStepUp || roleOrTenantChanged) {
        await cryptoAuditWriter.log(
          {
            tenantId: session.institutionId || "default",
            userId: session.staffId,
            action: "STAFF_MUTATE",
            entityType: "staff",
            entityId: id,
            payload: {
              targetOldRole: target.role,
              targetNewRole: parsed.data.role || target.role,
              institutionIds,
              isActive: parsed.data.isActive,
            },
          },
          tx
        );
      }

      return updated;
    });
  } catch (txErr: any) {
    if (isStepUpReplayError(txErr)) {
      return NextResponse.json(
        { error: "Forbidden: Step-up token has already been used (replay detected)" },
        { status: 403 }
      );
    }
    throw txErr;
  }

  if (!result) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

  const safeStaff = {
    ...pick(result, [
      "id", "email", "firstName", "lastName", "role", "employeeId",
      "phone", "designation", "avatarUrl", "isActive", "dateOfJoining",
      "dateOfBirth", "qualifications", "certificates", "experienceYears",
      "skills", "languages", "emergencyContactName", "emergencyContactPhone",
      "contractEndDate", "teachingSubjects", "biography", "nfcTagId",
    ]),
    aadhaar: decryptPiiField(result.aadhaar),
    pan: decryptPiiField(result.pan),
    bankAccount: decryptPiiField(result.bankAccount),
    ifscCode: decryptPiiField(result.ifscCode),
  };

  return NextResponse.json({ staff: safeStaff });
}, "staff:update");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  // 1. Self-deletion check
  if (session.staffId === id) {
    return NextResponse.json({ error: "Cannot revoke your own account" }, { status: 400 });
  }

  // 2. Fetch target
  const target = await db
    .select({ id: staff.id, role: staff.role, isActive: staff.isActive })
    .from(staff)
    .where(eq(staff.id, id))
    .get();

  if (!target) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (target.role === "system") {
    return NextResponse.json(
      { error: "Forbidden: System accounts cannot be deactivated" },
      { status: 403 }
    );
  }

  // 3. Hierarchy guard (subordinate rank check)
  if (!canMutateStaff(session.role, target.role)) {
    return NextResponse.json(
      { error: "Forbidden: Cannot deactivate an account with equal or higher rank" },
      { status: 403 }
    );
  }

  const authorized = await canAccessStaff(session.staffId, session.role, id);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Zero-lockout guard: Atomic prevention against deactivating the last active super_admin
  if (target.role === "super_admin") {
    const activeSuperAdmins = await db
      .select({ count: sql<number>`count(*)` })
      .from(staff)
      .where(and(eq(staff.role, "super_admin"), eq(staff.isActive, true)))
      .get();
    if ((activeSuperAdmins?.count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot deactivate the last active super_admin account" },
        { status: 400 }
      );
    }
  }

  // 5. Check if step-up authentication is required (rank >= 60)
  const targetRank = getRoleRank(target.role);
  const isAdministrative = targetRank !== null && targetRank >= 60;
  let stepUpResult: { success: true; payload: any; exp: number } | null = null;

  let body: { reason?: string; stepUpToken?: string } = {};
  try {
    body = (await request.json()) as any;
  } catch {
    body = {};
  }
  const { reason } = body;

  if (isAdministrative) {
    const stepUpToken = body.stepUpToken || request.headers.get("x-step-up-token");
    if (!stepUpToken) {
      return NextResponse.json(
        { error: "Step-up authentication required for deactivating administrative staff" },
        { status: 403 }
      );
    }

    const verification = await verifyActionStepUpToken(stepUpToken, {
      staffId: session.staffId,
      sid: session.sid,
      action: ["staff:mutate", "staff:role:change"],
    });
    if (!verification.success) {
      return NextResponse.json(
        { error: `Step-up authentication failed: ${verification.error}` },
        { status: 403 }
      );
    }
    stepUpResult = verification;
  }

  // 6. Transactional deactivation & audit
  try {
    await db.transaction(async (tx) => {
      if (isAdministrative && stepUpResult) {
        await consumeStepUpTokenInTx(tx, {
          jti: stepUpResult.payload.jti,
          staffId: session.staffId,
          action: stepUpResult.payload.action,
          exp: stepUpResult.exp,
        });
      }

      await tx
        .update(staff)
        .set({ isActive: false, nfcTagId: null, avatarUrl: null, updatedAt: new Date().toISOString() })
        .where(eq(staff.id, id))
        .run();

      await tx
        .update(staff)
        .set({ tokenVersion: sql`${staff.tokenVersion} + 1` })
        .where(eq(staff.id, id))
        .run();

      await tx
        .update(userSessions)
        .set({ status: "terminated", logoutAt: Date.now() })
        .where(and(eq(userSessions.staffId, id), eq(userSessions.status, "active")))
        .run();

      await tx
        .update(userAppAssignments)
        .set({
          status: "revoked",
          revokedAt: new Date().toISOString(),
          revokedById: session.staffId,
          revokedReason: reason || "Account revoked by admin",
        })
        .where(eq(userAppAssignments.staffId, id))
        .run();

      await tx.insert(auditLog).values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        action: "account_revoked",
        entityType: "staff",
        entityId: id,
        details: { reason: reason || "Account revoked by admin", revokedBy: session.staffId },
      }).run();

      if (isAdministrative && stepUpResult) {
        await cryptoAuditWriter.log(
          {
            tenantId: session.institutionId || "default",
            userId: session.staffId,
            action: "STAFF_DEACTIVATE_ADMIN",
            entityType: "staff",
            entityId: id,
            payload: {
              targetRole: target.role,
              reason: reason || "Account revoked by admin",
            },
          },
          tx
        );
      }

      await autoAssignOffboardingChecklists(id, session.staffId, tx);
    });
  } catch (txErr: any) {
    if (isStepUpReplayError(txErr)) {
      return NextResponse.json(
        { error: "Forbidden: Step-up token has already been used (replay detected)" },
        { status: 403 }
      );
    }
    throw txErr;
  }

  return NextResponse.json({ success: true, message: "Account revoked" });
}, "staff:delete");
