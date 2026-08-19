import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const row = await db
    .select({
      id: students.id,
      admissionNo: students.admissionNo,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      email: students.email,
      phone: students.phone,
      address: students.address,
      avatarUrl: students.avatarUrl,
      bloodGroup: students.bloodGroup,
      classId: students.classId,
      academicYearId: students.academicYearId,
      institutionId: students.institutionId,
      emergencyContactName: students.emergencyContactName,
      emergencyContactPhone: students.emergencyContactPhone,
      isActive: students.isActive,
      className: classes.name,
      classSection: classes.section,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(eq(students.id, id))
    .get();

  if (!row) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({ student: row });
}, "students:read");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const existing = await db.select().from(students).where(eq(students.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const updatableFields = [
    "firstName", "lastName", "dateOfBirth", "gender", "email", "phone",
    "address", "avatarUrl", "bloodGroup", "classId", "academicYearId",
    "institutionId", "emergencyContactName", "emergencyContactPhone",
  ];

  const safeFields: Record<string, unknown> = {};
  for (const key of updatableFields) {
    if (key in body) safeFields[key] = body[key];
  }

  const result = await db
    .update(students)
    .set({ ...safeFields, updatedAt: new Date().toISOString() })
    .where(eq(students.id, id))
    .returning()
    .get();

  return NextResponse.json({ student: result });
}, "students:update");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const existing = await db.select().from(students).where(eq(students.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await db
    .update(students)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(students.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "students:delete");
