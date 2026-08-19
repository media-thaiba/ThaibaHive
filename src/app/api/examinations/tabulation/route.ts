import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams, examSchedules, markEntries, students } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { calculateStudentTabulation } from "@/lib/examinations/grade-calculator";
import { eq, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");

  if (!examId) {
    return NextResponse.json({ error: "Missing required parameter: examId" }, { status: 400 });
  }

  const exam = await db.select().from(exams).where(eq(exams.id, examId)).get();
  if (!exam) {
    return NextResponse.json({ error: "Examination not found" }, { status: 404 });
  }

  const schedules = await db.select().from(examSchedules).where(eq(examSchedules.examId, examId));
  const scheduleIds = schedules.map((s) => s.id);

  if (scheduleIds.length === 0) {
    return NextResponse.json({ tabulation: [], analytics: { passRate: 0, classAverage: 0 } });
  }

  const allMarks = await db
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
    })
    .from(markEntries)
    .leftJoin(students, eq(markEntries.studentId, students.id))
    .where(inArray(markEntries.examScheduleId, scheduleIds));

  // Group marks by studentId
  const studentMap = new Map<string, { studentId: string; name: string; rollNumber: string; subjects: any[] }>();

  for (const mark of allMarks) {
    if (!studentMap.has(mark.studentId)) {
      studentMap.set(mark.studentId, {
        studentId: mark.studentId,
        name: `${mark.studentName || "Student"} ${mark.studentLastName || ""}`.trim(),
        rollNumber: mark.rollNumber || mark.studentId,
        subjects: [],
      });
    }

    const scheduleObj = schedules.find((s) => s.id === mark.examScheduleId);
    studentMap.get(mark.studentId)!.subjects.push({
      subjectName: scheduleObj?.subjectName || "Subject",
      marksObtained: mark.marksObtained,
      maxMarks: mark.maxMarks || scheduleObj?.maxMarks || 100,
      passMarks: scheduleObj?.passMarks || 40,
      isAbsent: mark.isAbsent,
    });
  }

  const tabulationList: any[] = [];
  let totalClassScore = 0;
  let passedCount = 0;

  for (const [studentId, data] of studentMap.entries()) {
    const summary = calculateStudentTabulation(data.subjects);
    tabulationList.push({
      studentId,
      name: data.name,
      rollNumber: data.rollNumber,
      subjects: data.subjects,
      totalMarks: summary.totalMarks,
      totalMaxMarks: summary.totalMaxMarks,
      percentage: summary.percentage,
      gpa: summary.gpa,
      letterGrade: summary.letterGrade,
      resultStatus: summary.resultStatus,
      failedSubjectsCount: summary.failedSubjectsCount,
    });

    totalClassScore += summary.percentage;
    if (summary.resultStatus === "pass") passedCount++;
  }

  // Sort by total marks descending for rank calculation
  tabulationList.sort((a, b) => b.totalMarks - a.totalMarks);
  tabulationList.forEach((item, index) => {
    item.rank = index + 1;
  });

  const totalStudents = tabulationList.length;
  const analytics = {
    totalStudents,
    passedCount,
    failedCount: totalStudents - passedCount,
    passRate: totalStudents > 0 ? Math.round((passedCount / totalStudents) * 1000) / 10 : 0,
    classAverage: totalStudents > 0 ? Math.round((totalClassScore / totalStudents) * 10) / 10 : 0,
  };

  return NextResponse.json({
    exam,
    schedules,
    tabulation: tabulationList,
    analytics,
  });
}, "exam:read");
