import { db } from "@thaiba/db";
import { studentAttendanceLogs, financialTransactions, markEntries, students } from "@thaiba/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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

    // Pre-fetch all fee logs for this institution ONCE outside the loop
    const feeLogs = await db
      .select()
      .from(financialTransactions)
      .where(eq(financialTransactions.institutionId, institutionId));

    let generalUnpaidBalance = 0;
    for (const fee of feeLogs) {
      if (fee.category === "tuition" || fee.category === "fee") {
        generalUnpaidBalance += fee.amount || 0;
      }
    }

    // Process students in chunks of 200 to batch attendance and mark queries
    const CHUNK_SIZE = 200;
    for (let i = 0; i < studentList.length; i += CHUNK_SIZE) {
      const chunk = studentList.slice(i, i + CHUNK_SIZE);
      const chunkIds = chunk.map((s) => s.id);

      const [chunkAttendance, chunkMarks] = await Promise.all([
        db.select()
          .from(studentAttendanceLogs)
          .where(inArray(studentAttendanceLogs.studentId, chunkIds)),
        db.select()
          .from(markEntries)
          .where(inArray(markEntries.studentId, chunkIds)),
      ]);

      const attendanceByStudent = new Map<string, typeof chunkAttendance>();
      for (const log of chunkAttendance) {
        if (!log.studentId) continue;
        let arr = attendanceByStudent.get(log.studentId);
        if (!arr) {
          arr = [];
          attendanceByStudent.set(log.studentId, arr);
        }
        arr.push(log);
      }

      const marksByStudent = new Map<string, typeof chunkMarks>();
      for (const m of chunkMarks) {
        if (!m.studentId) continue;
        let arr = marksByStudent.get(m.studentId);
        if (!arr) {
          arr = [];
          marksByStudent.set(m.studentId, arr);
        }
        arr.push(m);
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      for (const st of chunk) {
        const attendanceLogs = attendanceByStudent.get(st.id) || [];
        let att30Total = 0;
        let att30Present = 0;
        let att90Total = 0;
        let att90Present = 0;
        let mondayAbsences = 0;

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

        const markLogs = marksByStudent.get(st.id) || [];
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
          unpaidFeeBalance: generalUnpaidBalance,
          feePaymentDelayDays: 0,
          academicMarkAverage,
          academicMarkTrend: markTrend,
          totalExamsTaken: markCount,
        });
      }
    }

    return vectors;
  } catch (error) {
    console.error("[Feature Extractor Error]", error);
    return [];
  }
}
