import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, gradeScales, hallTickets } from "@thaiba/db/schema";
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

  // Published exams are locked against structural changes: swapping the grade scale
  // or moving the exam window after results exist would silently rewrite outcomes.
  if (
    existing.status === "published" &&
    (body.gradeScaleId !== undefined || body.startDate !== undefined || body.endDate !== undefined)
  ) {
    return NextResponse.json(
      { error: "Cannot modify grade scale or exam dates on a published examination" },
      { status: 400 }
    );
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

  // Referential guard: deleting an exam cascades to schedules, marks, and hall
  // tickets (schema onDelete: cascade) — refuse to destroy academic records.
  const scheduleRows = await db
    .select({ id: examSchedules.id })
    .from(examSchedules)
    .where(eq(examSchedules.examId, id))
    .limit(1);
  if (scheduleRows.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete an examination that has existing schedules or marks" },
      { status: 400 }
    );
  }

  const ticketRows = await db
    .select({ id: hallTickets.id })
    .from(hallTickets)
    .where(eq(hallTickets.examId, id))
    .limit(1);
  if (ticketRows.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete an examination that has issued hall tickets" },
      { status: 400 }
    );
  }

  await db.delete(exams).where(whereClause);
  return NextResponse.json({ success: true, deletedId: id });
}, "exam:create");
