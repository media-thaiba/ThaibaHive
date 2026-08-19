import { AgentSwarmOrchestrator, AgentDefinition } from "../agent-swarm-orchestrator";

describe("Sprint-011 Multi-Agent Swarm Orchestrator", () => {
  let orchestrator: AgentSwarmOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentSwarmOrchestrator();
  });

  it("registers and retrieves agent definitions", async () => {
    const agent: AgentDefinition = {
      id: "agent_academic_101",
      tenantId: "inst_101",
      agentType: "academic_advisor",
      domain: "academics",
      name: "Academic Advisor AI",
      capabilities: ["student_interventions", "grade_trajectories"],
      isActive: true,
    };

    await orchestrator.registerAgent(agent);
    const fetched = await orchestrator.getAgent("agent_academic_101");
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("Academic Advisor AI");
  });

  it("dispatches inter-agent messages cleanly with hop tracking", async () => {
    const result = await orchestrator.dispatchInterAgentMessage({
      tenantId: "inst_101",
      correlationId: "corr_9901",
      senderAgentId: "agent_financial_101",
      recipientAgentId: "agent_academic_101",
      messageType: "REQUEST_STUDENT_RISK_SUMMARY",
      payload: { cohort: "Grade 10" },
      hopCount: 1,
    });

    expect(result.success).toBe(true);
    expect(result.hopCount).toBe(1);
  });

  it("blocks circular inter-agent messages exceeding max hop limit (hop > 3)", async () => {
    const result = await orchestrator.dispatchInterAgentMessage({
      tenantId: "inst_101",
      correlationId: "corr_9901",
      senderAgentId: "agent_financial_101",
      recipientAgentId: "agent_academic_101",
      messageType: "REQUEST_STUDENT_RISK_SUMMARY",
      payload: { cohort: "Grade 10" },
      hopCount: 4,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Max inter-agent hop limit exceeded");
  });
});
