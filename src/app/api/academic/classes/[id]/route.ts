import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, staff, academicYears } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const query = db
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
    .leftJoin(academicYears, eq(classes.academicYearId, academicYears.id));

  const row = institutionId && institutionId !== "global"
    ? await query.where(and(eq(classes.id, id), eq(classes.institutionId, institutionId))).get()
    : await query.where(eq(classes.id, id)).get();

  if (!row) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  return NextResponse.json({ class: row });
}, "classes:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const body = await request.json();

  const existing = institutionId && institutionId !== "global"
    ? await db.select().from(classes).where(and(eq(classes.id, id), eq(classes.institutionId, institutionId))).get()
    : await db.select().from(classes).where(eq(classes.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const updatableFields = ["name", "section", "departmentId", "academicYearId", "teacherId"];
  const safeFields: Record<string, unknown> = {};
  for (const key of updatableFields) {
    if (key in body) safeFields[key] = body[key];
  }

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(classes.id, id), eq(classes.institutionId, institutionId))
    : eq(classes.id, id);

  const result = await db
    .update(classes)
    .set({ ...safeFields, updatedAt: new Date().toISOString() })
    .where(whereClause)
    .returning()
    .get();

  return NextResponse.json({ class: result });
}, "classes:update");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const existing = institutionId && institutionId !== "global"
    ? await db.select().from(classes).where(and(eq(classes.id, id), eq(classes.institutionId, institutionId))).get()
    : await db.select().from(classes).where(eq(classes.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(classes.id, id), eq(classes.institutionId, institutionId))
    : eq(classes.id, id);

  await db
    .update(classes)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(whereClause)
    .run();

  return NextResponse.json({ success: true });
}, "classes:delete");

