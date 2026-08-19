import { db } from "../../db";
import { remediationHistory } from "../../db/schema";
import { eq } from "drizzle-orm";
import { RemediationWorkflow } from "./types";
import { EventBus } from "../observability/event-bus";
import { HealerConnector } from "./healer-connector";
import { RollbackHandler } from "./rollback-handler";

export class RemediationEngine {
  private static instance: RemediationEngine;
  private queues = new Map<string, Promise<any>>();
  private healerConnector = new HealerConnector();
  private rollbackHandler = new RollbackHandler();

  private constructor() {}

  static getInstance(): RemediationEngine {
    if (!RemediationEngine.instance) {
      RemediationEngine.instance = new RemediationEngine();
    }
    return RemediationEngine.instance;
  }

  enqueue(resourceId: string, task: () => Promise<any>): Promise<any> {
    const currentQueue = this.queues.get(resourceId) || Promise.resolve();
    const nextQueue = currentQueue.then(async () => {
      try {
        await task();
      } catch (err) {
        console.error(`[RemediationEngine] Error executing task on ${resourceId}:`, err);
      }
    });
    this.queues.set(resourceId, nextQueue);
    return nextQueue;
  }

  async handleComplianceFinding(finding: {
    id: string;
    framework: string;
    ruleName: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    institutionId: string;
  }): Promise<RemediationWorkflow | null> {
    let actionTriggered = "";
    let targetResource = "system_default";

    if (finding.ruleName.includes("DB") || finding.ruleName.includes("DATA")) {
      actionTriggered = "database-healer";
      targetResource = "database_pool";
    } else if (finding.ruleName.includes("POOL") || finding.ruleName.includes("CONNECTION")) {
      actionTriggered = "pool-healer";
      targetResource = "database_pool";
    } else if (finding.ruleName.includes("STREAM") || finding.ruleName.includes("SSE")) {
      actionTriggered = "stream-healer";
      targetResource = "stream_socket";
    } else {
      actionTriggered = "edge-healer";
      targetResource = "edge_replica";
    }

    const workflowId = "rem_" + Math.random().toString(36).substring(2, 15);
    const requiresApproval = finding.severity === "critical" || finding.severity === "high";

    const workflow: RemediationWorkflow = {
      id: workflowId,
      complianceFindingId: finding.id,
      actionTriggered,
      approvalKey: requiresApproval ? "app_" + Math.random().toString(36).substring(2, 15) : undefined,
      approvalStatus: requiresApproval ? "pending" : "none",
      outcome: "pending",
      rollbackStatus: "none",
      createdAt: new Date().toISOString(),
      institutionId: finding.institutionId,
    };

    try {
      await db.insert(remediationHistory).values(workflow).run();
      const mappedSeverity = finding.severity === "high" ? ("error" as const) : finding.severity === "medium" ? ("warning" as const) : finding.severity === "low" ? ("info" as const) : ("critical" as const);
      EventBus.getInstance().publishEvent({
        eventSource: "remediation-engine",
        severity: mappedSeverity,
        message: `Remediation workflow ${workflowId} initialized for finding ${finding.id}. Status: ${workflow.approvalStatus}`
      });
    } catch (err) {
      console.error("[RemediationEngine] DB write error:", err);
    }

    if (!requiresApproval) {
      this.enqueue(targetResource, () => this.executeRemediation(workflow));
    }

    return workflow;
  }

  async executeRemediation(workflow: RemediationWorkflow): Promise<boolean> {
    EventBus.getInstance().publishEvent({
      eventSource: "remediation-engine",
      severity: "info",
      message: `Executing remediation action: ${workflow.actionTriggered}`
    });

    let success = false;
    try {
      success = await this.healerConnector.executeHealer(workflow.actionTriggered);
    } catch (err) {
      console.error(`[RemediationEngine] Healer connector failed:`, err);
    }

    if (success) {
      try {
        await db
          .update(remediationHistory)
          .set({ outcome: "success" })
          .where(eq(remediationHistory.id, workflow.id))
          .run();
      } catch (err) {}
      
      EventBus.getInstance().publishEvent({
        eventSource: "remediation-engine",
        severity: "info",
        message: `Remediation action ${workflow.actionTriggered} succeeded.`
      });
      return true;
    } else {
      try {
        await db
          .update(remediationHistory)
          .set({ outcome: "failed" })
          .where(eq(remediationHistory.id, workflow.id))
          .run();
      } catch (err) {}

      EventBus.getInstance().publishEvent({
        eventSource: "remediation-engine",
        severity: "critical",
        message: `Remediation action ${workflow.actionTriggered} failed. Rolling back...`
      });
      
      await this.rollbackHandler.executeRollback(workflow);
      return false;
    }
  }
}
