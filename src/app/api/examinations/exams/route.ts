import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams,  } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { examCreateSchema, paginationSchema } from "@/lib/validation/schemas";
import { eq, and, desc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const academicYear = searchParams.get("academicYear");
  const term = searchParams.get("term");
  const institutionId = searchParams.get("institutionId") || (session as any).institutionId || "inst_campus_main";

  const pagination = paginationSchema.parse({
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
  });
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = [eq(exams.institutionId, institutionId)];
  if (status) conditions.push(eq(exams.status, status));
  if (academicYear) conditions.push(eq(exams.academicYear, academicYear));
  if (term) conditions.push(eq(exams.term, term));

  const whereClause = and(...conditions);

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
  try {
    const body = await request.json();
    const parsed = examCreateSchema.parse(body);

    const institutionId = parsed.institutionId || (session as any).institutionId || "inst_campus_main";
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

    await db.insert(exams).values(newExam);

    return NextResponse.json({ success: true, exam: newExam }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create examination" }, { status: 400 });
  }
}, "exam:create");
