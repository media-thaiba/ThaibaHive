import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { guardians, studentGuardians, students } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

const guardianCreateSchema = z.object({
  name: z.string().min(1),
  relation: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;

  if (studentId) {
    const whereClause = instScope
      ? and(eq(studentGuardians.studentId, studentId), eq(students.institutionId, instScope))
      : eq(studentGuardians.studentId, studentId);

    const rows = await db
      .select({ guardian: guardians })
      .from(guardians)
      .innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
      .innerJoin(students, eq(studentGuardians.studentId, students.id))
      .where(whereClause)
      .all();
    return NextResponse.json({ guardians: rows.map((r) => r.guardian) });
  }

  if (instScope) {
    const rows = await db
      .select({ guardian: guardians })
      .from(guardians)
      .innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
      .innerJoin(students, eq(studentGuardians.studentId, students.id))
      .where(eq(students.institutionId, instScope))
      .all();
    const uniqueGuardians = Array.from(
      new Map(rows.map((r) => [r.guardian.id, r.guardian])).values()
    );
    return NextResponse.json({ guardians: uniqueGuardians });
  }

  const rows = await db.select().from(guardians).all();
  return NextResponse.json({ guardians: rows });
}, "students:read");

export const POST = requireAuth(async (request: Request, _session) => {
  const body = await request.json();
  const parsed = guardianCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(guardians).values({ id, ...parsed.data, createdAt: now, updatedAt: now }).run();
  const [created] = await db.select().from(guardians).where(eq(guardians.id, id)).all();
  return NextResponse.json(created, { status: 201 });
}, "students:write");
