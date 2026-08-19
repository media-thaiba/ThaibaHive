import { DriftDetector } from "../ml/drift-detector";
import { RetrainingPipeline } from "../ml/retraining-pipeline";
import { ABTestFramework } from "../ml/ab-test-framework";
import { ModelPromoter } from "../ml/model-promoter";
import { AgentMessageBus } from "../agents/core/message-bus";
import { AgentRegistry } from "../agents/core/registry";
import { db } from "@thaiba/db";
import { aiModels, institutions } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

describe("Predictive Model Auto-Tuning Pipeline Test Suite", () => {
  const modelId = "test-model-1";
  const institutionId = "inst-1";

  beforeEach(async () => {
    // Clear databases and listeners
    AgentMessageBus.getInstance().clear();
    AgentRegistry.getInstance().clear();
    await db.delete(aiModels).run();

    // Setup mock institution if not exists
    const inst = await db.select().from(institutions).where(eq(institutions.id, institutionId)).get();
    if (!inst) {
      await db
        .insert(institutions)
        .values({
          id: institutionId,
          name: "Test Academy",
          code: "TACT",
        })
        .run();
    }

    // Setup baseline production model
    await db
      .insert(aiModels)
      .values({
        id: modelId,
        institutionId,
        modelName: "attendance-forecast",
        domain: "attendance",
        version: "1.0.0",
        accuracyScore: 0.85,
        isActive: true,
        lastTrainedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  test("DriftDetector - trigger retraining pipeline on performance drop", async () => {
    const detector = new DriftDetector();
    const retrainer = new RetrainingPipeline(); // starts listener

    let driftDetected = false;
    let retrainCompleted = false;
    let candidateId = "";

    AgentMessageBus.getInstance().subscribe("ml:drift:detected", () => {
      driftDetected = true;
    });

    AgentMessageBus.getInstance().subscribe("ml:retrained:completed", (msg) => {
      retrainCompleted = true;
      candidateId = msg.payload.candidateModelId as string;
    });

    // Outcomes representing 30% error (14 correct, 6 wrong out of 20) -> should trigger drift (>20% error)
    const outcomes = [
      ...Array(14).fill({ predictionId: "p", predictedValue: "1", actualValue: "1" }),
      ...Array(6).fill({ predictionId: "p", predictedValue: "1", actualValue: "0" }),
    ];

    const result = await detector.checkDrift(modelId, outcomes);

    // Allow events to propagate through bus
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(result).toBe(true);
    expect(driftDetected).toBe(true);
    expect(retrainCompleted).toBe(true);
    expect(candidateId).toBeDefined();

    // Verify candidate was inserted as inactive in DB
    const candidate = await db.select().from(aiModels).where(eq(aiModels.id, candidateId)).get();
    expect(candidate).toBeDefined();
    expect(candidate?.isActive).toBe(false);
    expect(candidate?.version).toBe("2.0.0-candidate");
  });

  test("ABTestFramework - request splitting and telemetry evaluation", () => {
    const framework = new ABTestFramework();
    
    const prod = { id: "prod-1", version: "1.0.0" };
    const cand = { id: "cand-1", version: "2.0.0" };

    // Route 10 deterministic request IDs to test 50/50 split
    let prodCount = 0;
    let candCount = 0;

    for (let i = 0; i < 10; i++) {
      const route = framework.routePrediction(prod, cand, `request-id-${i}`);
      if (route.modelId === prod.id) prodCount++;
      if (route.modelId === cand.id) candCount++;
    }

    expect(prodCount).toBe(5);
    expect(candCount).toBe(5);

    // Record feedback and fetch accuracy
    framework.recordFeedback(prod.id, "1", "1"); // 100% accuracy
    framework.recordFeedback(prod.id, "0", "1"); // 50% accuracy

    framework.recordFeedback(cand.id, "1", "1"); // 100% accuracy

    expect(framework.getAccuracy(prod.id)).toBe(0.5);
    expect(framework.getAccuracy(cand.id)).toBe(1.0);
  });

  test("ModelPromoter - safe promotion tolerance buffers and rollback on failures", async () => {
    const promoter = new ModelPromoter();
    const candidateId = "candidate-model-1";

    await db
      .insert(aiModels)
      .values({
        id: candidateId,
        institutionId,
        modelName: "attendance-forecast",
        domain: "attendance",
        version: "2.0.0-candidate",
        accuracyScore: 0.88,
        isActive: false,
        lastTrainedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();

    // 1. Check promotion fails if candidate doesn't exceed prod + 2%
    // prod = 85%, candidate = 86% (difference is 1% < 2% threshold)
    const promoted1 = await promoter.evaluateAndPromote(modelId, candidateId, 0.85, 0.86);
    expect(promoted1).toBe(false);

    // 2. Check promotion succeeds if candidate is 88% (difference is 3% > 2% threshold)
    const promoted2 = await promoter.evaluateAndPromote(modelId, candidateId, 0.85, 0.88);
    expect(promoted2).toBe(true);

    const activeModel = await db.select().from(aiModels).where(eq(aiModels.isActive, true)).get();
    expect(activeModel?.id).toBe(candidateId);

    // 3. Rollback triggers if accuracy falls below 50% (sanity checks)
    const rolledBack = await promoter.rollback(candidateId, modelId, 0.45);
    expect(rolledBack).toBe(true);

    const activeModelAfterRollback = await db.select().from(aiModels).where(eq(aiModels.isActive, true)).get();
    expect(activeModelAfterRollback?.id).toBe(modelId);
  });
});
