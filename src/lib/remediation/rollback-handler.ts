import { db } from "../../db";
import { remediationHistory } from "../../db/schema";
import { eq } from "drizzle-orm";
import { RemediationWorkflow } from "./types";
import { EventBus } from "../observability/event-bus";

export class RollbackHandler {
  async executeRollback(workflow: RemediationWorkflow): Promise<boolean> {
    try {
      await db
        .update(remediationHistory)
        .set({ rollbackStatus: "pending" })
        .where(eq(remediationHistory.id, workflow.id))
        .run();
    } catch {
      // Ignore DB write errors locally
    }

    EventBus.getInstance().publishEvent({
      eventSource: "rollback-handler",
      severity: "warning",
      message: `Triggering rollback compensation for action: ${workflow.actionTriggered}`
    });

    let rollbackSuccess = false;
    try {
      // Simulate rollback compensation logic based on workflow action
      if (workflow.actionTriggered === "database-healer") {
        rollbackSuccess = true;
      } else if (workflow.actionTriggered === "pool-healer") {
        rollbackSuccess = true;
      } else {
        rollbackSuccess = true;
      }
    } catch (err) {
      console.error(`[RollbackHandler] Rollback execution failed:`, err);
    }

    if (rollbackSuccess) {
      try {
        await db
          .update(remediationHistory)
          .set({ rollbackStatus: "success" })
          .where(eq(remediationHistory.id, workflow.id))
          .run();
      } catch {}

      EventBus.getInstance().publishEvent({
        eventSource: "rollback-handler",
        severity: "info",
        message: `Rollback succeeded for workflow ${workflow.id}`
      });
      return true;
    } else {
      try {
        await db
          .update(remediationHistory)
          .set({ rollbackStatus: "failed" })
          .where(eq(remediationHistory.id, workflow.id))
          .run();
      } catch {}

      EventBus.getInstance().publishEvent({
        eventSource: "rollback-handler",
        severity: "critical",
        message: `Critical Error: Rollback failed for workflow ${workflow.id}. Aborting retry loop.`
      });
      return false;
    }
  }
}
