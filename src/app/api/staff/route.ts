import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { hashPassword } from "@/lib/auth";
export const GET = requireAuth(async () => {
  const all = await db.select().from(staff).orderBy(staff.firstName).all();
  return NextResponse.json({ staff: all });
}, "staff:read");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { email, employeeId, firstName, lastName, phone, designation, role, password, departmentIds, institutionIds } = body;

  if (!email || !employeeId || !firstName || !lastName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const passwordHash = password ? await hashPassword(password) : null;

  const newStaff = await db
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
    await db.insert(staffDepartments).values(
      departmentIds.map((deptId: string) => ({
        id: crypto.randomUUID(),
        staffId: newStaff.id,
        departmentId: deptId,
      }))
    ).run();
  }

  if (institutionIds?.length) {
    await db.insert(staffInstitutions).values(
      institutionIds.map((instId: string) => ({
        id: crypto.randomUUID(),
        staffId: newStaff.id,
        institutionId: instId,
      }))
    ).run();
  }

  return NextResponse.json({ staff: newStaff }, { status: 201 });
}, "staff:create");
