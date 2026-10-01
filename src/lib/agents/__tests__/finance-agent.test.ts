import { FinanceAgent } from "../domain/finance-agent";
import { StubReasoningPort } from "../orchestrator/reasoning-port";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { financeTools } from "../tools/adapters/finance-tools";

describe("FinanceAgent Domain Implementation Suite (AIG-008)", () => {
  let agent: FinanceAgent;
  let registry: ToolRegistry;
  let executor: ToolExecutor;
  let store: AgentDbStore;
  let stubPort: StubReasoningPort;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();

    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    executor = new ToolExecutor({ registry, store });
    financeTools.forEach((t) => registry.registerTool(t));

    stubPort = new StubReasoningPort();
    agent = new FinanceAgent({
      reasoningPort: stubPort,
      executor,
      registry,
    });
  });

  it("identifies high-risk fee reconciliation and pauses for HITL approval", async () => {
    stubPort.setMockHandler(async () => {
      return {
        content: "Need to execute 3-way fee reconciliation",
        toolCalls: [
          {
            id: "call_fin_1",
            name: "finance.fees.reconcile",
            arguments: { termId: "fall_2026" },
          },
        ],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_accounts",
        userRole: "accounts",
        permissions: ["agent:workflows:approve"],
      },
      goal: "Reconcile Fall 2026 tuition fee ledgers",
    });

    expect(result.status).toBe("requires_approval");
    expect(result.requiresApproval?.toolName).toBe("finance.fees.reconcile");
    expect(result.requiresApproval?.severity).toBe("high");
  });
});
