import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, gradeScales } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const { id } = (await context?.params) || { id: "" };
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(exams.id, id), eq(exams.institutionId, scopedInstitutionId))
    : eq(exams.id, id);

  const exam = await db.select().from(exams).where(whereClause).get();
  if (!exam) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  const schedules = await db.select().from(examSchedules).where(eq(examSchedules.examId, id));
  
  let scale = null;
  if (exam.gradeScaleId) {
    const scaleWhere = scopedInstitutionId && scopedInstitutionId !== "global"
      ? and(eq(gradeScales.id, exam.gradeScaleId), eq(gradeScales.institutionId, scopedInstitutionId))
      : eq(gradeScales.id, exam.gradeScaleId);
    scale = await db.select().from(gradeScales).where(scaleWhere).get();
  }

  return NextResponse.json({
    exam,
    schedules,
    gradeScale: scale,
  });
}, "exam:read");

export const PATCH = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const { id } = (await context?.params) || { id: "" };
  const body = await request.json();

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(exams.id, id), eq(exams.institutionId, scopedInstitutionId))
    : eq(exams.id, id);

  const existing = await db.select().from(exams).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.title !== undefined) updates.title = body.title;
  if (body.status !== undefined) updates.status = body.status;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  if (body.gradeScaleId !== undefined) updates.gradeScaleId = body.gradeScaleId;

  await db.update(exams).set(updates).where(whereClause);

  const updated = await db.select().from(exams).where(whereClause).get();
  return NextResponse.json({ success: true, exam: updated });
}, "exam:create");

export const DELETE = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const { id } = (await context?.params) || { id: "" };
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(exams.id, id), eq(exams.institutionId, scopedInstitutionId))
    : eq(exams.id, id);

  const existing = await db.select().from(exams).where(whereClause).get();
  if (!existing) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  await db.delete(exams).where(whereClause);
  return NextResponse.json({ success: true, deletedId: id });
}, "exam:create");
