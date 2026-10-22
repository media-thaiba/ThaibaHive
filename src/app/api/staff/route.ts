import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions, departments } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { pick } from "@/lib/api/pick";
import { hashPassword } from "@/lib/auth";
import { staffCreateSchema } from "@/lib/validation/schemas";
import { getAccessibleStaffIds } from "@/lib/auth/department-scope";
import { autoAssignOnboardingChecklists } from "@/lib/onboarding/auto-assign";
import { encryptPiiField } from "@/lib/crypto/tenant-encryption";
import { eq, and, or, inArray, sql } from "drizzle-orm";

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

  // ── Role-Creation Hierarchy & Privilege Escalation Guard (TH-001) ──────────
  if (targetRole === "super_admin" && session.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Only super_admin can create super_admin accounts" },
      { status: 403 }
    );
  }

  if (targetRole === "admin" && session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only administrators can create admin accounts" },
      { status: 403 }
    );
  }

  const PRINCIPAL_ALLOWED_ROLES = new Set([
    "hod",
    "staff",
    "accounts",
    "purchase",
    "teacher",
    "coordinator",
    "academic_coordinator",
    "exam_coordinator",
    "inspector",
  ]);

  if (session.role === "principal" || session.role === "institutional_head") {
    if (!PRINCIPAL_ALLOWED_ROLES.has(targetRole)) {
      return NextResponse.json(
        { error: `Forbidden: Principal cannot create '${targetRole}' accounts` },
        { status: 403 }
      );
    }
  }

  // ── Mandatory Institutional Tenancy Enforcement ────────────────────────────
  if (session.role !== "super_admin") {
    if (!institutionIds || institutionIds.length === 0) {
      return NextResponse.json(
        { error: "Staff creation requires at least one institution assignment" },
        { status: 400 }
      );
    }
  }

  if (session.role === "principal" || session.role === "institutional_head") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .limit(1);
    const instId = callerInst[0]?.institutionId;

    if (!instId) {
      return NextResponse.json(
        { error: "Forbidden: Caller has no assigned institution to scope staff creation" },
        { status: 403 }
      );
    }

    if (institutionIds?.some((id) => id !== instId)) {
      return NextResponse.json(
        { error: "Cannot assign staff to institutions outside your own" },
        { status: 403 }
      );
    }

    if (departmentIds?.length) {
      const validDepts = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.institutionId, instId), inArray(departments.id, departmentIds)))
        .all();
      if (validDepts.length !== departmentIds.length) {
        return NextResponse.json(
          { error: "Cannot assign staff to departments outside your institution" },
          { status: 403 }
        );
      }
    }
  }

  const passwordHash = password ? await hashPassword(password) : null;

  const result = await db.transaction(async (tx) => {
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

    return staffResult;
  });

  const safeStaff = pick(result, Object.keys(SAFE_STAFF_FIELDS) as (keyof typeof SAFE_STAFF_FIELDS)[]);

  autoAssignOnboardingChecklists(safeStaff.id, session.staffId);

  return NextResponse.json({ staff: safeStaff }, { status: 201 });
}, "staff:create");
