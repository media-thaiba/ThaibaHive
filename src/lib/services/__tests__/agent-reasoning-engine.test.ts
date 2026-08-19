import { AgentReasoningEngine } from "../agent-reasoning-engine";

describe("Sprint-011 Contextual Reasoning Engine", () => {
  let engine: AgentReasoningEngine;

  beforeEach(() => {
    engine = new AgentReasoningEngine();
  });

  it("assigns AUTO_EXECUTE status when confidence score >= 0.85", async () => {
    const res = await engine.processReasoningAndGenerateRecommendation({
      tenantId: "inst_101",
      agentId: "agent_academic_101",
      domain: "academics",
      title: "High Math Score Improvement Plan",
      summary: "Peer tutoring recommended for Grade 10-A",
      confidenceScore: 0.92,
    });

    expect(res.humanApprovalStatus).toBe("AUTO_EXECUTE");
    expect(res.confidenceScore).toBe(0.92);
  });

  it("assigns REQUIRES_HUMAN_APPROVAL status when confidence score < 0.85", async () => {
    const res = await engine.processReasoningAndGenerateRecommendation({
      tenantId: "inst_101",
      agentId: "agent_financial_101",
      domain: "finance",
      title: "Budget Reallocation Alert",
      summary: "Reallocate unspent lab funds to transport pool",
      confidenceScore: 0.78,
    });

    expect(res.humanApprovalStatus).toBe("REQUIRES_HUMAN_APPROVAL");
  });

  it("updates human approval feedback cleanly", async () => {
    const feedback = await engine.recordHumanFeedback("inst_101", "rec_9901", "APPROVED", "Approved by Principal");
    expect(feedback.success).toBe(true);
    expect(feedback.updatedStatus).toBe("APPROVED");
  });
});
