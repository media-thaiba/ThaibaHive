import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions, departments } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { pick } from "@/lib/api/pick";
import { hashPassword } from "@/lib/auth";
import { canCreateRole, getRoleRank, verifyActionStepUpToken, consumeStepUpTokenInTx, isStepUpReplayError, getStaffInstitutionMemberships, isRegionalScopeRole } from "@thaiba/auth";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { staffCreateSchema } from "@/lib/validation/schemas";
import { getAccessibleStaffIds } from "@/lib/auth/department-scope";
import { autoAssignOnboardingChecklists } from "@/lib/onboarding/auto-assign";
import { encryptPiiField } from "@/lib/crypto/tenant-encryption";
import { eq, or, inArray, sql } from "drizzle-orm";

const SAFE_STAFF_FIELDS = {
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
  dateOfJoining: staff.dateOfJoining,
} as const;

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  await resolveRequestInstitution(session, searchParams.get("institutionId"));
  
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  const offset = (page - 1) * limit;

  const accessibleIds = await getAccessibleStaffIds(session.staffId, session.role);

  if (accessibleIds === null) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(staff)
      .get();
    const total = countResult?.count ?? 0;

    const all = await db
      .select(SAFE_STAFF_FIELDS)
      .from(staff)
      .orderBy(staff.firstName)
      .limit(limit)
      .offset(offset)
      .all();
    return NextResponse.json({ staff: all, total, page, limit });
  }

  if (accessibleIds.length === 0) {
    return NextResponse.json({ staff: [], total: 0, page, limit });
  }

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(staff)
    .where(inArray(staff.id, accessibleIds))
    .get();
  const total = countResult?.count ?? 0;

  const filtered = await db
    .select(SAFE_STAFF_FIELDS)
    .from(staff)
    .where(inArray(staff.id, accessibleIds))
    .orderBy(staff.firstName)
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ staff: filtered, total, page, limit });
}, "staff:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = staffCreateSchema.safeParse(body);
  if (parsed.success && (parsed.data as any).institutionId) {
    await resolveRequestInstitution(session, (parsed.data as any).institutionId);
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, employeeId, firstName, lastName, phone, designation, role, password, departmentIds, institutionIds } = parsed.data;
  const targetRole = role || "staff";

  // Pre-insert Collision Check on email and employeeId (409 Conflict)
  const existingStaff = await db
    .select({ id: staff.id, email: staff.email, employeeId: staff.employeeId })
    .from(staff)
    .where(
      or(
        sql`lower(${staff.email}) = lower(${email})`,
        eq(staff.employeeId, employeeId)
      )
    )
    .limit(1)
    .get();

  if (existingStaff) {
    return NextResponse.json(
      { error: "Staff with this email or employee ID already exists" },
      { status: 409 }
    );
  }

  // ── Role-Creation Hierarchy & Privilege Escalation Guard (Rule 22) ──────────
  if (!canCreateRole(session.role, targetRole)) {
    return NextResponse.json(
      { error: "Forbidden: Cannot create an account with equal or higher rank, and system role cannot be assigned" },
      { status: 403 }
    );
  }

  // ── Mandatory Institutional Tenancy Enforcement (Invariant A & B) ─────────
  if (session.role !== "super_admin") {
    if (!institutionIds || institutionIds.length === 0) {
      return NextResponse.json(
        { error: "Staff creation requires at least one institution assignment" },
        { status: 400 }
      );
    }

    if (isRegionalScopeRole(session.role)) {
      const cluster = await getStaffInstitutionMemberships(session.staffId);
      if (cluster.length === 0) {
        return NextResponse.json(
          { error: "Forbidden: Caller has no assigned regional cluster" },
          { status: 403 }
        );
      }
      const clusterSet = new Set(cluster);
      if (institutionIds.some((id) => !clusterSet.has(id))) {
        return NextResponse.json(
          { error: "Cannot assign staff to institutions outside your assigned region" },
          { status: 403 }
        );
      }
    } else {
      // Tier 3, 4, 5 (principal, admin, hod, etc.)
      const memberships = await getStaffInstitutionMemberships(session.staffId);
      if (memberships.length === 0) {
        return NextResponse.json(
          { error: "Forbidden: Caller has no assigned institution to scope staff creation" },
          { status: 403 }
        );
      }
      const allowedInstSet = new Set(memberships);
      if (institutionIds.some((id) => !allowedInstSet.has(id))) {
        return NextResponse.json(
          { error: "Cannot assign staff to institutions outside your own" },
          { status: 403 }
        );
      }

      if (departmentIds?.length) {
        const validDepts = await db
          .select({ id: departments.id, institutionId: departments.institutionId })
          .from(departments)
          .where(inArray(departments.id, departmentIds))
          .all();
        if (validDepts.length !== departmentIds.length || validDepts.some((d) => !d.institutionId || !allowedInstSet.has(d.institutionId))) {
          return NextResponse.json(
            { error: "Cannot assign staff to departments outside your institution" },
            { status: 403 }
          );
        }

        if (session.role === "hod" || session.role === "coordinator") {
          const callerDepts = await db
            .select({ departmentId: staffDepartments.departmentId })
            .from(staffDepartments)
            .where(eq(staffDepartments.staffId, session.staffId))
            .all();
          const callerDeptSet = new Set(callerDepts.map((d) => d.departmentId));
          if (departmentIds.some((id) => !callerDeptSet.has(id))) {
            return NextResponse.json(
              { error: "Cannot assign staff to departments outside your own" },
              { status: 403 }
            );
          }
        }
      }
    }
  }

  // ── Step-Up Verification for Administrative Roles (Rank >= 60) ─────────────
  const targetRank = getRoleRank(targetRole);
  const isAdministrativeRole = targetRank !== null && targetRank >= 60;
  let stepUpResult: { success: true; payload: any; exp: number } | null = null;

  if (isAdministrativeRole) {
    const stepUpToken = (body as any)?.stepUpToken || parsed.data.stepUpToken || request.headers.get("x-step-up-token");
    if (!stepUpToken) {
      return NextResponse.json(
        { error: "Step-up authentication required for creating administrative roles" },
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

  const passwordHash = password ? await hashPassword(password) : null;

  let result;
  try {
    result = await db.transaction(async (tx) => {
      if (isAdministrativeRole && stepUpResult) {
        await consumeStepUpTokenInTx(tx, {
          jti: stepUpResult.payload.jti,
          staffId: session.staffId,
          action: stepUpResult.payload.action,
          exp: stepUpResult.exp,
        });
      }

      const staffResult = await tx
        .insert(staff)
        .values({
          id: randomUUID(),
          email,
          employeeId,
          firstName,
          lastName,
          phone,
          designation,
          role: targetRole,
          passwordHash,
          emailVerifiedAt: new Date().toISOString(),
          isFirstLogin: false,
          onboardingCompletedAt: new Date().toISOString(),
          aadhaar: encryptPiiField(parsed.data.aadhaar),
          pan: encryptPiiField(parsed.data.pan),
          bankAccount: encryptPiiField(parsed.data.bankAccount),
          ifscCode: encryptPiiField(parsed.data.ifscCode),
        })
        .returning()
        .get();

      if (departmentIds?.length) {
        await tx.insert(staffDepartments).values(
          departmentIds.map((deptId: string) => ({
            id: randomUUID(),
            staffId: staffResult.id,
            departmentId: deptId,
          }))
        ).run();
      }

      if (institutionIds?.length) {
        await tx.insert(staffInstitutions).values(
          institutionIds.map((instId: string) => ({
            id: randomUUID(),
            staffId: staffResult.id,
            institutionId: instId,
          }))
        ).run();
      }

      if (isAdministrativeRole && stepUpResult) {
        await cryptoAuditWriter.log(
          {
            tenantId: institutionIds?.[0] || session.institutionId || "default",
            userId: session.staffId,
            action: "STAFF_CREATE_ADMIN",
            entityType: "staff",
            entityId: staffResult.id,
            payload: {
              targetRole,
              email,
              employeeId,
              institutionIds,
            },
          },
          tx
        );
      }

      await autoAssignOnboardingChecklists(staffResult.id, session.staffId, tx);

      return staffResult;
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

  const safeStaff = pick(result, Object.keys(SAFE_STAFF_FIELDS) as (keyof typeof SAFE_STAFF_FIELDS)[]);

  return NextResponse.json({ staff: safeStaff }, { status: 201 });
}, "staff:create");

