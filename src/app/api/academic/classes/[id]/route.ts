import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, staff, academicYears } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const row = await db
    .select({
      id: classes.id,
      name: classes.name,
      section: classes.section,
      institutionId: classes.institutionId,
      departmentId: classes.departmentId,
      academicYearId: classes.academicYearId,
      teacherId: classes.teacherId,
      isActive: classes.isActive,
      teacherName: staff.firstName,
      academicYearName: academicYears.name,
    })
    .from(classes)
    .leftJoin(staff, eq(classes.teacherId, staff.id))
    .leftJoin(academicYears, eq(classes.academicYearId, academicYears.id))
    .where(eq(classes.id, id))
    .get();

  if (!row) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  return NextResponse.json({ class: row });
}, "classes:read");

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const existing = await db.select().from(classes).where(eq(classes.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const updatableFields = ["name", "section", "institutionId", "departmentId", "academicYearId", "teacherId"];
  const safeFields: Record<string, unknown> = {};
  for (const key of updatableFields) {
    if (key in body) safeFields[key] = body[key];
  }

  const result = await db
    .update(classes)
    .set({ ...safeFields, updatedAt: new Date().toISOString() })
    .where(eq(classes.id, id))
    .returning()
    .get();

  return NextResponse.json({ class: result });
}, "classes:update");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const existing = await db.select().from(classes).where(eq(classes.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  await db
    .update(classes)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(classes.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "classes:delete");
