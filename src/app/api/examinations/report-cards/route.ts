import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, markEntries, students } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { hasPermission } from "@thaiba/auth";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { generateStudentReportCardPDF } from "@/lib/examinations/report-card-generator";
import { calculateStudentTabulation, calculateGrade } from "@/lib/examinations/grade-calculator";
import { eq, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  const studentId = searchParams.get("studentId");
  const encrypt = searchParams.get("encrypt") === "true";

  if (!examId || !studentId) {
    return NextResponse.json({ error: "Missing required parameters: examId, studentId" }, { status: 400 });
  }

  // Tenant boundary: exam and student must both belong to the caller's institution.
  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  const examWhere = institutionId && institutionId !== "global"
    ? and(eq(exams.id, examId), eq(exams.institutionId, institutionId))
    : eq(exams.id, examId);

  const [exam] = await db.select().from(exams).where(examWhere);
  if (!exam) {
    return NextResponse.json({ error: "Examination session not found" }, { status: 404 });
  }

  const studentWhere = institutionId && institutionId !== "global"
    ? and(eq(students.id, studentId), eq(students.institutionId, institutionId))
    : eq(students.id, studentId);

  const [studentObj] = await db.select().from(students).where(studentWhere);
  if (!studentObj) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Publication lock: report cards are official documents — before the exam is
  // published only staff with result-publication privilege may preview them.
  if (exam.status !== "published" && !hasPermission(session.role, "exam:publish_results")) {
    return NextResponse.json(
      { error: "Report cards cannot be accessed prior to official publication" },
      { status: 403 }
    );
  }

  const schedules = await db.select().from(examSchedules).where(eq(examSchedules.examId, examId));
  const scheduleIds = schedules.map((s) => s.id);

  const studentMarks = scheduleIds.length > 0
    ? await db
        .select()
        .from(markEntries)
        .where(inArray(markEntries.examScheduleId, scheduleIds))
    : [];

  const studentSpecificMarks = studentMarks.filter((m) => m.studentId === studentId);

  const subjectInputs = schedules.map((s) => {
    const mark = studentSpecificMarks.find((m) => m.examScheduleId === s.id);
    return {
      subjectName: s.subjectName,
      marksObtained: mark ? mark.marksObtained : null,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      isAbsent: mark ? mark.isAbsent : true,
    };
  });

  const tabulation = calculateStudentTabulation(subjectInputs);

  const subjectsForReport = schedules.map((s) => {
    const mark = studentSpecificMarks.find((m) => m.examScheduleId === s.id);
    const marksObtained = mark ? mark.marksObtained : null;
    const isAbsent = mark ? mark.isAbsent : true;
    const percentage = marksObtained !== null && s.maxMarks > 0 ? (marksObtained / s.maxMarks) * 100 : 0;
    const isPass = !isAbsent && marksObtained !== null && marksObtained >= s.passMarks;

    const gradeInfo = calculateGrade(percentage);

    return {
      subjectName: s.subjectName,
      marksObtained: isAbsent ? null : marksObtained,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      letterGrade: isPass ? gradeInfo.letterGrade : "F",
      gpa: isPass ? gradeInfo.gpa : 0.0,
      isAbsent,
    };
  });

  // Standard academic DOB password protection (DDMMYYYY format)
  let password: string | undefined = undefined;
  if (encrypt && studentObj.dateOfBirth) {
    const parts = studentObj.dateOfBirth.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      password = `${day}${month}${year}`;
    } else {
      password = studentObj.dateOfBirth.replace(/-/g, "");
    }
  }

  const pdfBuffer = await generateStudentReportCardPDF({
    studentId: studentObj.id,
    studentName: `${studentObj.firstName} ${studentObj.lastName}`.trim(),
    rollNumber: studentObj.studentId || studentObj.id,
    academicYear: exam.academicYear,
    term: exam.term,
    examTitle: exam.title,
    subjects: subjectsForReport,
    totalMarks: tabulation.totalMarks,
    totalMaxMarks: tabulation.totalMaxMarks,
    percentage: tabulation.percentage,
    gpa: tabulation.gpa,
    letterGrade: tabulation.letterGrade,
    resultStatus: tabulation.resultStatus,
    password,
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-card-${studentObj.studentId}.pdf"`,
    },
  });
}, "exam:read");
