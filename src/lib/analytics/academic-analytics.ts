import { db } from "@/db";
import { tabulationRegisters, classes, markEntries, examSchedules, students } from "@thaiba/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface AcademicAnalytics {
  passRate: number;
  subjectAverages: Array<{ subjectName: string; averageMarks: number }>;
  classPerformance: Array<{ className: string; averageGpa: number; passRate: number }>;
}

export async function getAcademicsAnalytics(
  institutionId: string,
  classId?: string
): Promise<AcademicAnalytics> {
  try {
    // 1. Overall Pass Rate
    const passRateResult = await db
      .select({
        total: sql<number>`count(${tabulationRegisters.id})`,
        passed: sql<number>`sum(case when ${tabulationRegisters.resultStatus} = 'pass' then 1 else 0 end)`
      })
      .from(tabulationRegisters)
      .innerJoin(students, eq(tabulationRegisters.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(
        classId
          ? and(eq(classes.institutionId, institutionId), eq(classes.id, classId))
          : eq(classes.institutionId, institutionId)
      )
      .get();

    const totalTab = passRateResult?.total ?? 0;
    const passedTab = passRateResult?.passed ?? 0;
    const passRate = totalTab > 0 ? Math.round((passedTab / totalTab) * 100) : 100;

    // 2. Subject Averages
    const subjectQuery = await db
      .select({
        subjectName: examSchedules.subjectName,
        average: sql<number>`avg(${markEntries.marksObtained})`
      })
      .from(markEntries)
      .innerJoin(examSchedules, eq(markEntries.examScheduleId, examSchedules.id))
      .innerJoin(students, eq(markEntries.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(
        classId
          ? and(eq(classes.institutionId, institutionId), eq(classes.id, classId))
          : eq(classes.institutionId, institutionId)
      )
      .groupBy(examSchedules.subjectName)
      .all();

    const subjectAverages = subjectQuery.map((s) => ({
      subjectName: s.subjectName,
      averageMarks: Math.round((s.average ?? 0) * 100) / 100
    }));

    // 3. Class Performance
    const classPerfQuery = await db
      .select({
        className: classes.name,
        averageGpa: sql<number>`avg(${tabulationRegisters.gpa})`,
        total: sql<number>`count(${tabulationRegisters.id})`,
        passed: sql<number>`sum(case when ${tabulationRegisters.resultStatus} = 'pass' then 1 else 0 end)`
      })
      .from(tabulationRegisters)
      .innerJoin(students, eq(tabulationRegisters.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(classes.institutionId, institutionId))
      .groupBy(classes.id, classes.name)
      .all();

    const classPerformance = classPerfQuery.map((c) => ({
      className: c.className,
      averageGpa: Math.round((c.averageGpa ?? 0) * 100) / 100,
      passRate: c.total > 0 ? Math.round((c.passed / c.total) * 100) : 100
    }));

    return {
      passRate,
      subjectAverages,
      classPerformance
    };
  } catch (error) {
    console.error("[getAcademicsAnalytics] Error:", error);
    return {
      passRate: 100,
      subjectAverages: [],
      classPerformance: []
    };
  }
}
