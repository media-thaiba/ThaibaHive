import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { hashPassword } from "@/lib/auth";
import { staffCreateSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";

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
  if (session.role === "principal") {
    const instRow = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .limit(1);
    const instId = instRow[0]?.institutionId;
    if (instId) {
      const instStaff = await db
        .select({ sid: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, instId))
        .all();
      const instStaffIds = instStaff.map((s) => s.sid);
      const filtered = await db
        .select(SAFE_STAFF_FIELDS)
        .from(staff)
        .orderBy(staff.firstName)
        .all();
      return NextResponse.json({
        staff: filtered.filter((s) => instStaffIds.includes(s.id)),
      });
    }
  }
  const all = await db.select(SAFE_STAFF_FIELDS).from(staff).orderBy(staff.firstName).all();
  return NextResponse.json({ staff: all });
}, "staff:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = staffCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, employeeId, firstName, lastName, phone, designation, role, password, departmentIds, institutionIds } = parsed.data;

  const passwordHash = password ? await hashPassword(password) : null;

  const result = await db
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

  const safeStaff = pick(result, Object.keys(SAFE_STAFF_FIELDS) as (keyof typeof SAFE_STAFF_FIELDS)[]);

  if (departmentIds?.length) {
    await db.insert(staffDepartments).values(
      departmentIds.map((deptId: string) => ({
        id: crypto.randomUUID(),
        staffId: safeStaff.id,
        departmentId: deptId,
      }))
    ).run();
  }

  if (institutionIds?.length) {
    await db.insert(staffInstitutions).values(
      institutionIds.map((instId: string) => ({
        id: crypto.randomUUID(),
        staffId: safeStaff.id,
        institutionId: instId,
      }))
    ).run();
  }

  return NextResponse.json({ staff: safeStaff }, { status: 201 });
}, "staff:create");
