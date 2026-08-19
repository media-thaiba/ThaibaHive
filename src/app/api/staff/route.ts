import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions, departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { hashPassword } from "@/lib/auth";
import { staffCreateSchema, paginationSchema } from "@/lib/validation/schemas";
import { getAccessibleStaffIds } from "@/lib/auth/department-scope";
import { autoAssignOnboardingChecklists } from "@/lib/onboarding/auto-assign";
import { eq, and, inArray, sql } from "drizzle-orm";

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
  const { searchParams } = new URL(request.url);
  const pagination = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const { page, limit } = pagination;
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
  const body = await request.json();
  const parsed = staffCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, employeeId, firstName, lastName, phone, designation, role, password, departmentIds, institutionIds } = parsed.data;

  if (session.role === "principal" && institutionIds?.length) {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .limit(1);
    const instId = callerInst[0]?.institutionId;
    if (instId && !institutionIds.includes(instId)) {
      return NextResponse.json({ error: "Cannot assign staff to institutions outside your own" }, { status: 403 });
    }
  }

  if (session.role === "principal" && departmentIds?.length) {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .limit(1);
    const instId = callerInst[0]?.institutionId;
    if (instId) {
      const validDepts = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.institutionId, instId), inArray(departments.id, departmentIds)))
        .all();
      if (validDepts.length !== departmentIds.length) {
        return NextResponse.json({ error: "Cannot assign staff to departments outside your institution" }, { status: 403 });
      }
    }
  }

  const passwordHash = password ? await hashPassword(password) : null;

  const result = await db.transaction(async (tx) => {
    const staffResult = await tx
      .insert(staff)
      .values({
        id: crypto.randomUUID(),
        email,
        employeeId,
        firstName,
        lastName,
        phone,
        designation,
        role: role || "staff",
        passwordHash,
      })
      .returning()
      .get();

    if (departmentIds?.length) {
      await tx.insert(staffDepartments).values(
        departmentIds.map((deptId: string) => ({
          id: crypto.randomUUID(),
          staffId: staffResult.id,
          departmentId: deptId,
        }))
      ).run();
    }

    if (institutionIds?.length) {
      await tx.insert(staffInstitutions).values(
        institutionIds.map((instId: string) => ({
          id: crypto.randomUUID(),
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
