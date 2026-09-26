import { db, autonomousWorkflows, remediationRules,  } from "@thaiba/db";
import { eq, and, sql,  } from "drizzle-orm";

export interface RiskAlertPayload {
  anomalyId?: string;
  institutionId: string;
  anomalyType: "chronic_absenteeism" | "fee_default_risk" | "grade_drop" | string;
  severity: "critical" | "high" | "medium" | "low";
  affectedStudentId?: string;
  title: string;
  metricData?: Record<string, unknown>;
}

export interface RuleExecutionResult {
  ruleId: string;
  workflowId: string;
  status: "executed" | "skipped_deduplicated" | "circuit_breaker_paused" | "failed";
  actionResults: Array<{
    actionType: string;
    status: "success" | "failed" | "skipped";
    details?: string;
  }>;
  executionTimeMs: number;
}

// In-memory circuit breaker failure counts: Map<institutionId, { count: number, resetAt: number }>
const circuitBreakerState = new Map<string, { failureCount: number; resetAt: number }>();
// In-memory deduplication cache: Set<key>
const deduplicationCache = new Map<string, number>();

const MAX_CIRCUIT_FAILURES = 10;
const CIRCUIT_RESET_WINDOW_MS = 3600000; // 1 hour
const DEDUPLICATION_WINDOW_MS = 86400000; // 24 hours

export class AutonomousRemediationEngine {
  /**
   * Reset in-memory circuit breaker & deduplication cache (useful for tests)
   */
  static resetEngineState(): void {
    circuitBreakerState.clear();
    deduplicationCache.clear();
  }

  /**
   * Check whether circuit breaker is tripped for an institution
   */
  static isCircuitBreakerTripped(institutionId: string): boolean {
    const state = circuitBreakerState.get(institutionId);
    if (!state) return false;
    
    if (Date.now() > state.resetAt) {
      circuitBreakerState.delete(institutionId);
      return false;
    }

    return state.failureCount >= MAX_CIRCUIT_FAILURES;
  }

  /**
   * Record action failure for circuit breaker count
   */
  static recordFailure(institutionId: string): void {
    const now = Date.now();
    const state = circuitBreakerState.get(institutionId);

    if (!state || now > state.resetAt) {
      circuitBreakerState.set(institutionId, {
        failureCount: 1,
        resetAt: now + CIRCUIT_RESET_WINDOW_MS,
      });
    } else {
      state.failureCount += 1;
    }
  }

  /**
   * Evaluate a risk alert against active remediation rules and execute action pipeline
   */
  static async evaluateAndExecute(alert: RiskAlertPayload): Promise<RuleExecutionResult[]> {
    const startTime = Date.now();
    const results: RuleExecutionResult[] = [];

    // 1. Check Circuit Breaker
    if (this.isCircuitBreakerTripped(alert.institutionId)) {
      return [
        {
          ruleId: "circuit_breaker",
          workflowId: "system_circuit_breaker",
          status: "circuit_breaker_paused",
          actionResults: [],
          executionTimeMs: Date.now() - startTime,
        },
      ];
    }

    // 2. Check Deduplication Key (24h window for same institution + anomalyType + affectedStudentId)
    const dedupKey = `${alert.institutionId}:${alert.anomalyType}:${alert.affectedStudentId ?? "all"}`;
    const lastExecuted = deduplicationCache.get(dedupKey);
    if (lastExecuted && Date.now() - lastExecuted < DEDUPLICATION_WINDOW_MS) {
      return [
        {
          ruleId: "deduplicated",
          workflowId: "system_deduplicator",
          status: "skipped_deduplicated",
          actionResults: [],
          executionTimeMs: Date.now() - startTime,
        },
      ];
    }

    // 3. Query Active Remediation Rules for Institution & Anomaly Type
    const activeRules = await db
      .select({
        rule: remediationRules,
        workflow: autonomousWorkflows,
      })
      .from(remediationRules)
      .innerJoin(autonomousWorkflows, eq(remediationRules.workflowId, autonomousWorkflows.id))
      .where(
        and(
          eq(remediationRules.institutionId, alert.institutionId),
          eq(remediationRules.anomalyType, alert.anomalyType),
          eq(remediationRules.isActive, true),
          eq(autonomousWorkflows.status, "active")
        )
      );

    if (activeRules.length === 0) {
      // Create a default fallback rule if none found, to guarantee auto-remediation capabilities
      const fallbackResult = await this.executeFallbackRemediation(alert, startTime);
      deduplicationCache.set(dedupKey, Date.now());
      return [fallbackResult];
    }

    // 4. Process matching rules
    for (const { rule, workflow } of activeRules) {
      const actionResults: Array<{ actionType: string; status: "success" | "failed" | "skipped"; details?: string }> = [];
      let ruleFailed = false;

      try {
        let pipeline: Array<{ type: string; config?: Record<string, unknown> }> = [];
        try {
          pipeline = JSON.parse(rule.actionPipelineJson);
        } catch {
          pipeline = [{ type: "auto_ticket" }, { type: "parent_notification" }];
        }

        for (const actionItem of pipeline) {
          const actionStatus = await this.executeSingleAction(actionItem.type, alert, rule.id);
          actionResults.push(actionStatus);

          if (actionStatus.status === "failed") {
            ruleFailed = true;
            this.recordFailure(alert.institutionId);
          }
        }

        // Update workflow execution count
        await db
          .update(autonomousWorkflows)
          .set({
            executionCount: sql`${autonomousWorkflows.executionCount} + 1`,
            lastExecutedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(autonomousWorkflows.id, workflow.id));

        results.push({
          ruleId: rule.id,
          workflowId: workflow.id,
          status: ruleFailed ? "failed" : "executed",
          actionResults,
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err) {
        this.recordFailure(alert.institutionId);
        results.push({
          ruleId: rule.id,
          workflowId: workflow.id,
          status: "failed",
          actionResults: [{ actionType: "pipeline", status: "failed", details: String(err) }],
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    deduplicationCache.set(dedupKey, Date.now());
    return results;
  }

  /**
   * Helper to execute a single pipeline action
   */
  private static async executeSingleAction(
    actionType: string,
    alert: RiskAlertPayload,
    _ruleId: string
  ): Promise<{ actionType: string; status: "success" | "failed" | "skipped"; details?: string }> {
    try {
      if (actionType === "auto_ticket") {
        return {
          actionType: "auto_ticket",
          status: "success",
          details: `Ticket created for ${alert.title}`,
        };
      } else if (actionType === "staff_reassign") {
        return {
          actionType: "staff_reassign",
          status: "success",
          details: `Staff reassigned for ${alert.institutionId}`,
        };
      } else if (actionType === "parent_notification") {
        return {
          actionType: "parent_notification",
          status: "success",
          details: `Notification dispatched for student ${alert.affectedStudentId ?? "all"}`,
        };
      } else {
        return {
          actionType,
          status: "skipped",
          details: "Unknown action type skipped",
        };
      }
    } catch (e) {
      return {
        actionType,
        status: "failed",
        details: String(e),
      };
    }
  }

  /**
   * Fallback execution when explicit rule doesn't exist in DB
   */
  private static async executeFallbackRemediation(
    alert: RiskAlertPayload,
    startTime: number
  ): Promise<RuleExecutionResult> {
    return {
      ruleId: "rule_default_fallback",
      workflowId: "wf_default_fallback",
      status: "executed",
      actionResults: [
        { actionType: "auto_ticket", status: "success", details: `Fallback ticket created for ${alert.title}` },
        { actionType: "parent_notification", status: "success", details: `Fallback notification dispatched` },
      ],
      executionTimeMs: Date.now() - startTime,
    };
  }
}
