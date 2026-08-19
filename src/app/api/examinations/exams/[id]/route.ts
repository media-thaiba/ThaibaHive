import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, gradeScales } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const { id } = (await context?.params) || { id: "" };

  const exam = await db.select().from(exams).where(eq(exams.id, id)).get();
  if (!exam) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  const schedules = await db.select().from(examSchedules).where(eq(examSchedules.examId, id));
  
  let scale = null;
  if (exam.gradeScaleId) {
    scale = await db.select().from(gradeScales).where(eq(gradeScales.id, exam.gradeScaleId)).get();
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

  const existing = await db.select().from(exams).where(eq(exams.id, id)).get();
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

  await db.update(exams).set(updates).where(eq(exams.id, id));

  const updated = await db.select().from(exams).where(eq(exams.id, id)).get();
  return NextResponse.json({ success: true, exam: updated });
}, "exam:create");

export const DELETE = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const { id } = (await context?.params) || { id: "" };

  const existing = await db.select().from(exams).where(eq(exams.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  await db.delete(exams).where(eq(exams.id, id));
  return NextResponse.json({ success: true, deletedId: id });
}, "exam:create");
