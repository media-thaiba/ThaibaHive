import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@thaiba/auth";
import { db } from "@/db";
import { students } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const studentUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  nfcTagId: z.string().optional(),
  qrCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1) ?? "";
  const scope = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));

  const whereClause = scope && scope !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, scope))
    : eq(students.id, id);

  const [student] = await db.select().from(students).where(whereClause).all();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json(student);
}, "students:read");

export const PATCH = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1) ?? "";
  const body = await request.json();
  const scope = await resolveScopedInstitutionId(body.institutionId || url.searchParams.get("institutionId"));

  const whereClause = scope && scope !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, scope))
    : eq(students.id, id);

  const [existing] = await db.select({ id: students.id }).from(students).where(whereClause).all();
  if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  await db.update(students).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(whereClause).run();
  const [updated] = await db.select().from(students).where(whereClause).all();
  return NextResponse.json(updated);
}, "students:write");

export const DELETE = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1) ?? "";
  const scope = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));

  const whereClause = scope && scope !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, scope))
    : eq(students.id, id);

  const [existing] = await db.select({ id: students.id }).from(students).where(whereClause).all();
  if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  await db.delete(students).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "students:delete");
