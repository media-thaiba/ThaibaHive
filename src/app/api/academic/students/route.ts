import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { studentCreateSchema } from "@/lib/validation/schemas";
import { eq, like, or, and, sql, type SQL } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const requestedInst = url.searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);
  const classId = url.searchParams.get("classId");
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

  const conditions: (SQL | undefined)[] = [eq(students.isActive, true)];
  if (scopedInstId !== "global") {
    conditions.push(eq(students.institutionId, scopedInstId));
  }
  if (search) {
    conditions.push(
      or(
        like(students.firstName, `%${search}%`),
        like(students.lastName, `%${search}%`),
        like(students.admissionNo, `%${search}%`)
      )
    );
  }
  if (classId) {
    conditions.push(eq(students.classId, classId));
  }

  const where = and(...conditions);

  const total = await db.select({ count: sql<number>`count(*)` }).from(students).where(where).get();
  const totalCount = total?.count ?? 0;

  const rows = await db
    .select({
      id: students.id,
      admissionNo: students.admissionNo,
      firstName: students.firstName,
      lastName: students.lastName,
      email: students.email,
      phone: students.phone,
      gender: students.gender,
      isActive: students.isActive,
      classId: students.classId,
      className: classes.name,
      classSection: classes.section,
      academicYearId: students.academicYearId,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(where)
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ students: rows, total: totalCount, page, limit });
}, "students:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = studentCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const validData = parseResult.data;
  const institutionId = await resolveRequestInstitution(session, validData.institutionId);
  if (institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
  }

  // Tenant-scoped duplicate admissionNo check
  const existing = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.institutionId, institutionId),
        sql`lower(${students.admissionNo}) = lower(${validData.admissionNo})`
      )
    )
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "Student with this admission number already exists in this institution" },
      { status: 409 }
    );
  }

  const result = await db
    .insert(students)
    .values({
      id: crypto.randomUUID(),
      admissionNo: validData.admissionNo,
      studentId: validData.studentId || null,
      firstName: validData.firstName,
      lastName: validData.lastName,
      email: validData.email || null,
      phone: validData.phone || null,
      dateOfBirth: validData.dateOfBirth || null,
      gender: validData.gender || null,
      classId: validData.classId || null,
      academicYearId: validData.academicYearId || null,
      address: validData.address || null,
      bloodGroup: validData.bloodGroup || null,
      emergencyContactName: validData.emergencyContactName || null,
      emergencyContactPhone: validData.emergencyContactPhone || null,
      nfcTagId: validData.nfcTagId || null,
      qrCode: validData.qrCode || null,
      avatarUrl: validData.avatarUrl || null,
      institutionId,
      isActive: true,
    })
    .returning()
    .get();

  return NextResponse.json({ student: result }, { status: 201 });
}, "students:create");
