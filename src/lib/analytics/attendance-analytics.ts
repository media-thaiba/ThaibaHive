import { db } from "@/db";
import {
  studentAttendanceLogs,
  classes,
  attendanceLogs,
  staff,
  staffDepartments,
  departments,
  staffInstitutions
} from "@thaiba/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export interface AttendanceAnalytics {
  rate: number;
  absenteeismPeaks: Array<{ date: string; count: number }>;
  departmentVariations: Array<{ departmentName: string; rate: number }>;
}

export async function getAttendanceAnalytics(
  institutionId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceAnalytics> {
  try {
    // 1. Overall Student Attendance Rate
    const totalLogsResult = await db
      .select({
        total: sql<number>`count(${studentAttendanceLogs.id})`,
        present: sql<number>`sum(case when ${studentAttendanceLogs.status} = 'present' or ${studentAttendanceLogs.status} = 'late' then 1 else 0 end)`
      })
      .from(studentAttendanceLogs)
      .innerJoin(classes, eq(studentAttendanceLogs.classId, classes.id))
      .where(
        and(
          eq(classes.institutionId, institutionId),
          gte(studentAttendanceLogs.date, startDate),
          lte(studentAttendanceLogs.date, endDate)
        )
      )
      .get();

    const total = totalLogsResult?.total ?? 0;
    const present = totalLogsResult?.present ?? 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    // 2. Absenteeism Peaks (Top 5 dates with highest absent count)
    const peaksResult = await db
      .select({
        date: studentAttendanceLogs.date,
        count: sql<number>`count(${studentAttendanceLogs.id})`
      })
      .from(studentAttendanceLogs)
      .innerJoin(classes, eq(studentAttendanceLogs.classId, classes.id))
      .where(
        and(
          eq(classes.institutionId, institutionId),
          eq(studentAttendanceLogs.status, "absent"),
          gte(studentAttendanceLogs.date, startDate),
          lte(studentAttendanceLogs.date, endDate)
        )
      )
      .groupBy(studentAttendanceLogs.date)
      .orderBy(sql`count(${studentAttendanceLogs.id}) desc`)
      .limit(5)
      .all();

    const absenteeismPeaks = peaksResult.map((p) => ({
      date: p.date,
      count: p.count
    }));

    // 3. Department Variations (Staff Attendance Rates by Department)
    const deptResult = await db
      .select({
        departmentName: departments.name,
        total: sql<number>`count(${attendanceLogs.id})`,
        present: sql<number>`sum(case when ${attendanceLogs.status} = 'present' or ${attendanceLogs.status} = 'late' then 1 else 0 end)`
      })
      .from(attendanceLogs)
      .innerJoin(staff, eq(attendanceLogs.staffId, staff.id))
      .innerJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
      .innerJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .where(
        and(
          eq(staffInstitutions.institutionId, institutionId),
          gte(attendanceLogs.date, startDate),
          lte(attendanceLogs.date, endDate)
        )
      )
      .groupBy(departments.id, departments.name)
      .all();

    const departmentVariations = deptResult.map((d) => ({
      departmentName: d.departmentName,
      rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 100
    }));

    return {
      rate,
      absenteeismPeaks,
      departmentVariations
    };
  } catch (error) {
    console.error("[getAttendanceAnalytics] Error:", error);
    return {
      rate: 100,
      absenteeismPeaks: [],
      departmentVariations: []
    };
  }
}
