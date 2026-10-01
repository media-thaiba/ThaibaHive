import { HRAgent } from "../domain/hr-agent";
import { StubReasoningPort } from "../orchestrator/reasoning-port";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { hrTools } from "../tools/adapters/hr-tools";

describe("HRAgent Domain Implementation Suite (AIG-011)", () => {
  let agent: HRAgent;
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
    hrTools.forEach((t) => registry.registerTool(t));

    stubPort = new StubReasoningPort();
    agent = new HRAgent({
      reasoningPort: stubPort,
      executor,
      registry,
    });
  });

  it("provisions digital credentials and access badge for new faculty", async () => {
    stubPort.setMockHandler(async (req) => {
      if (req.prompt.includes("Prior steps: []")) {
        return {
          content: "Provisioning official email and badge for new faculty staff_108.",
          toolCalls: [
            {
              id: "call_prov_1",
              name: "hr.onboarding.provision_credentials",
              arguments: {
                staffId: "staff_108",
                officialEmail: "dr.sarah@thaiba.edu",
                assignedDepartment: "Computer Science",
                badgeNumber: "BADGE-CS-108",
              },
            },
          ],
          provider: "stub",
          model: "stub-model",
        };
      }
      return {
        content: "Faculty credentials successfully provisioned.",
        toolCalls: [],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_hr_manager",
        userRole: "admin",
        permissions: ["*"],
      },
      goal: "Onboard new CS faculty member Dr. Sarah",
    });

    expect(result.status).toBe("success");
    expect(result.domain).toBe("hr");
    expect(result.steps[0].toolCall?.name).toBe("hr.onboarding.provision_credentials");
    expect(result.steps[0].toolResult.badgeActive).toBe(true);
  });

  it("pauses for approval on high-risk leave balance adjustments", async () => {
    stubPort.setMockHandler(async () => {
      return {
        content: "Posting 10 days sabbatical leave approval for faculty staff_202.",
        toolCalls: [
          {
            id: "call_leave_1",
            name: "hr.leave.post_approval",
            arguments: {
              requestId: "lvr_99",
              staffId: "staff_202",
              days: 10,
              approved: true,
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
        userId: "user_hr_staff",
        userRole: "staff",
        permissions: ["agent:workflows:execute"],
      },
      goal: "Approve sabbatical request for staff_202",
    });

    expect(result.status).toBe("requires_approval");
    expect(result.requiresApproval?.toolName).toBe("hr.leave.post_approval");
    expect(result.requiresApproval?.severity).toBe("high");
  });
});
