import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, academicYears, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, like, and } from "drizzle-orm";

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const institutionId = url.searchParams.get("institutionId");
  const departmentId = url.searchParams.get("departmentId");

  const conditions = [eq(classes.isActive, true)];
  if (search) {
    conditions.push(like(classes.name, `%${search}%`));
  }
  if (institutionId) {
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

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, section, institutionId, departmentId, academicYearId, teacherId } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await db
    .insert(classes)
    .values({
      id: crypto.randomUUID(),
      name,
      section,
      institutionId,
      departmentId,
      academicYearId,
      teacherId,
    })
    .returning()
    .get();

  return NextResponse.json({ class: result }, { status: 201 });
}, "classes:create");
