import { WorkflowExecutionEngine } from "../workflow/engine/execution-engine";
import { ToolRegistry } from "../tools/tool-registry";
import { ToolExecutor } from "../tools/executor";
import { AgentDbStore } from "../../db/agent-store";
import { academicTools } from "../tools/adapters/academic-tools";
import { financeTools } from "../tools/adapters/finance-tools";
import { WorkflowDsl } from "../workflow/dsl/schema";

describe("Workflow Execution Engine, Branches & Saga Rollback Suite (AIG-013)", () => {
  let engine: WorkflowExecutionEngine;
  let registry: ToolRegistry;
  let executor: ToolExecutor;
  let store: AgentDbStore;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();

    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    executor = new ToolExecutor({ registry, store });
    [...academicTools, ...financeTools].forEach((t) => registry.registerTool(t));

    engine = new WorkflowExecutionEngine({
      store,
      executor,
    });
  });

  const tenant = {
    institutionId: "inst_alpha",
    userId: "user_admin",
    userRole: "admin",
    permissions: ["*"],
  };

  it("executes multi-step sequential workflow to completion", async () => {
    const workflow: WorkflowDsl = {
      key: "academic-sync",
      name: "Academic Sync",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "allow", maxRetries: 2, timeoutMs: 300000, onFailure: "compensate" },
      steps: [
        {
          key: "step-attendance",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: "sec-101", date: "2026-10-01" },
        },
        {
          key: "step-conflict",
          type: "action",
          agent: "academic-agent",
          tool: "academic.timetables.resolve_conflicts",
          input: { departmentId: "dept-cs", academicYear: "2026-2027" },
        },
      ],
    };

    const result = await engine.startRun(workflow, {}, tenant);
    expect(result.status).toBe("completed");
    expect(result.executedSteps.length).toBe(2);

    // Verify persisted run in store
    const dbRun = await store.getWorkflowRunById(result.runId, "inst_alpha");
    expect(dbRun?.status).toBe("completed");
  });

  it("pauses workflow execution and creates approval gate when approval is required", async () => {
    const workflowWithGate: WorkflowDsl = {
      key: "fee-reconcile-flow",
      name: "Fee Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "allow", maxRetries: 2, timeoutMs: 300000, onFailure: "compensate" },
      steps: [
        {
          key: "step-reconcile",
          type: "action",
          agent: "finance-agent",
          tool: "finance.fees.reconcile",
          input: { termId: "fall_2026" },
          approval: { required: true, permission: "agent:workflows:approve", severity: "high", onExpiry: "escalate" },
        },
      ],
    };

    const result = await engine.startRun(workflowWithGate, {}, tenant);
    expect(result.status).toBe("awaiting_approval");
    expect(result.approvalGateId).toBeDefined();

    const gates = await store.listApprovalGates("inst_alpha", result.runId);
    expect(gates.length).toBe(1);
    expect(gates[0].status).toBe("pending");
  });

  it("triggers saga compensation rollback when a downstream step fails", async () => {
    const failingWorkflow: WorkflowDsl = {
      key: "failing-flow",
      name: "Failing Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "allow", maxRetries: 2, timeoutMs: 300000, onFailure: "compensate" },
      steps: [
        {
          key: "step-attendance",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: "sec-101", date: "2026-10-01" },
        },
        {
          key: "step-broken",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: 12345 as any, date: "2026-10-01" }, // Invalid input triggers failure
        },
      ],
    };

    const result = await engine.startRun(failingWorkflow, {}, tenant);
    expect(result.status).toBe("rolled_back");
    expect(result.executedSteps.length).toBe(1); // Step 1 was executed then compensated

    const dbRun = await store.getWorkflowRunById(result.runId, "inst_alpha");
    expect(dbRun?.status).toBe("rolled_back");
  });

  it("evaluates branch step conditions and executes matching pathway", async () => {
    const branchingWorkflow: WorkflowDsl = {
      key: "branch-flow",
      name: "Branching Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "allow", maxRetries: 1, timeoutMs: 300000, onFailure: "fail" },
      steps: [
        {
          key: "check-path",
          type: "branch",
          condition: "runMode == 'full'",
          thenStep: "step-full",
          elseStep: "step-skipped",
        },
        {
          key: "step-full",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: "sec-branch", date: "2026-10-01" },
        },
        {
          key: "step-skipped",
          type: "action",
          agent: "academic-agent",
          tool: "academic.timetables.resolve_conflicts",
          input: { departmentId: "dept-cs", academicYear: "2026-2027" },
        },
      ],
    };

    const result = await engine.startRun(branchingWorkflow, { runMode: "full" }, tenant);
    expect(result.status).toBe("completed");
    expect(result.executedSteps.some(s => s.stepKey === "step-full")).toBe(true);
    expect(result.executedSteps.some(s => s.stepKey === "step-skipped")).toBe(false);
  });

  it("enforces concurrency policy 'skip' when an active run already exists", async () => {
    // Create an active running workflow
    await store.createWorkflowRun({
      workflowId: "single-instance-flow",
      institutionId: "inst_alpha",
      status: "running",
      triggeredBy: "user_admin",
      triggerType: "manual",
      context: {},
    });

    const singleInstanceWorkflow: WorkflowDsl = {
      key: "single-instance-flow",
      name: "Single Instance Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "skip", maxRetries: 1, timeoutMs: 300000, onFailure: "fail" },
      steps: [
        {
          key: "step-attendance",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: "sec-101", date: "2026-10-01" },
        },
      ],
    };

    const result = await engine.startRun(singleInstanceWorkflow, {}, tenant);
    expect(result.status).toBe("skipped");
  });

  it("enforces concurrency policy 'queue' when an active run exists", async () => {
    await store.createWorkflowRun({
      workflowId: "queued-flow",
      institutionId: "inst_alpha",
      status: "running",
      triggeredBy: "user_admin",
      triggerType: "manual",
      context: {},
    });

    const queuedWorkflow: WorkflowDsl = {
      key: "queued-flow",
      name: "Queued Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "queue", maxRetries: 1, timeoutMs: 300000, onFailure: "fail" },
      steps: [
        {
          key: "step-1",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: "sec-queue", date: "2026-10-01" },
        },
      ],
    };

    const result = await engine.startRun(queuedWorkflow, {}, tenant);
    expect(result.status).toBe("pending");
    expect(result.executedSteps.length).toBe(0);
  });

  it("enforces concurrency policy 'allow' permitting concurrent runs", async () => {
    await store.createWorkflowRun({
      workflowId: "allow-flow",
      institutionId: "inst_alpha",
      status: "running",
      triggeredBy: "user_admin",
      triggerType: "manual",
      context: {},
    });

    const allowWorkflow: WorkflowDsl = {
      key: "allow-flow",
      name: "Allow Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "allow", maxRetries: 1, timeoutMs: 300000, onFailure: "fail" },
      steps: [
        {
          key: "step-1",
          type: "action",
          agent: "academic-agent",
          tool: "academic.attendance.reconcile",
          input: { sectionId: "sec-allow", date: "2026-10-01" },
        },
      ],
    };

    const result = await engine.startRun(allowWorkflow, {}, tenant);
    expect(result.status).toBe("completed");
    expect(result.executedSteps.length).toBe(1);
  });

  it("retries failed steps up to maxRetries with backoff before failing or compensating", async () => {
    let callCount = 0;
    registry.registerTool({
      name: "test.flaky.tool",
      domain: "academic",
      description: "Flaky test tool",
      type: "read",
      riskLevel: "low",
      requiredPermission: "academic:view",
      inputSchema: academicTools[1].inputSchema,
      outputSchema: academicTools[1].outputSchema,
      execute: async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error("Temporary network timeout");
        }
        return { reconciledCount: 38, status: "reconciled" };
      },
    });

    const retryWorkflow: WorkflowDsl = {
      key: "retry-flow",
      name: "Retry Flow",
      dslVersion: 1,
      version: 1,
      triggers: [{ type: "manual" }],
      defaults: { concurrencyPolicy: "allow", maxRetries: 2, timeoutMs: 300000, onFailure: "fail" },
      steps: [
        {
          key: "step-flaky",
          type: "action",
          agent: "academic-agent",
          tool: "test.flaky.tool",
          input: { sectionId: "sec-retry", date: "2026-10-01" },
        },
      ],
    };

    const result = await engine.startRun(retryWorkflow, {}, tenant);
    expect(result.status).toBe("completed");
    expect(callCount).toBe(2);
  });
});


