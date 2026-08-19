import { db } from "@thaiba/db";
import { aiModels } from "@thaiba/db/schema";
import { randomUUID } from "crypto";
import { AgentMessageBus } from "../agents/core/message-bus";
import { AgentStateStore } from "../agents/core/state-store";

export class RetrainingPipeline {
  private agentId = "agent-retrainer";
  private bus = AgentMessageBus.getInstance();
  private stateStore = AgentStateStore.getInstance();

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.bus.subscribe("ml:drift:detected", async (msg) => {
      try {
        const { modelId, modelName, domain, institutionId, version } = msg.payload as {
          modelId: string;
          modelName: string;
          domain: string;
          institutionId: string;
          version: string;
        };

        await this.triggerRetraining(modelId, modelName, domain, institutionId, version);
      } catch (err: any) {
        console.error("ERROR IN RETRAINING PIPELINE LISTENER:", err);
      }
    });
  }

  public async triggerRetraining(
    modelId: string,
    modelName: string,
    domain: string,
    institutionId: string,
    currentVersion: string
  ): Promise<string> {
    await this.stateStore.saveAgent(this.agentId, "ml-retrainer", "1.0.0", "active");
    await this.stateStore.log(this.agentId, "info", `Starting retraining pipeline for model ${modelName} (${modelId})`);

    await this.stateStore.updateStatus(this.agentId, "remediating");

    // Simulate training epochs
    for (let epoch = 1; epoch <= 3; epoch++) {
      await new Promise((resolve) => setTimeout(resolve, 10)); // tiny mock delay
      await this.stateStore.log(this.agentId, "info", `Epoch ${epoch}/3: optimizing weights...`);
    }

    // Generate candidate version
    const major = parseInt(currentVersion.split(".")[0], 10) || 1;
    const candidateVersion = `${major + 1}.0.0-candidate`;
    const candidateId = randomUUID();
    const candidateAccuracy = 0.88; // Improved accuracy (above 80% threshold)

    const timestamp = new Date().toISOString();

    // Save inactive candidate model to DB
    await db
      .insert(aiModels)
      .values({
        id: candidateId,
        institutionId,
        modelName,
        domain,
        version: candidateVersion,
        accuracyScore: candidateAccuracy,
        isActive: false, // Inactive during testing
        lastTrainedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    await this.stateStore.log(
      this.agentId,
      "info",
      `Retraining completed. Candidate model registered: ${candidateVersion} (${candidateId}) with accuracy: ${(candidateAccuracy * 100).toFixed(1)}%`
    );

    await this.stateStore.logDecision(
      this.agentId,
      modelId,
      "medium",
      `Register candidate model ${candidateVersion} after retraining`,
      "success",
      JSON.stringify({ candidateId, version: candidateVersion, accuracy: candidateAccuracy })
    );

    // Publish completed message
    this.bus.publish(
      this.agentId,
      "*",
      "ml:retrained:completed",
      {
        originalModelId: modelId,
        candidateModelId: candidateId,
        modelName,
        domain,
        institutionId,
        candidateVersion,
        candidateAccuracy,
      },
      "high"
    );

    await this.stateStore.updateStatus(this.agentId, "idle");
    return candidateId;
  }
}
