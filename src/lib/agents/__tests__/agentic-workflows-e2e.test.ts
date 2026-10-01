import { z } from "zod";
import { AgentRegistry } from "../core/registry";
import { AgentMessageBus } from "../core/message-bus";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { WorkflowExecutionEngine } from "../workflow/engine/execution-engine";
import { ApprovalGateEngine } from "../approvals/approval-engine";
import { AgentMemoryStore } from "../memory/memory-store";
import { MerkleAuditLedger } from "../guardrails/merkle-ledger";
import { AgentDbStore } from "../../db/agent-store";
import { academicTools } from "../tools/adapters/academic-tools";
import { financeTools } from "../tools/adapters/finance-tools";
import { securityTools } from "../tools/adapters/security-tools";
import { facilitiesTools } from "../tools/adapters/facilities-tools";
import { hrTools } from "../tools/adapters/hr-tools";
import { WorkflowDsl } from "../workflow/dsl/schema";

describe("Autonomous Agentic Workflows End-to-End Integration Suite (AIG-024)", () => {
  let agentRegistry: AgentRegistry;
  let messageBus: AgentMessageBus;
  let toolRegistry: ToolRegistry;
  let store: AgentDbStore;
  let memoryStore: AgentMemoryStore;
  let merkleLedger: MerkleAuditLedger;
  let toolExecutor: ToolExecutor;
  let workflowEngine: WorkflowExecutionEngine;
  let approvalEngine: ApprovalGateEngine;

  const tenant = {
    institutionId: "inst_e2e_campus",
    userId: "principal_sarah",
    userRole: "principal",
    permissions: ["*"],
    traceId: "trace_e2e_001",
  };

  beforeEach(() => {
    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    agentRegistry = AgentRegistry.getInstance();
    agentRegistry.clear();

    messageBus = AgentMessageBus.getInstance();
    messageBus.clear();

    toolRegistry = ToolRegistry.getInstance();
    toolRegistry.clear();

    merkleLedger = new MerkleAuditLedger(store);
    merkleLedger.clearBuffer();

    memoryStore = new AgentMemoryStore(store);

    toolExecutor = new ToolExecutor({
      registry: toolRegistry,
      store,
      merkleLedger,
    });

    workflowEngine = new WorkflowExecutionEngine({
      store,
      executor: toolExecutor,
    });

    approvalEngine = new ApprovalGateEngine({ store });

    // Register all domain tools
    [
      ...academicTools,
      ...financeTools,
      ...securityTools,
      ...facilitiesTools,
      ...hrTools,
    ].forEach((tool) => toolRegistry.registerTool(tool));

    // Register all 5 domain agents
    agentRegistry.registerAgent({
      id: "academic-agent",
      role: "Academic Operations Specialist",
      domain: "academic",
      version: "1.0.0",
      status: "idle",
      currentLoad: 0,
      maxConcurrency: 5,
      capabilities: ["attendance", "timetables", "grades"],
      permissionScopes: ["academic:*"],
      institutionId: "inst_e2e_campus",
      lastHeartbeat: new Date().toISOString(),
    });

    agentRegistry.registerAgent({
      id: "finance-agent",
      role: "Institutional Financial Controller",
      domain: "finance",
      version: "1.0.0",
      status: "idle",
      currentLoad: 0,
      maxConcurrency: 5,
      capabilities: ["fees", "grants", "payroll"],
      permissionScopes: ["finance:*"],
      institutionId: "inst_e2e_campus",
      lastHeartbeat: new Date().toISOString(),
    });

    agentRegistry.registerAgent({
      id: "security-agent",
      role: "Campus Shield & Threat Sentinel",
      domain: "security",
      version: "1.0.0",
      status: "idle",
      currentLoad: 0,
      maxConcurrency: 5,
      capabilities: ["lockdown", "patrol", "alpr"],
      permissionScopes: ["security:*", "vision:*"],
      institutionId: "inst_e2e_campus",
      lastHeartbeat: new Date().toISOString(),
    });

    agentRegistry.registerAgent({
      id: "facilities-agent",
      role: "Campus Facilities & Energy Orchestrator",
      domain: "facilities",
      version: "1.0.0",
      status: "idle",
      currentLoad: 0,
      maxConcurrency: 5,
      capabilities: ["energy", "maintenance", "assets"],
      permissionScopes: ["facilities:*"],
      institutionId: "inst_e2e_campus",
      lastHeartbeat: new Date().toISOString(),
    });

    agentRegistry.registerAgent({
      id: "hr-agent",
      role: "Human Resources & Faculty Coordinator",
      domain: "hr",
      version: "1.0.0",
      status: "idle",
      currentLoad: 0,
      maxConcurrency: 5,
      capabilities: ["staffing", "leave", "compliance"],
      permissionScopes: ["hr:*", "staff:*"],
      institutionId: "inst_e2e_campus",
      lastHeartbeat: new Date().toISOString(),
    });
  });

  it("orchestrates a full cross-department institutional workflow with HITL approval and audit chain", async () => {
    // 1. Store prior context in memory
    await memoryStore.storeMemory({
      agentId: "facilities-agent",
      institutionId: tenant.institutionId,
      scope: "semantic",
      content: { note: "Zone C HVAC maintenance completed on 2026-09-28. System calibrated for energy efficiency." },
      importance: 0.9,
    });

    // 2. Define complex multi-agent institutional workflow DSL
    const complexWorkflow: WorkflowDsl = {
      key: "campus-semester-prep",
      name: "Comprehensive Campus Semester Preparation",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "schedule", cron: "0 6 1 * *" }],
      defaults: {
        concurrencyPolicy: "allow",
        maxRetries: 2,
        timeoutMs: 300000,
        onFailure: "compensate",
      },
      steps: [
        {
          key: "step-facilities-energy",
          type: "action",
          agent: "facilities-agent",
          tool: "facilities.hvac.optimize_schedule",
          input: {
            zoneId: "zone_science_complex",
            targetSetpointC: 22,
            setbackMode: true,
          },
        },
        {
          key: "step-security-soar",
          type: "action",
          agent: "security-agent",
          tool: "security.soar.execute_playbook",
          input: {
            playbookId: "pb_campus_prep",
            incidentId: "inc_routine_prep",
          },
        },
        {
          key: "step-academic-attendance",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: {
            sectionId: "sec-semester-start",
            date: "2026-10-01",
          },
        },
        {
          key: "step-finance-budget",
          type: "action",
          agent: "finance-agent",
          tool: "finance.fees.reconcile",
          input: {
            termId: "fall_2026_pre",
          },
          approval: {
            required: true,
            permission: "agent:workflows:approve",
            severity: "high",
            onExpiry: "escalate",
          },
        },
        {
          key: "step-hr-leave",
          type: "action",
          agent: "hr-agent",
          tool: "hr.leave.post_approval",
          input: {
            requestId: "req_prep_001",
            staffId: "stf_cs_lead",
            days: 1,
            approved: true,
          },
        },
      ],
    };

    // 3. Initiate workflow run
    const initialRunResult = await workflowEngine.startRun(
      complexWorkflow,
      { campus: "main", term: "Fall 2026" },
      tenant
    );

    // Should pause at step 4 for human approval
    expect(initialRunResult.status).toBe("awaiting_approval");
    expect(initialRunResult.approvalGateId).toBeDefined();
    expect(initialRunResult.executedSteps.length).toBe(3); // First 3 steps succeeded

    const gateId = initialRunResult.approvalGateId!;
    const gate = await store.getApprovalGateById(gateId, tenant.institutionId);
    expect(gate?.status).toBe("pending");
    expect(gate?.runId).toBe(initialRunResult.runId);

    // 4. Human-in-the-Loop Approval Decision
    const approvalResult = await approvalEngine.decideGate(
      gateId,
      "approved",
      "principal_sarah",
      "Verified institutional budget allocations for semester start.",
      tenant.institutionId
    );
    expect(approvalResult.success).toBe(true);

    // 5. Resume workflow execution after approval
    const resumedRunResult = await workflowEngine.resumeRunAfterApproval(
      initialRunResult.runId,
      gateId,
      tenant
    );

    expect(resumedRunResult.status).toBe("completed");
    expect(resumedRunResult.executedSteps.length).toBe(5);

    // 6. Verify persisted state in AgentDbStore
    const finalRun = await store.getWorkflowRunById(initialRunResult.runId, tenant.institutionId);
    expect(finalRun?.status).toBe("completed");

    const steps = await store.listWorkflowSteps(initialRunResult.runId, tenant.institutionId);
    expect(steps.length).toBe(5);
    expect(steps.every((s) => s.status === "completed")).toBe(true);

    // 7. Verify Merkle Audit Ledger integrity
    const verification = await merkleLedger.verifyChainIntegrity(tenant.institutionId);
    expect(verification.valid).toBe(true);
    expect(verification.totalEntries).toBeGreaterThanOrEqual(4);

    // 8. Verify episodic memory recording
    await memoryStore.storeMemory({
      agentId: "workflow-engine",
      institutionId: tenant.institutionId,
      scope: "episodic",
      content: { summary: `Completed workflow run ${initialRunResult.runId} for campus semester prep.` },
      importance: 0.8,
    });

    const retrieved = await memoryStore.retrieveRelevantMemories({
      agentId: "workflow-engine",
      tenantId: tenant.institutionId,
      query: "campus semester prep",
    });
    expect(retrieved.length).toBeGreaterThan(0);
  });

  it("handles multi-step failure by executing saga compensators in strict reverse order", async () => {
    const compensationTrace: string[] = [];

    // Register custom instrumented tools
    toolRegistry.registerTool({
      name: "e2e.test.write_1",
      domain: "academic",
      description: "Step 1 write tool",
      type: "write",
      riskLevel: "low",
      requiredPermission: "academic:view",
      inputSchema: z.object({ sectionId: z.string(), date: z.string() }),
      outputSchema: z.object({ reconciledCount: z.number(), unexcusedAbsences: z.number() }),
      execute: async () => {
        compensationTrace.push("execute_step_1");
        return { reconciledCount: 1, unexcusedAbsences: 0 };
      },
      compensate: async () => {
        compensationTrace.push("compensate_step_1");
        return { success: true, compensatedAt: new Date().toISOString() };
      },
    });

    toolRegistry.registerTool({
      name: "e2e.test.write_2",
      domain: "academic",
      description: "Step 2 write tool",
      type: "write",
      riskLevel: "low",
      requiredPermission: "academic:view",
      inputSchema: z.object({ sectionId: z.string(), date: z.string() }),
      outputSchema: z.object({ reconciledCount: z.number(), unexcusedAbsences: z.number() }),
      execute: async () => {
        compensationTrace.push("execute_step_2");
        return { reconciledCount: 2, unexcusedAbsences: 0 };
      },
      compensate: async () => {
        compensationTrace.push("compensate_step_2");
        return { success: true, compensatedAt: new Date().toISOString() };
      },
    });

    toolRegistry.registerTool({
      name: "e2e.test.fail_3",
      domain: "academic",
      description: "Step 3 failing tool",
      type: "read",
      riskLevel: "low",
      requiredPermission: "academic:view",
      inputSchema: z.object({ sectionId: z.string(), date: z.string() }),
      outputSchema: z.object({ result: z.string() }),
      execute: async () => {
        compensationTrace.push("execute_step_3_fail");
        throw new Error("Simulated critical downstream failure");
      },
    });

    const failingWorkflow: WorkflowDsl = {
      key: "failing-e2e-saga",
      name: "Failing E2E Saga Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: {
        concurrencyPolicy: "allow",
        maxRetries: 0,
        timeoutMs: 300000,
        onFailure: "compensate",
      },
      steps: [
        {
          key: "step-1",
          type: "action",
          agent: "academic-agent",
          tool: "e2e.test.write_1",
          input: { sectionId: "sec-1", date: "2026-10-01" },
        },
        {
          key: "step-2",
          type: "action",
          agent: "academic-agent",
          tool: "e2e.test.write_2",
          input: { sectionId: "sec-2", date: "2026-10-01" },
        },
        {
          key: "step-3",
          type: "action",
          agent: "academic-agent",
          tool: "e2e.test.fail_3",
          input: { sectionId: "sec-3", date: "2026-10-01" },
        },
      ],
    };

    const result = await workflowEngine.startRun(failingWorkflow, {}, tenant);

    expect(result.status).toBe("rolled_back");
    expect(result.error).toMatch(/Simulated critical downstream failure/i);

    // Verify reverse-order compensation execution
    expect(compensationTrace).toEqual([
      "execute_step_1",
      "execute_step_2",
      "execute_step_3_fail",
      "compensate_step_2",
      "compensate_step_1",
    ]);

    const runRecord = await store.getWorkflowRunById(result.runId, tenant.institutionId);
    expect(runRecord?.status).toBe("rolled_back");
  });
});
