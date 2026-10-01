import { academicTools } from "../tools/adapters/academic-tools";
import { financeTools } from "../tools/adapters/finance-tools";
import { securityTools } from "../tools/adapters/security-tools";
import { facilitiesTools } from "../tools/adapters/facilities-tools";
import { hrTools } from "../tools/adapters/hr-tools";
import { validateToolContract } from "../tools/contract";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";

describe("Domain Tool Adapters & Saga Compensators (AIG-006, AIG-010, AIG-011)", () => {
  let registry: ToolRegistry;
  let executor: ToolExecutor;
  let store: AgentDbStore;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();

    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    executor = new ToolExecutor({ registry, store });

    // Register all tools across 5 staged domains
    [...academicTools, ...financeTools, ...securityTools, ...facilitiesTools, ...hrTools].forEach((t) =>
      registry.registerTool(t)
    );
  });

  it("validates contracts and compensator declarations on all domain tools across all 5 staged domains", () => {
    const allTools = [...academicTools, ...financeTools, ...securityTools, ...facilitiesTools, ...hrTools];
    expect(allTools.length).toBeGreaterThanOrEqual(16);

    for (const tool of allTools) {
      const validation = validateToolContract(tool);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    }
  });

  it("executes academic tools and tests compensator behavior", async () => {
    const tenant = {
      institutionId: "inst_alpha",
      userId: "u1",
      userRole: "admin",
      permissions: ["*"],
    };

    const res = await executor.executeTool(
      "academic-agent",
      "academic.attendance.reconcile",
      { sectionId: "sec-10A", date: "2026-10-01" },
      tenant
    );

    expect(res.status).toBe("success");
    expect(res.output.status).toBe("reconciled");

    const tool = registry.getTool("academic.attendance.reconcile");
    const compRes = await tool?.compensate!({ sectionId: "sec-10A", date: "2026-10-01" }, res.output, {
      tenant,
      toolName: "academic.attendance.reconcile",
      invokedAt: new Date().toISOString(),
    });

    expect(compRes?.success).toBe(true);
  });

  it("executes finance tools with 3-way reconciliation output", async () => {
    const tenant = {
      institutionId: "inst_alpha",
      userId: "u1",
      userRole: "accounts",
      permissions: ["agent:workflows:approve", "agent:workflows:view"],
    };

    const res = await executor.executeTool(
      "finance-agent",
      "finance.fees.reconcile",
      { termId: "term_fall_2026" },
      tenant
    );

    expect(res.status).toBe("success");
    expect(res.output.reconciledTransactions).toBe(142);
  });

  it("executes security lockdown escalation with mandatory physical confirmation flags", async () => {
    const tenant = {
      institutionId: "inst_alpha",
      userId: "u1",
      userRole: "admin",
      permissions: ["agent:workflows:approve"],
    };

    const res = await executor.executeTool(
      "security-agent",
      "security.lockdown.escalate",
      { zoneId: "zone_north", reason: "Intrusion detected", lockdownType: "building_specific" },
      tenant
    );

    expect(res.status).toBe("success");
    expect(res.output.requiresPhysicalConfirmation).toBe(true);
  });
});
