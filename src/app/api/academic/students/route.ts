import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, like, or, and, sql, type SQL } from "drizzle-orm";

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const classId = url.searchParams.get("classId");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = (page - 1) * limit;

  const conditions: (SQL | undefined)[] = [eq(students.isActive, true)];
  if (search) {
    conditions.push(
      or(
        like(students.firstName, `%${search}%`),
        like(students.lastName, `%${search}%`),
        like(students.admissionNo, `%${search}%`),
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

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { admissionNo, firstName, lastName, email, phone, dateOfBirth, gender, classId, academicYearId, institutionId } = body;

  if (!admissionNo || !firstName || !lastName) {
    return NextResponse.json({ error: "admissionNo, firstName, and lastName are required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(students)
    .where(eq(students.admissionNo, admissionNo))
    .get();

  if (existing) {
    return NextResponse.json({ error: "Student with this admission number already exists" }, { status: 409 });
  }

  const result = await db
    .insert(students)
    .values({
      id: crypto.randomUUID(),
      admissionNo,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      classId,
      academicYearId,
      institutionId,
    })
    .returning()
    .get();

  return NextResponse.json({ student: result }, { status: 201 });
}, "students:create");
