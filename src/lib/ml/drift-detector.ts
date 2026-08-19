import { db } from "@thaiba/db";
import { aiModels } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { AgentMessageBus } from "../agents/core/message-bus";
import { AgentStateStore } from "../agents/core/state-store";

export interface PredictionOutcome {
  predictionId: string;
  predictedValue: string;
  actualValue: string;
}

export class DriftDetector {
  private agentId = "agent-drift-detector";
  private bus = AgentMessageBus.getInstance();
  private stateStore = AgentStateStore.getInstance();

  constructor() {}

  public async checkDrift(
    modelId: string,
    outcomes: PredictionOutcome[]
  ): Promise<boolean> {
    // Save status
    await this.stateStore.saveAgent(this.agentId, "drift-detector", "1.0.0", "active");

    const model = await db.select().from(aiModels).where(eq(aiModels.id, modelId)).get();
    if (!model) {
      await this.stateStore.log(this.agentId, "error", `Model ${modelId} not found in database.`);
      return false;
    }

    if (outcomes.length === 0) {
      return false;
    }

    // Calculate error rate
    let correctCount = 0;
    for (const outcome of outcomes) {
      if (outcome.predictedValue === outcome.actualValue) {
        correctCount++;
      }
    }

    const accuracy = correctCount / outcomes.length;
    const errorRate = 1 - accuracy;

    await this.stateStore.log(
      this.agentId,
      "info",
      `Model ${model.modelName} (v${model.version}) accuracy: ${(accuracy * 100).toFixed(1)}%, error rate: ${(errorRate * 100).toFixed(1)}%.`
    );

    // If error rate exceeds 20% (accuracy < 80%)
    if (errorRate > 0.20) {
      await this.stateStore.log(
        this.agentId,
        "warn",
        `Concept drift detected for model ${model.modelName} (v${model.version})! Error rate: ${(errorRate * 100).toFixed(1)}% exceeds 20% threshold.`
      );

      // Log decision
      await this.stateStore.logDecision(
        this.agentId,
        model.id,
        "high",
        `Concept drift detected on model ${model.modelName}. Error rate: ${errorRate.toFixed(2)}`,
        "success",
        JSON.stringify({ modelName: model.modelName, currentAccuracy: accuracy })
      );

      // Publish drift alert event
      this.bus.publish(
        this.agentId,
        "*",
        "ml:drift:detected",
        {
          modelId: model.id,
          modelName: model.modelName,
          domain: model.domain,
          institutionId: model.institutionId,
          version: model.version,
          currentAccuracy: accuracy,
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
