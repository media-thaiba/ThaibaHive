import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { studentUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, ne, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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

  const parseResult = studentUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const validData = parseResult.data;

  const existing = institutionId && institutionId !== "global"
    ? await db.select().from(students).where(and(eq(students.id, id), eq(students.institutionId, institutionId))).get()
    : await db.select().from(students).where(eq(students.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Duplicate collision check if admissionNo is updated
  if (validData.admissionNo && validData.admissionNo.toLowerCase() !== existing.admissionNo.toLowerCase()) {
    const collision = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.institutionId, existing.institutionId),
          sql`lower(${students.admissionNo}) = lower(${validData.admissionNo})`,
          ne(students.id, id)
        )
      )
      .get();

    if (collision) {
      return NextResponse.json(
        { error: "Student with this admission number already exists in this institution" },
        { status: 409 }
      );
    }
  }

  const safeFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validData)) {
    if (value !== undefined) {
      safeFields[key] = value;
    }
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
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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

