import { NextResponse } from "next/server";
import { db } from "@/db";
import { markEntries, students, examSchedules, exams } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, _session) => {
  const { searchParams } = new URL(request.url);
  const examScheduleId = searchParams.get("examScheduleId");
  const doubleBlind = searchParams.get("doubleBlind") === "true";

  if (!examScheduleId) {
    return NextResponse.json({ error: "Missing required parameter: examScheduleId" }, { status: 400 });
  }

  // Tenant boundary: the schedule's parent exam must belong to the caller's institution.
  const institutionId = await resolveScopedInstitutionId(_session.institutionId);
  if (institutionId && institutionId !== "global") {
    const scoped = await db
      .select({ examInstitutionId: exams.institutionId })
      .from(examSchedules)
      .innerJoin(exams, eq(examSchedules.examId, exams.id))
      .where(eq(examSchedules.id, examScheduleId))
      .get();
    if (!scoped || scoped.examInstitutionId !== institutionId) {
      return NextResponse.json({ error: "Target examination schedule not found" }, { status: 404 });
    }
  }

  const list = await db
    .select({
      id: markEntries.id,
      examScheduleId: markEntries.examScheduleId,
      studentId: markEntries.studentId,
      studentName: students.firstName,
      studentLastName: students.lastName,
      rollNumber: students.studentId,
      marksObtained: markEntries.marksObtained,
      maxMarks: markEntries.maxMarks,
      isAbsent: markEntries.isAbsent,
      evaluatorToken: markEntries.evaluatorToken,
      doubleBlind: markEntries.doubleBlind,
      remarks: markEntries.remarks,
      status: markEntries.status,
      updatedAt: markEntries.updatedAt,
    })
    .from(markEntries)
    .leftJoin(students, eq(markEntries.studentId, students.id))
    .where(eq(markEntries.examScheduleId, examScheduleId));

  // Sanitize double blind evaluations if requested
  const sanitized = list.map((item) => {
    if (doubleBlind || item.doubleBlind) {
      return {
        ...item,
        studentName: "Anonymous Candidate",
        studentLastName: "",
        rollNumber: item.evaluatorToken || `EVAL-${item.id.substring(0, 6)}`,
      };
    }
    return item;
  });

  return NextResponse.json({ markEntries: sanitized });
}, "exam:read");
