import { db } from "@/db";
import { gradeScales, exams, examSchedules } from "@thaiba/db/schema";

export async function seedExaminations(institutionId: string = "inst_campus_main") {
  const gradeScaleId = `gs_${Date.now()}`;
  const examId = `exam_${Date.now()}`;

  // 1. Seed Grade Scale
  await db.insert(gradeScales).values({
    id: gradeScaleId,
    institutionId,
    name: "Standard 10-Point Grading Scale",
    scaleType: "10_point",
    rulesJson: JSON.stringify([
      { minPercentage: 90, maxPercentage: 100, grade: "O", gpa: 10.0, description: "Outstanding" },
      { minPercentage: 80, maxPercentage: 89.99, grade: "A+", gpa: 9.0, description: "Excellent" },
      { minPercentage: 70, maxPercentage: 79.99, grade: "A", gpa: 8.0, description: "Very Good" },
      { minPercentage: 60, maxPercentage: 69.99, grade: "B+", gpa: 7.0, description: "Good" },
      { minPercentage: 50, maxPercentage: 59.99, grade: "B", gpa: 6.0, description: "Above Average" },
      { minPercentage: 40, maxPercentage: 49.99, grade: "C", gpa: 5.0, description: "Average / Pass" },
      { minPercentage: 0, maxPercentage: 39.99, grade: "F", gpa: 0.0, description: "Fail" },
    ]),
    isDefault: true,
  });

  // 2. Seed Default Exam
  await db.insert(exams).values({
    id: examId,
    institutionId,
    title: "Mid-Term Examinations 2026",
    academicYear: "2025-2026",
    term: "Term 1",
    startDate: "2026-09-01",
    endDate: "2026-09-15",
    gradeScaleId,
    status: "scheduled",
  });

  // 3. Seed Exam Schedules
  await db.insert(examSchedules).values([
    {
      id: `sched_math_${Date.now()}`,
      examId,
      subjectName: "Advanced Mathematics",
      examDate: "2026-09-02",
      startTime: "09:30",
      endTime: "12:30",
      durationMinutes: 180,
      maxMarks: 100,
      passMarks: 40,
      roomNumber: "Hall 101",
    },
    {
      id: `sched_physics_${Date.now()}`,
      examId,
      subjectName: "Physics & Engineering Concepts",
      examDate: "2026-09-04",
      startTime: "09:30",
      endTime: "12:30",
      durationMinutes: 180,
      maxMarks: 100,
      passMarks: 40,
      roomNumber: "Hall 102",
    },
  ]);

  return { gradeScaleId, examId };
}
