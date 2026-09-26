import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { students } from "@thaiba/db/schema";
import { eq, and,  } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

const studentCreateSchema = z.object({
  admissionNo: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  institutionId: z.string().min(1),
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
});

export const GET = requireAuth(async (request: Request, _session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = searchParams.get("institutionId") || undefined;
  const classId = searchParams.get("classId") || undefined;
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
  const offset = Number(searchParams.get("offset") || "0");

  const conditions = [];
  if (institutionId) conditions.push(eq(students.institutionId, institutionId));
  if (classId) conditions.push(eq(students.classId, classId));

  const query = conditions.length > 0
    ? db.select().from(students).where(and(...conditions))
    : db.select().from(students);

  const rows = await (query as any).limit(limit).offset(offset).all();

  return NextResponse.json({ students: rows, limit, offset });
}, "students:read");

export const POST = requireAuth(async (request: Request, _session) => {
  const body = await request.json();
  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(students).values({ id, ...parsed.data, createdAt: now, updatedAt: now }).run();

  const [created] = await db.select().from(students).where(eq(students.id, id)).all();
  return NextResponse.json(created, { status: 201 });
}, "students:write");
