import { db } from "../../db";
import { remediationHistory } from "../../db/schema";
import { eq } from "drizzle-orm";
import { RemediationEngine } from "./remediation-engine";
import { EventBus } from "../observability/event-bus";

export class ApprovalGateway {
  private static instance: ApprovalGateway;

  private constructor() {}

  static getInstance(): ApprovalGateway {
    if (!ApprovalGateway.instance) {
      ApprovalGateway.instance = new ApprovalGateway();
    }
    return ApprovalGateway.instance;
  }

  async approveAction(workflowId: string, approvalKey: string): Promise<boolean> {
    try {
      const records = await db
        .select()
        .from(remediationHistory)
        .where(eq(remediationHistory.id, workflowId))
        .all();

      const workflow = records[0];
      if (!workflow) {
        throw new Error("Remediation workflow not found");
      }

      if (workflow.approvalStatus !== "pending") {
        throw new Error("Action is not in pending approval state");
      }

      if (workflow.approvalKey !== approvalKey) {
        throw new Error("Invalid approval key");
      }

      await db
        .update(remediationHistory)
        .set({ approvalStatus: "approved" })
        .where(eq(remediationHistory.id, workflowId))
        .run();

      EventBus.getInstance().publishEvent({
        eventSource: "approval-gateway",
        severity: "info",
        message: `Remediation action approved for workflow ${workflowId}`
      });

      const engine = RemediationEngine.getInstance();
      const targetResource = workflow.actionTriggered === "database-healer" || workflow.actionTriggered === "pool-healer"
        ? "database_pool"
        : "stream_socket";

      engine.enqueue(targetResource, () => engine.executeRemediation({
        ...workflow,
        approvalStatus: "approved"
      } as any));

      return true;
    } catch (err: any) {
      console.error("[ApprovalGateway] Failed to approve:", err);
      throw err;
    }
  }

  async rejectAction(workflowId: string, approvalKey: string): Promise<boolean> {
    try {
      const records = await db
        .select()
        .from(remediationHistory)
        .where(eq(remediationHistory.id, workflowId))
        .all();

      const workflow = records[0];
      if (!workflow) {
        throw new Error("Remediation workflow not found");
      }

      if (workflow.approvalStatus !== "pending") {
        throw new Error("Action is not in pending approval state");
      }

      if (workflow.approvalKey !== approvalKey) {
        throw new Error("Invalid approval key");
      }

      await db
        .update(remediationHistory)
        .set({ approvalStatus: "rejected", outcome: "failed" })
        .where(eq(remediationHistory.id, workflowId))
        .run();

      EventBus.getInstance().publishEvent({
        eventSource: "approval-gateway",
        severity: "info",
        message: `Remediation action rejected for workflow ${workflowId}`
      });

      return true;
    } catch (err: any) {
      console.error("[ApprovalGateway] Failed to reject:", err);
      throw err;
    }
  }
}
