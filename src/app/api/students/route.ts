import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { students } from "@thaiba/db/schema";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { studentCreateSchema } from "@/lib/validation/schemas";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, requestedInst);
  const classId = searchParams.get("classId") || undefined;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "20"), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);

  const conditions = [];
  if (institutionId && institutionId !== "global") conditions.push(eq(students.institutionId, institutionId));
  if (classId) conditions.push(eq(students.classId, classId));

  const query = conditions.length > 0
    ? db.select().from(students).where(and(...conditions))
    : db.select().from(students);

  const rows = await (query as any).limit(limit).offset(offset).all();

  return NextResponse.json({ students: rows, limit, offset });
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

  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const institutionId = await resolveRequestInstitution(session, parsed.data.institutionId);
  if (institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
  }

  const existing = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.institutionId, institutionId),
        sql`lower(${students.admissionNo}) = lower(${parsed.data.admissionNo})`
      )
    )
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "Student with this admission number already exists in this institution" },
      { status: 409 }
    );
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(students).values({
    id,
    ...parsed.data,
    institutionId,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  }).run();

  const [created] = await db.select().from(students).where(eq(students.id, id)).all();
  return NextResponse.json(created, { status: 201 });
}, "students:write");
