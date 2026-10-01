import { SecurityAgent } from "../domain/security-agent";
import { StubReasoningPort } from "../orchestrator/reasoning-port";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { securityTools } from "../tools/adapters/security-tools";

describe("SecurityAgent Domain Implementation Suite (AIG-009)", () => {
  let agent: SecurityAgent;
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
    securityTools.forEach((t) => registry.registerTool(t));

    stubPort = new StubReasoningPort();
    agent = new SecurityAgent({
      reasoningPort: stubPort,
      executor,
      registry,
    });
  });

  it("handles alert triage and enforces critical approval gate on lockdown", async () => {
    stubPort.setMockHandler(async () => {
      return {
        content: "High-level perimeter intrusion detected. Escalating lockdown.",
        toolCalls: [
          {
            id: "call_sec_1",
            name: "security.lockdown.escalate",
            arguments: {
              zoneId: "zone_perimeter",
              reason: "Armed intrusion sensor triggered",
              lockdownType: "perimeter",
            },
          },
        ],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_sec",
        userRole: "admin",
        permissions: ["agent:workflows:approve"],
      },
      goal: "Respond to perimeter alert",
    });

    expect(result.status).toBe("requires_approval");
    expect(result.requiresApproval?.toolName).toBe("security.lockdown.escalate");
    expect(result.requiresApproval?.severity).toBe("critical");
  });
});
