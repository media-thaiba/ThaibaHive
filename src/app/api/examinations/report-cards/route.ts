import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, markEntries, students,  } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { generateStudentReportCardPDF } from "@/lib/examinations/report-card-generator";
import { calculateStudentTabulation,  } from "@/lib/examinations/grade-calculator";
import { eq, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  const studentId = searchParams.get("studentId");
  const encrypt = searchParams.get("encrypt") === "true";

  if (!examId || !studentId) {
    return NextResponse.json({ error: "Missing required parameters: examId, studentId" }, { status: 400 });
  }

  const exam = await db.select().from(exams).where(eq(exams.id, examId)).get();
  if (!exam) {
    return NextResponse.json({ error: "Examination session not found" }, { status: 404 });
  }

  const studentObj = await db.select().from(students).where(eq(students.id, studentId)).get();
  if (!studentObj) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
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

    return {
      subjectName: s.subjectName,
      marksObtained: isAbsent ? null : marksObtained,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      letterGrade: isPass ? (percentage >= 90 ? "O" : percentage >= 80 ? "A+" : percentage >= 70 ? "A" : "B+") : "F",
      gpa: isPass ? (percentage >= 90 ? 10.0 : percentage >= 80 ? 9.0 : 8.0) : 0.0,
      isAbsent,
    };
  });

  // Optional DOB password protection (e.g. DDMMYYYY)
  const password = encrypt && studentObj.dateOfBirth ? studentObj.dateOfBirth.replace(/-/g, "") : undefined;

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
