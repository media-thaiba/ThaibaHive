import { db } from "@thaiba/db";
import { studentAttendanceLogs, financialTransactions, markEntries, students } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";


export interface StudentFeatureVector {
  studentId: string;
  institutionId: string;
  studentName?: string;
  attendanceRate30d: number;
  attendanceRate90d: number;
  absenceClusterMonday: number;
  unpaidFeeBalance: number;
  feePaymentDelayDays: number;
  academicMarkAverage: number;
  academicMarkTrend: number; // positive = improving, negative = declining
  totalExamsTaken: number;
}

export async function extractStudentFeatures(
  institutionId: string,
  targetStudentId?: string
): Promise<StudentFeatureVector[]> {
  try {
    let studentList: { id: string; firstName: string; lastName: string }[] = [];
    if (targetStudentId) {
      const res = await db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(and(eq(students.institutionId, institutionId), eq(students.id, targetStudentId)));
      studentList = res;
    } else {
      const res = await db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(eq(students.institutionId, institutionId));
      studentList = res;
    }

    if (!studentList || studentList.length === 0) {
      return [];
    }

    const vectors: StudentFeatureVector[] = [];

    for (const st of studentList) {
      // 1. Attendance metrics
      const attendanceLogs = await db
        .select()
        .from(studentAttendanceLogs)
        .where(eq(studentAttendanceLogs.studentId, st.id));

      let att30Total = 0;
      let att30Present = 0;
      let att90Total = 0;
      let att90Present = 0;
      let mondayAbsences = 0;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      for (const log of attendanceLogs) {
        const logDate = new Date(log.date);
        const isPresent = log.status === "present";

        if (logDate >= ninetyDaysAgo) {
          att90Total++;
          if (isPresent) att90Present++;
        }
        if (logDate >= thirtyDaysAgo) {
          att30Total++;
          if (isPresent) att30Present++;
        }
        if (!isPresent && logDate.getDay() === 1) {
          mondayAbsences++;
        }
      }

      const attendanceRate30d = att30Total > 0 ? (att30Present / att30Total) * 100 : 100;
      const attendanceRate90d = att90Total > 0 ? (att90Present / att90Total) * 100 : 100;

      // 2. Fee transaction metrics
      const feeLogs = await db
        .select()
        .from(financialTransactions)
        .where(eq(financialTransactions.institutionId, institutionId));

      let unpaidBalance = 0;
      const maxDelay = 0;

      for (const fee of feeLogs) {
        if (fee.category === "tuition" || fee.category === "fee") {
          unpaidBalance += fee.amount || 0;
        }
      }


      // 3. Academic exam marks
      const markLogs = await db
        .select()
        .from(markEntries)
        .where(eq(markEntries.studentId, st.id));

      let totalMarks = 0;
      let markCount = 0;
      let markTrend = 0;

      if (markLogs.length > 0) {
        const validMarks = markLogs
          .filter((m) => m.marksObtained !== null && m.marksObtained !== undefined)
          .map((m) => m.marksObtained as number);

        markCount = validMarks.length;
        if (markCount > 0) {
          totalMarks = validMarks.reduce((a, b) => a + b, 0);
          if (markCount >= 2) {
            markTrend = validMarks[validMarks.length - 1] - validMarks[0];
          }
        }
      }

      const academicMarkAverage = markCount > 0 ? totalMarks / markCount : 75;

      vectors.push({
        studentId: st.id,
        institutionId,
        studentName: `${st.firstName} ${st.lastName}`,
        attendanceRate30d,
        attendanceRate90d,
        absenceClusterMonday: mondayAbsences,
        unpaidFeeBalance: unpaidBalance,
        feePaymentDelayDays: maxDelay,
        academicMarkAverage,
        academicMarkTrend: markTrend,
        totalExamsTaken: markCount,
      });
    }

    return vectors;
  } catch (error) {
    console.error("[Feature Extractor Error]", error);
    return [];
  }
}
