import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, academicYears, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { classCreateSchema } from "@/lib/validation/schemas";
import { eq, like, and, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const requestedInst = url.searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, requestedInst);
  const departmentId = url.searchParams.get("departmentId");

  const conditions = [eq(classes.isActive, true)];
  if (search) {
    conditions.push(like(classes.name, `%${search}%`));
  }
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(classes.institutionId, institutionId));
  }
  if (departmentId) {
    conditions.push(eq(classes.departmentId, departmentId));
  }

  const rows = await db
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
    .where(and(...conditions))
    .all();

  return NextResponse.json({ classes: rows });
}, "classes:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedResult = classCreateSchema.safeParse(body);
  if (!parsedResult.success) {
    return NextResponse.json({ error: parsedResult.error.issues[0].message }, { status: 400 });
  }

  const { name, section, institutionId: reqInst, departmentId, academicYearId, teacherId } = parsedResult.data;
  const institutionId = await resolveRequestInstitution(session, reqInst);
  if (institutionId === "global") return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });

  // Duplicate class check
  const duplicateConditions = [
    eq(classes.institutionId, institutionId),
    sql`lower(${classes.name}) = lower(${name})`,
    eq(classes.isActive, true),
  ];
  if (section) {
    duplicateConditions.push(sql`lower(${classes.section}) = lower(${section})`);
  }
  if (academicYearId) {
    duplicateConditions.push(eq(classes.academicYearId, academicYearId));
  }

  const existingClass = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(and(...duplicateConditions))
    .limit(1)
    .get();

  if (existingClass && existingClass.name && existingClass.name.toLowerCase() === name.toLowerCase()) {
    return NextResponse.json(
      { error: "Class with this name and section already exists in the academic year" },
      { status: 409 }
    );
  }

  const result = await db
    .insert(classes)
    .values({
      id: crypto.randomUUID(),
      name,
      section: section || null,
      institutionId,
      departmentId: departmentId || null,
      academicYearId: academicYearId || null,
      teacherId: teacherId || null,
    })
    .returning()
    .get();

  return NextResponse.json({ class: result }, { status: 201 });
}, "classes:create");
