import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const query = db
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
    .leftJoin(classes, eq(students.classId, classes.id));

  const row = institutionId && institutionId !== "global"
    ? await query.where(and(eq(students.id, id), eq(students.institutionId, institutionId))).get()
    : await query.where(eq(students.id, id)).get();

  if (!row) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({ student: row });
}, "students:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const body = await request.json();

  const existing = institutionId && institutionId !== "global"
    ? await db.select().from(students).where(and(eq(students.id, id), eq(students.institutionId, institutionId))).get()
    : await db.select().from(students).where(eq(students.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const updatableFields = [
    "firstName", "lastName", "dateOfBirth", "gender", "email", "phone",
    "address", "avatarUrl", "bloodGroup", "classId", "academicYearId",
    "emergencyContactName", "emergencyContactPhone",
  ];

  const safeFields: Record<string, unknown> = {};
  for (const key of updatableFields) {
    if (key in body) safeFields[key] = body[key];
  }

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, institutionId))
    : eq(students.id, id);

  const result = await db
    .update(students)
    .set({ ...safeFields, updatedAt: new Date().toISOString() })
    .where(whereClause)
    .returning()
    .get();

  return NextResponse.json({ student: result });
}, "students:update");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const existing = institutionId && institutionId !== "global"
    ? await db.select().from(students).where(and(eq(students.id, id), eq(students.institutionId, institutionId))).get()
    : await db.select().from(students).where(eq(students.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, institutionId))
    : eq(students.id, id);

  await db
    .update(students)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(whereClause)
    .run();

  return NextResponse.json({ success: true });
}, "students:delete");

