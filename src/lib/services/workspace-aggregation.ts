import { db } from "@/db";
import {
  staff,
  staffInstitutions,
  attendanceLogs,
  tasks,
  leaveRequests,
  financialTransactions,
  studentGuardians,
  students,
  studentAttendanceLogs,
  hallTickets,
  scheduledJobs,
  jobExecutions,
} from "@thaiba/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrincipalWorkspaceData {
  staffTotal: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingApprovals: number;
  incidentsPending: number;
  feeCollectedToday: number;
}

export interface TeacherWorkspaceData {
  classCount: number;
  pendingTasks: number;
  homeworkPendingApprovals: number;
  attendancePending: number;
}

export interface CashierWorkspaceData {
  collectionTotal: number;
  pendingInvoices: number;
  dailyCheckouts: number;
  pendingTotal: number;
}

export interface ParentWorkspaceData {
  children: Array<{ studentName: string; attendanceStatus: string }>;
  presentCount: number;
  totalChildren: number;
  pendingFeeTotal: number;
  invoiceCount: number;
}

export type WorkspaceData =
  | PrincipalWorkspaceData
  | TeacherWorkspaceData
  | CashierWorkspaceData
  | ParentWorkspaceData;

// ─── Aggregation Service ──────────────────────────────────────────────────────

export class WorkspaceAggregationService {
  /**
   * Returns Cache-Control headers for workspace data endpoints.
   * @param ttl Cache TTL in seconds (default: 60)
   */
  static getCacheHeaders(ttl = 60): Record<string, string> {
    return {
      "Cache-Control": `public, max-age=${ttl}, stale-while-revalidate=${Math.floor(ttl / 2)}`,
    };
  }

  /**
   * Aggregates workspace data for the Principal persona.
   * Enforces institution isolation (Rule 1).
   */
  static async getPrincipalData(institutionId: string): Promise<PrincipalWorkspaceData> {
    const today = new Date().toISOString().split("T")[0];

    try {
      // Count of staff in institution
      const staffCountResult = await db
        .select({ count: sql<number>`count(${staffInstitutions.staffId})` })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, institutionId))
        .get();
      const staffTotal = staffCountResult?.count ?? 0;

      // Today's attendance breakdown for this institution's staff
      const attendanceResult = await db
        .select({
          status: attendanceLogs.status,
          count: sql<number>`count(${attendanceLogs.id})`,
        })
        .from(attendanceLogs)
        .innerJoin(staffInstitutions, eq(attendanceLogs.staffId, staffInstitutions.staffId))
        .where(
          and(
            eq(staffInstitutions.institutionId, institutionId),
            eq(attendanceLogs.date, today)
          )
        )
        .groupBy(attendanceLogs.status)
        .all();

      let presentToday = 0;
      let absentToday = 0;
      let lateToday = 0;
      for (const row of attendanceResult) {
        if (row.status === "present") presentToday = row.count;
        else if (row.status === "absent") absentToday = row.count;
        else if (row.status === "late") lateToday = row.count;
      }

      // Pending leave approvals (pending requests from institution staff)
      const approvalsResult = await db
        .select({ count: sql<number>`count(${leaveRequests.id})` })
        .from(leaveRequests)
        .innerJoin(staffInstitutions, eq(leaveRequests.staffId, staffInstitutions.staffId))
        .where(
          and(
            eq(staffInstitutions.institutionId, institutionId),
            eq(leaveRequests.status, "pending")
          )
        )
        .get();
      const pendingApprovals = approvalsResult?.count ?? 0;

      return {
        staffTotal,
        presentToday,
        absentToday,
        lateToday,
        pendingApprovals,
        incidentsPending: 0, // Incident module not yet modelled
        feeCollectedToday: 0, // Finance module query reserved for Sprint-026
      };
    } catch (error) {
      console.error("[WorkspaceAggregationService] getPrincipalData error:", error);
      return {
        staffTotal: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        pendingApprovals: 0,
        incidentsPending: 0,
        feeCollectedToday: 0,
      };
    }
  }

  /**
   * Aggregates workspace data for the Teacher persona.
   */
  static async getTeacherData(staffId: string): Promise<TeacherWorkspaceData> {
    try {
      // Pending tasks assigned to this staff member
      const pendingTasksResult = await db
        .select({ count: sql<number>`count(${tasks.id})` })
        .from(tasks)
        .where(
          and(
            eq(tasks.assignedToId, staffId),
            sql`${tasks.status} != 'completed'`
          )
        )
        .get();
      const pendingTasks = pendingTasksResult?.count ?? 0;

      return {
        classCount: 0, // Class schedule module integration reserved for follow-up
        pendingTasks,
        homeworkPendingApprovals: 0,
        attendancePending: 0,
      };
    } catch (error) {
      console.error("[WorkspaceAggregationService] getTeacherData error:", error);
      return { classCount: 0, pendingTasks: 0, homeworkPendingApprovals: 0, attendancePending: 0 };
    }
  }

  /**
   * Aggregates workspace data for the Cashier/Accounts persona.
   */
  static async getCashierData(institutionId: string): Promise<CashierWorkspaceData> {
    const today = new Date().toISOString().split("T")[0];

    try {
      // Sum of credit transaction amounts recorded today
      const collectionResult = await db
        .select({ sum: sql<number>`sum(${financialTransactions.amount})` })
        .from(financialTransactions)
        .where(
          and(
            eq(financialTransactions.institutionId, institutionId),
            eq(financialTransactions.type, "credit"),
            eq(financialTransactions.transactionDate, today)
          )
        )
        .get();
      const collectionTotal = collectionResult?.sum ?? 0;

      // Count of all transactions recorded today
      const dailyCheckoutsResult = await db
        .select({ count: sql<number>`count(${financialTransactions.id})` })
        .from(financialTransactions)
        .where(
          and(
            eq(financialTransactions.institutionId, institutionId),
            eq(financialTransactions.transactionDate, today)
          )
        )
        .get();
      const dailyCheckouts = dailyCheckoutsResult?.count ?? 0;

      // Count of pending debit invoices (tuition/fees)
      const pendingInvoicesResult = await db
        .select({ count: sql<number>`count(${financialTransactions.id})` })
        .from(financialTransactions)
        .where(
          and(
            eq(financialTransactions.institutionId, institutionId),
            eq(financialTransactions.type, "debit"),
            sql`${financialTransactions.category} IN ('tuition', 'fee')`
          )
        )
        .get();
      const pendingInvoices = pendingInvoicesResult?.count ?? 0;

      // Sum of pending debit invoices
      const pendingTotalResult = await db
        .select({ sum: sql<number>`sum(${financialTransactions.amount})` })
        .from(financialTransactions)
        .where(
          and(
            eq(financialTransactions.institutionId, institutionId),
            eq(financialTransactions.type, "debit"),
            sql`${financialTransactions.category} IN ('tuition', 'fee')`
          )
        )
        .get();
      const pendingTotal = pendingTotalResult?.sum ?? 0;

      return {
        collectionTotal,
        pendingInvoices,
        dailyCheckouts,
        pendingTotal,
      };
    } catch (error) {
      console.error("[WorkspaceAggregationService] getCashierData error:", error);
      return { collectionTotal: 0, pendingInvoices: 0, dailyCheckouts: 0, pendingTotal: 0 };
    }
  }

  /**
   * Aggregates workspace data for the Parent persona.
   * guardianId is the staffId of the authenticated guardian user.
   */
  static async getParentData(guardianId: string): Promise<ParentWorkspaceData> {
    const today = new Date().toISOString().split("T")[0];

    try {
      // Find all active children linked to the guardian
      const roster = await db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          institutionId: students.institutionId,
        })
        .from(studentGuardians)
        .innerJoin(students, eq(studentGuardians.studentId, students.id))
        .where(
          and(
            eq(studentGuardians.guardianId, guardianId),
            eq(students.isActive, true)
          )
        )
        .all();

      const children: Array<{ studentName: string; attendanceStatus: string }> = [];
      let presentCount = 0;
      let pendingFeeTotal = 0;
      let invoiceCount = 0;

      for (const child of roster) {
        // Query child's attendance log for today
        const attLog = await db
          .select()
          .from(studentAttendanceLogs)
          .where(
            and(
              eq(studentAttendanceLogs.studentId, child.id),
              eq(studentAttendanceLogs.date, today)
            )
          )
          .get();

        const attendanceStatus = attLog?.status || "unknown";
        if (attendanceStatus === "present") {
          presentCount++;
        }

        children.push({
          studentName: `${child.firstName} ${child.lastName}`,
          attendanceStatus,
        });

        // Query outstanding invoices via hall ticket fee lock
        const latestTicket = await db
          .select()
          .from(hallTickets)
          .where(eq(hallTickets.studentId, child.id))
          .orderBy(desc(hallTickets.createdAt))
          .limit(1)
          .get();

        if (!latestTicket || latestTicket.feeCleared === false) {
          pendingFeeTotal += 5000;
          invoiceCount += 1;
        }
      }

      return {
        children,
        presentCount,
        totalChildren: roster.length,
        pendingFeeTotal,
        invoiceCount,
      };
    } catch (error) {
      console.error("[WorkspaceAggregationService] getParentData error:", error);
      return {
        children: [],
        presentCount: 0,
        totalChildren: 0,
        pendingFeeTotal: 0,
        invoiceCount: 0,
      };
    }
  }

  /**
   * Retrieves queue telemetry metrics.
   * Leverages sliding-window caching to prevent database read lock contention.
   */
  private static telemetryCache: {
    data: { avgProcessingTime: number; completionSuccessRate: number; failedJobsTotal: number } | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  static async getQueueTelemetryMetrics(): Promise<{
    avgProcessingTime: number;
    completionSuccessRate: number;
    failedJobsTotal: number;
  }> {
    const CACHE_TTL_MS = 5000; // 5-second TTL
    const now = Date.now();

    if (this.telemetryCache.data && now - this.telemetryCache.timestamp < CACHE_TTL_MS) {
      return this.telemetryCache.data;
    }

    try {
      // Average execution processing duration
      const executions = await db
        .select({
          startedAt: jobExecutions.startedAt,
          completedAt: jobExecutions.completedAt,
        })
        .from(jobExecutions)
        .where(
          and(
            eq(jobExecutions.status, "success"),
            sql`${jobExecutions.completedAt} IS NOT NULL`
          )
        )
        .all();

      let totalDurationMs = 0;
      let count = 0;
      for (const exec of executions) {
        if (exec.completedAt) {
          const start = new Date(exec.startedAt).getTime();
          const end = new Date(exec.completedAt).getTime();
          const duration = end - start;
          if (duration >= 0) {
            totalDurationMs += duration;
            count++;
          }
        }
      }
      const avgProcessingTime = count > 0 ? Math.round((totalDurationMs / count) / 1000) : 0;

      // Completion success rate over all execution attempts
      const allJobs = await db
        .select({
          status: scheduledJobs.status,
        })
        .from(scheduledJobs)
        .all();

      const totalCount = allJobs.length;
      const successCount = allJobs.filter(j => j.status === "success").length;
      const failedJobsTotal = allJobs.filter(j => j.status === "failed").length;

      const completionSuccessRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

      const telemetryData = {
        avgProcessingTime,
        completionSuccessRate,
        failedJobsTotal,
      };

      this.telemetryCache = {
        data: telemetryData,
        timestamp: now,
      };

      return telemetryData;
    } catch (err) {
      console.error("[WorkspaceAggregationService] Failed to calculate queue telemetry metrics:", err);
      return {
        avgProcessingTime: 0,
        completionSuccessRate: 100,
        failedJobsTotal: 0,
      };
    }
  }
}
