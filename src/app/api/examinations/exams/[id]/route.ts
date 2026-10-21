import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, gradeScales, hallTickets } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { examUpdateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = (await context?.params) || { id: "" };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedResult = examUpdateSchema.safeParse(body);
  if (!parsedResult.success) {
    return NextResponse.json({ error: parsedResult.error.issues[0].message }, { status: 400 });
  }
  const data = parsedResult.data;

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
    (data.gradeScaleId !== undefined || data.startDate !== undefined || data.endDate !== undefined)
  ) {
    return NextResponse.json(
      { error: "Cannot modify grade scale or exam dates on a published examination" },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.status !== undefined) updates.status = data.status;
  if (data.startDate !== undefined) updates.startDate = data.startDate;
  if (data.endDate !== undefined) updates.endDate = data.endDate;
  if (data.gradeScaleId !== undefined) updates.gradeScaleId = data.gradeScaleId;

  await db.update(exams).set(updates).where(whereClause);

  const updated = await db.select().from(exams).where(whereClause).get();
  return NextResponse.json({ success: true, exam: updated });
}, "exam:create");

export const DELETE = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

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
