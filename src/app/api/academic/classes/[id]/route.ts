import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, staff, academicYears } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { classUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, ne, isNull } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = classUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const validData = parseResult.data;

  const existing = institutionId && institutionId !== "global"
    ? await db.select().from(classes).where(and(eq(classes.id, id), eq(classes.institutionId, institutionId))).get()
    : await db.select().from(classes).where(eq(classes.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  // Duplicate collision check if name, section, or academicYearId changed
  const targetName = validData.name ?? existing.name;
  const targetSection = validData.section !== undefined ? validData.section : existing.section;
  const targetYear = validData.academicYearId !== undefined ? validData.academicYearId : existing.academicYearId;

  if (validData.name || validData.section !== undefined || validData.academicYearId !== undefined) {
    const collisionConditions = [
      existing.institutionId ? eq(classes.institutionId, existing.institutionId) : isNull(classes.institutionId),
      eq(classes.name, targetName),
      ne(classes.id, id),
    ];
    if (targetSection) {
      collisionConditions.push(eq(classes.section, targetSection));
    }
    if (targetYear) {
      collisionConditions.push(eq(classes.academicYearId, targetYear));
    }

    const collision = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(...collisionConditions))
      .get();

    if (collision) {
      return NextResponse.json(
        { error: "Class with this name and section already exists in this academic year" },
        { status: 409 }
      );
    }
  }

  const safeFields: Record<string, unknown> = {};
  if (validData.name !== undefined) safeFields.name = validData.name;
  if (validData.section !== undefined) safeFields.section = validData.section;
  if (validData.departmentId !== undefined) safeFields.departmentId = validData.departmentId;
  if (validData.academicYearId !== undefined) safeFields.academicYearId = validData.academicYearId;
  if (validData.teacherId !== undefined) safeFields.teacherId = validData.teacherId;

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
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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

