import { db, remediationTickets, autonomousWorkflows } from "@thaiba/db";
import { eq, sql } from "drizzle-orm";
import { AutonomousRemediationEngine } from "./autonomous-remediation-engine";

export interface SelfHealingMetrics {
  totalAnomaliesDetected: number;
  autoRemediatedCount: number;
  autoRemediatedPercentage: number;
  manualHoursSaved: number;
  circuitBreakerStatus: "HEALTHY" | "DEGRADED" | "PAUSED";
  activeWorkflowCount: number;
  lastEvaluatedAt: string;
}

export class SelfHealingHealthService {
  /**
   * Compute self-healing system metrics and circuit breaker status for an institution
   */
  static async getSystemHealth(institutionId?: string): Promise<SelfHealingMetrics> {
    const isTripped = institutionId
      ? AutonomousRemediationEngine.isCircuitBreakerTripped(institutionId)
      : false;

    const circuitBreakerStatus = isTripped ? "PAUSED" : "HEALTHY";

    // Query ticket count metrics
    const tickets = await db
      .select({
        total: sql<number>`count(*)`,
        autoCreated: sql<number>`sum(case when ${remediationTickets.autoCreated} = 1 then 1 else 0 end)`,
      })
      .from(remediationTickets)
      .where(institutionId ? eq(remediationTickets.institutionId, institutionId) : undefined);

    const totalAnomaliesDetected = Number(tickets[0]?.total || 0);
    const autoRemediatedCount = Number(tickets[0]?.autoCreated || 0);
    const autoRemediatedPercentage =
      totalAnomaliesDetected > 0
        ? Math.round((autoRemediatedCount / totalAnomaliesDetected) * 100)
        : 100;

    // Estimate manual hours saved (0.75 hours per auto-remediated ticket)
    const manualHoursSaved = Math.round(autoRemediatedCount * 0.75 * 10) / 10;

    const workflows = await db
      .select({ count: sql<number>`count(*)` })
      .from(autonomousWorkflows)
      .where(
        institutionId
          ? eq(autonomousWorkflows.institutionId, institutionId)
          : eq(autonomousWorkflows.status, "active")
      );

    const activeWorkflowCount = Number(workflows[0]?.count || 0);

    return {
      totalAnomaliesDetected,
      autoRemediatedCount,
      autoRemediatedPercentage,
      manualHoursSaved,
      circuitBreakerStatus,
      activeWorkflowCount,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }
}
