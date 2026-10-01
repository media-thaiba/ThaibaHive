import { FacilitiesAgent } from "../domain/facilities-agent";
import { StubReasoningPort } from "../orchestrator/reasoning-port";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { facilitiesTools } from "../tools/adapters/facilities-tools";

describe("FacilitiesAgent Domain Implementation Suite (AIG-010)", () => {
  let agent: FacilitiesAgent;
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
    facilitiesTools.forEach((t) => registry.registerTool(t));

    stubPort = new StubReasoningPort();
    agent = new FacilitiesAgent({
      reasoningPort: stubPort,
      executor,
      registry,
    });
  });

  it("plans and executes HVAC setback optimization for idle zones", async () => {
    stubPort.setMockHandler(async (req) => {
      if (req.prompt.includes("Prior steps: []")) {
        return {
          content: "Telemetry shows idle auditorium consuming high power. Adjusting HVAC setpoint.",
          toolCalls: [
            {
              id: "call_hvac_1",
              name: "facilities.hvac.optimize_schedule",
              arguments: { zoneId: "Auditorium_B", targetSetpointC: 26.5, setbackMode: true },
            },
          ],
          provider: "stub",
          model: "stub-model",
        };
      }
      return {
        content: "HVAC setpoint successfully adjusted. Estimated 24.5 kWh saved.",
        toolCalls: [],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_facilities_admin",
        userRole: "admin",
        permissions: ["*"],
      },
      goal: "Optimize HVAC setpoints for unoccupied campus zones",
    });

    expect(result.status).toBe("success");
    expect(result.domain).toBe("facilities");
    expect(result.steps.length).toBe(2);
    expect(result.steps[0].toolCall?.name).toBe("facilities.hvac.optimize_schedule");
    expect(result.steps[0].toolResult.status).toBe("optimized");
  });

  it("dispatches maintenance work order on detected electrical anomaly", async () => {
    stubPort.setMockHandler(async (req) => {
      if (req.prompt.includes("Prior steps: []")) {
        return {
          content: "Creating high priority electrical work order for Science Wing 3.",
          toolCalls: [
            {
              id: "call_wo_1",
              name: "facilities.work_orders.create",
              arguments: {
                location: "Science_Block_Wing_3",
                issueCategory: "electrical",
                priority: "high",
                description: "Substation panel fluctuation",
              },
            },
          ],
          provider: "stub",
          model: "stub-model",
        };
      }
      return {
        content: "Work order dispatched to electrical team.",
        toolCalls: [],
        provider: "stub",
        model: "stub-model",
      };
    });

    const result = await agent.run({
      tenant: {
        institutionId: "inst_alpha",
        userId: "user_facilities_admin",
        userRole: "admin",
        permissions: ["*"],
      },
      goal: "Dispatch work order for Science Wing 3 power spike",
    });

    expect(result.status).toBe("success");
    expect(result.steps[0].toolCall?.name).toBe("facilities.work_orders.create");
    expect(result.steps[0].toolResult.status).toBe("dispatched");
  });
});
