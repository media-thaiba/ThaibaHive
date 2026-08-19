import { db } from "@thaiba/db";
import { aiModels } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { AgentMessageBus } from "../agents/core/message-bus";
import { AgentStateStore } from "../agents/core/state-store";

export class ModelPromoter {
  private agentId = "agent-promoter";
  private bus = AgentMessageBus.getInstance();
  private stateStore = AgentStateStore.getInstance();
  private toleranceBuffer = 0.02; // Candidate must exceed prod by 2%

  constructor() {}

  public async evaluateAndPromote(
    productionModelId: string,
    candidateModelId: string,
    prodAccuracy: number,
    candidateAccuracy: number
  ): Promise<boolean> {
    await this.stateStore.saveAgent(this.agentId, "model-promoter", "1.0.0", "active");

    const prodModel = await db.select().from(aiModels).where(eq(aiModels.id, productionModelId)).get();
    const candidateModel = await db.select().from(aiModels).where(eq(aiModels.id, candidateModelId)).get();

    if (!prodModel || !candidateModel) {
      await this.stateStore.log(this.agentId, "error", "Production or candidate model not found. Promotion aborted.");
      return false;
    }

    await this.stateStore.log(
      this.agentId,
      "info",
      `Evaluating promotion. Prod accuracy: ${(prodAccuracy * 100).toFixed(1)}%, Candidate accuracy: ${(candidateAccuracy * 100).toFixed(1)}%.`
    );

    // Promotion condition: candidate accuracy must be greater than prod accuracy + tolerance buffer
    if (candidateAccuracy > prodAccuracy + this.toleranceBuffer) {
      await this.stateStore.log(
        this.agentId,
        "info",
        `Promotion threshold met! Candidate exceeds production by ${(candidateAccuracy - prodAccuracy).toFixed(3)}. Promoting candidate v${candidateModel.version}.`
      );

      await this.stateStore.updateStatus(this.agentId, "remediating");

      // Transactional updates of active flags
      await db
        .update(aiModels)
        .set({ isActive: false })
        .where(eq(aiModels.id, productionModelId))
        .run();

      await db
        .update(aiModels)
        .set({ isActive: true })
        .where(eq(aiModels.id, candidateModelId))
        .run();

      await this.stateStore.logDecision(
        this.agentId,
        candidateModelId,
        "high",
        `Promoted candidate model ${candidateModel.version} to active production`,
        "success",
        JSON.stringify({ demotedId: productionModelId, promotedId: candidateModelId, prevAccuracy: prodAccuracy, nextAccuracy: candidateAccuracy })
      );

      this.bus.publish(
        this.agentId,
        "*",
        "ml:model:promoted",
        {
          demotedModelId: productionModelId,
          promotedModelId: candidateModelId,
          version: candidateModel.version,
        },
        "normal"
      );

      await this.stateStore.updateStatus(this.agentId, "idle");
      return true;
    } else {
      await this.stateStore.log(
        this.agentId,
        "info",
        `Candidate model v${candidateModel.version} did not meet promotion threshold (needs > ${(prodAccuracy + this.toleranceBuffer).toFixed(2)}).`
      );
      await this.stateStore.updateStatus(this.agentId, "idle");
      return false;
    }
  }

  public async rollback(
    activeModelId: string,
    previousModelId: string,
    currentAccuracy: number
  ): Promise<boolean> {
    await this.stateStore.saveAgent(this.agentId, "model-promoter", "1.0.0", "active");

    const activeModel = await db.select().from(aiModels).where(eq(aiModels.id, activeModelId)).get();
    const previousModel = await db.select().from(aiModels).where(eq(aiModels.id, previousModelId)).get();

    if (!activeModel || !previousModel) {
      await this.stateStore.log(this.agentId, "error", "Active or rollback-target model not found. Rollback aborted.");
      return false;
    }

    // Rollback threshold check (e.g. accuracy drops below 50%)
    if (currentAccuracy < 0.50) {
      await this.stateStore.log(
        this.agentId,
        "error",
        `Sanity check failed! Model v${activeModel.version} accuracy dropped to ${(currentAccuracy * 100).toFixed(1)}%. Triggering rollback to v${previousModel.version}.`
      );

      await this.stateStore.updateStatus(this.agentId, "remediating");

      // Revert active flags
      await db
        .update(aiModels)
        .set({ isActive: false })
        .where(eq(aiModels.id, activeModelId))
        .run();

      await db
        .update(aiModels)
        .set({ isActive: true })
        .where(eq(aiModels.id, previousModelId))
        .run();

      await this.stateStore.logDecision(
        this.agentId,
        activeModelId,
        "critical",
        `Rollback active model ${activeModel.version} to previous ${previousModel.version} due to accuracy drop`,
        "success",
        JSON.stringify({ demotedId: activeModelId, restoredId: previousModelId, accuracyDropped: currentAccuracy })
      );

      this.bus.publish(
        this.agentId,
        "*",
        "ml:model:rolledback",
        {
          demotedModelId: activeModelId,
          restoredModelId: previousModelId,
        },
        "high"
      );

      await this.stateStore.updateStatus(this.agentId, "idle");
      return true;
    }

    await this.stateStore.updateStatus(this.agentId, "idle");
    return false;
  }
}
