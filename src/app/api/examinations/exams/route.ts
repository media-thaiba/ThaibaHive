import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams } from "@thaiba/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { examCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const academicYear = searchParams.get("academicYear");
  const term = searchParams.get("term");
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));

  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (institutionId !== "global") {
    conditions.push(eq(exams.institutionId, institutionId));
  }
  if (status) conditions.push(eq(exams.status, status));
  if (academicYear) conditions.push(eq(exams.academicYear, academicYear));
  if (term) conditions.push(eq(exams.term, term));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(exams)
    .where(whereClause);

  const total = Number(countResult[0]?.count || 0);

  const examList = await db
    .select()
    .from(exams)
    .where(whereClause)
    .orderBy(desc(exams.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    exams: examList,
    total,
    page,
    limit,
  });
}, "exam:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedResult = examCreateSchema.safeParse(body);
  if (!parsedResult.success) {
    return NextResponse.json({ error: parsedResult.error.issues[0].message }, { status: 400 });
  }
  const parsed = parsedResult.data;

  const institutionId = await resolveRequestInstitution(session, parsed.institutionId);
  if (institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required for exam creation" }, { status: 400 });
  }

  // Pre-insert Collision Check
  const existingExam = await db
    .select({ id: exams.id, title: exams.title })
    .from(exams)
    .where(
      and(
        eq(exams.institutionId, institutionId),
        sql`lower(${exams.title}) = lower(${parsed.title})`,
        eq(exams.academicYear, parsed.academicYear),
        eq(exams.term, parsed.term)
      )
    )
    .limit(1)
    .get();

  if (existingExam && existingExam.title && existingExam.title.toLowerCase() === parsed.title.toLowerCase()) {
    return NextResponse.json(
      { error: "An examination session with this title, academic year, and term already exists" },
      { status: 409 }
    );
  }

  const examId = `exam_${Date.now()}`;

  const newExam = {
    id: examId,
    institutionId,
    title: parsed.title,
    academicYear: parsed.academicYear,
    term: parsed.term,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    gradeScaleId: parsed.gradeScaleId || null,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.insert(exams).values({
    ...newExam,
    institutionId,
  });

  return NextResponse.json({ success: true, exam: newExam }, { status: 201 });
}, "exam:create");
