import { z } from "zod";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { AgentTool } from "../tools/contract";

describe("Tool Registry & Sandboxed Executor Suite (AIG-005)", () => {
  let registry: ToolRegistry;
  let executor: ToolExecutor;
  let store: AgentDbStore;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();

    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    executor = new ToolExecutor({ registry, store });
    executor.clearIdempotencyCache();
  });

  const testTool: AgentTool = {
    name: "academic.attendance.mark",
    description: "Marks attendance",
    domain: "academic",
    type: "write",
    requiredPermission: "agent:workflows:execute",
    riskLevel: "medium",
    inputSchema: z.object({ studentId: z.string(), status: z.enum(["present", "absent"]) }),
    outputSchema: z.object({ marked: z.boolean(), recordId: z.string() }),
    execute: async (input) => ({ marked: true, recordId: `rec_${input.studentId}` }),
    compensate: async () => ({ success: true, compensatedAt: new Date().toISOString() }),
  };

  it("registers and executes tool with valid input and permissions", async () => {
    registry.registerTool(testTool);

    const result = await executor.executeTool(
      "academic-agent",
      "academic.attendance.mark",
      { studentId: "std_01", status: "present" },
      {
        institutionId: "inst_alpha",
        userId: "user_1",
        userRole: "admin",
        permissions: ["agent:workflows:execute"],
        traceId: "trace-xyz",
      }
    );

    expect(result.status).toBe("success");
    expect(result.output).toEqual({ marked: true, recordId: "rec_std_01" });
    expect(result.auditHash).toBeDefined();

    // Verify Merkle audit chain in store
    const invocations = await store.listToolInvocations("inst_alpha");
    expect(invocations.length).toBe(1);
    expect(invocations[0].status).toBe("success");
  });

  it("denies execution when permission is missing (negative test)", async () => {
    registry.registerTool(testTool);

    const result = await executor.executeTool(
      "academic-agent",
      "academic.attendance.mark",
      { studentId: "std_01", status: "present" },
      {
        institutionId: "inst_alpha",
        userId: "user_2",
        userRole: "staff",
        permissions: ["agent:workflows:view"], // Missing execute
      }
    );

    expect(result.status).toBe("denied");
    expect(result.error).toContain("lacks required permission");
  });

  it("blocks execution when tool is not allowlisted for the tenant (negative cross-tenant test)", async () => {
    registry.registerTool(testTool);
    registry.setInstitutionAllowlist("inst_alpha", ["some.other.tool"]);

    const result = await executor.executeTool(
      "academic-agent",
      "academic.attendance.mark",
      { studentId: "std_01", status: "present" },
      {
        institutionId: "inst_alpha",
        userId: "user_1",
        userRole: "admin",
        permissions: ["agent:workflows:execute"],
      }
    );

    expect(result.status).toBe("denied");
    expect(result.error).toContain("not permitted for tenant");
  });

  it("returns cached result when idempotency-key matches", async () => {
    registry.registerTool(testTool);

    const tenantContext = {
      institutionId: "inst_alpha",
      userId: "user_1",
      userRole: "admin",
      permissions: ["agent:workflows:execute"],
      idempotencyKey: "idemp_unique_key_001",
    };

    const firstRun = await executor.executeTool("academic-agent", "academic.attendance.mark", { studentId: "std_01", status: "present" }, tenantContext);
    const secondRun = await executor.executeTool("academic-agent", "academic.attendance.mark", { studentId: "std_01", status: "present" }, tenantContext);

    expect(firstRun.status).toBe("success");
    expect(secondRun.status).toBe("success");
    expect(secondRun.output).toEqual(firstRun.output);
    expect(secondRun.auditHash).toEqual(firstRun.auditHash);
  });

  it("enforces tool execution rate limits per tenant and tool", async () => {
    registry.registerTool(testTool);
    executor.setRateLimit("academic.attendance.mark", 2); // Max 2 calls/minute

    const tenantContext = {
      institutionId: "inst_alpha",
      userId: "user_1",
      userRole: "admin",
      permissions: ["agent:workflows:execute"],
    };

    const call1 = await executor.executeTool("academic-agent", "academic.attendance.mark", { studentId: "std_01", status: "present" }, tenantContext);
    const call2 = await executor.executeTool("academic-agent", "academic.attendance.mark", { studentId: "std_02", status: "present" }, tenantContext);
    const call3 = await executor.executeTool("academic-agent", "academic.attendance.mark", { studentId: "std_03", status: "present" }, tenantContext);

    expect(call1.status).toBe("success");
    expect(call2.status).toBe("success");
    expect(call3.status).toBe("denied");
    expect(call3.error).toContain("Rate limit exceeded for tool");
  });
});

