import { WorkflowDsl, DslStep } from "../dsl/schema";
import { StepRunner, stepRunner, StepExecutionResult } from "./step-runner";
import { CompensationCoordinator, compensationCoordinator, ExecutedStepRecord } from "./compensation";
import { AgentDbStore, agentDbStore } from "../../../db/agent-store";
import { TenantContext } from "../../tools/contract";

export interface WorkflowRunResult {
  runId: string;
  workflowKey: string;
  status: "completed" | "awaiting_approval" | "failed" | "rolled_back" | "skipped" | "pending";
  executedSteps: ExecutedStepRecord[];
  scope: Record<string, any>;
  error?: string;
  approvalGateId?: string;
  durationMs: number;
}

export class WorkflowExecutionEngine {
  private static instance: WorkflowExecutionEngine;
  private stepRunner: StepRunner;
  private compensation: CompensationCoordinator;
  private store: AgentDbStore;

  constructor(options?: {
    stepRunner?: StepRunner;
    compensation?: CompensationCoordinator;
    store?: AgentDbStore;
    executor?: any;
  }) {
    this.store = options?.store || agentDbStore;
    this.stepRunner = options?.stepRunner || (options?.executor ? new StepRunner(options.executor) : stepRunner);
    this.compensation = options?.compensation || compensationCoordinator;
  }

  public static getInstance(): WorkflowExecutionEngine {
    if (!WorkflowExecutionEngine.instance) {
      WorkflowExecutionEngine.instance = new WorkflowExecutionEngine();
    }
    return WorkflowExecutionEngine.instance;
  }

  public async startRun(
    workflow: WorkflowDsl,
    triggerContext: Record<string, any>,
    tenant: TenantContext
  ): Promise<WorkflowRunResult> {
    const startTime = Date.now();

    // 0. Concurrency Policy Check (v1.2: skip / queue / allow)
    const concurrencyPolicy = workflow.defaults?.concurrencyPolicy || "allow";
    if (concurrencyPolicy !== "allow") {
      const activeRuns = await this.store.listWorkflowRuns(tenant.institutionId, workflow.key, "running");
      if (activeRuns.length > 0) {
        if (concurrencyPolicy === "skip") {
          return {
            runId: `skipped_${Date.now()}`,
            workflowKey: workflow.key,
            status: "skipped",
            executedSteps: [],
            scope: {},
            error: "Execution skipped: another run is actively executing for this workflow.",
            durationMs: Date.now() - startTime,
          };
        } else if (concurrencyPolicy === "queue") {
          const queuedRun = await this.store.createWorkflowRun({
            workflowId: workflow.key,
            institutionId: tenant.institutionId,
            status: "pending",
            triggerType: "manual",
            triggeredBy: tenant.userId,
            contextJson: JSON.stringify(triggerContext),
            traceId: tenant.traceId,
          });
          return {
            runId: queuedRun.id,
            workflowKey: workflow.key,
            status: "pending",
            executedSteps: [],
            scope: {},
            durationMs: Date.now() - startTime,
          };
        }
      }
    }

    // 0.1 Ensure workflow is stored in store for resumption/lookup
    const existingWf = await this.store.getWorkflowById(workflow.key, tenant.institutionId);
    if (!existingWf) {
      await this.store.createWorkflow({
        id: workflow.key,
        institutionId: tenant.institutionId,
        name: workflow.name,
        description: workflow.description || "",
        version: workflow.version || 1,
        definitionJson: JSON.stringify(workflow),
        status: "active",
        createdBy: tenant.userId,
      });
    }

    // 1. Create run record in DB store
    const runRecord = await this.store.createWorkflowRun({
      workflowId: workflow.key,
      institutionId: tenant.institutionId,
      status: "running",
      triggerType: "manual",
      triggeredBy: tenant.userId,
      contextJson: JSON.stringify(triggerContext),
      traceId: tenant.traceId,
      startedAt: new Date().toISOString(),
    });

    const scope: Record<string, any> = {
      trigger: triggerContext,
      steps: {},
    };

    const executedSteps: ExecutedStepRecord[] = [];
    const stepMap = new Map<string, DslStep>();
    workflow.steps.forEach((s) => stepMap.set(s.key, s));

    let currentStep: DslStep | undefined = workflow.steps[0];
    let hasJumped = false;

    while (currentStep) {
      const maxRetries = currentStep.onFailure?.maxRetries ?? workflow.defaults?.maxRetries ?? 2;
      let attempt = 0;
      let stepResult: StepExecutionResult | undefined;

      // Record step start in DB
      const dbStep = await this.store.createWorkflowStep({
        runId: runRecord.id,
        institutionId: tenant.institutionId,
        stepKey: currentStep.key,
        agentId: currentStep.agent || "system",
        toolName: currentStep.tool,
        status: "running",
        inputJson: JSON.stringify(currentStep.input || {}),
        startedAt: new Date().toISOString(),
      });

      // Step execution with retry loop
      while (attempt <= maxRetries) {
        attempt++;
        await this.store.updateWorkflowStep(dbStep.id, { attempt }, tenant.institutionId);

        stepResult = await this.stepRunner.runStep(currentStep, scope, tenant);

        if (stepResult.status === "completed" || stepResult.status === "awaiting_approval") {
          break; // Success or awaiting human
        }

        // Retry with backoff if attempts remaining
        if (attempt <= maxRetries) {
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 20));
        }
      }

      const res = stepResult!;

      // Handle Approval Gate
      if (res.status === "awaiting_approval") {
        await this.store.updateWorkflowStep(dbStep.id, { status: "awaiting_approval" }, tenant.institutionId);
        
        const gate = await this.store.createApprovalGate({
          runId: runRecord.id,
          stepId: dbStep.id,
          institutionId: tenant.institutionId,
          requiredPermission: res.approvalRequired?.permission || "agent:workflows:approve",
          severity: res.approvalRequired?.severity || "medium",
          status: "pending",
        });

        await this.store.updateWorkflowRun(runRecord.id, { status: "awaiting_approval" }, tenant.institutionId);

        return {
          runId: runRecord.id,
          workflowKey: workflow.key,
          status: "awaiting_approval",
          executedSteps,
          scope,
          approvalGateId: gate.id,
          durationMs: Date.now() - startTime,
        };
      }

      // Handle Step Failure & Saga Rollback (after retries exhausted)
      if (res.status === "failed") {
        await this.store.updateWorkflowStep(dbStep.id, { status: "failed", error: res.error }, tenant.institutionId);

        const rollback = await this.compensation.rollbackRun(runRecord.id, executedSteps, tenant);
        await this.store.updateWorkflowRun(
          runRecord.id,
          {
            status: "rolled_back",
            error: `Step '${currentStep.key}' failed after ${attempt} attempt(s): ${res.error}. Rollback status: ${rollback.success ? "success" : "partial failure"}`,
            finishedAt: new Date().toISOString(),
          },
          tenant.institutionId
        );

        return {
          runId: runRecord.id,
          workflowKey: workflow.key,
          status: "rolled_back",
          executedSteps,
          scope,
          error: res.error,
          durationMs: Date.now() - startTime,
        };
      }

      // Step Completed Successfully
      await this.store.updateWorkflowStep(
        dbStep.id,
        {
          status: "completed",
          outputJson: JSON.stringify(res.output || {}),
          finishedAt: new Date().toISOString(),
        },
        tenant.institutionId
      );

      executedSteps.push({
        stepKey: currentStep.key,
        toolName: currentStep.tool,
        input: currentStep.input,
        output: res.output,
        status: "completed",
      });

      scope.steps[currentStep.key] = { output: res.output };

      // Determine next step
      const explicitNext = res.nextStepKey || currentStep.next || (currentStep as any).goto;
      if (explicitNext) {
        currentStep = stepMap.get(explicitNext);
        hasJumped = true;
      } else if (!hasJumped) {
        const currentIndex = workflow.steps.findIndex((s) => s.key === currentStep!.key);
        currentStep = currentIndex >= 0 && currentIndex + 1 < workflow.steps.length ? workflow.steps[currentIndex + 1] : undefined;
      } else {
        currentStep = undefined;
      }
    }

    // Workflow Completed
    await this.store.updateWorkflowRun(
      runRecord.id,
      {
        status: "completed",
        finishedAt: new Date().toISOString(),
      },
      tenant.institutionId
    );

    return {
      runId: runRecord.id,
      workflowKey: workflow.key,
      status: "completed",
      executedSteps,
      scope,
      durationMs: Date.now() - startTime,
    };
  }

  public async resumeRunAfterApproval(
    runId: string,
    approvalGateId: string,
    tenant: TenantContext
  ): Promise<WorkflowRunResult> {
    const startTime = Date.now();
    const run = await this.store.getWorkflowRunById(runId, tenant.institutionId);
    if (!run) {
      throw new Error(`Workflow run '${runId}' not found.`);
    }

    const gate = await this.store.getApprovalGateById(approvalGateId, tenant.institutionId);
    if (!gate) {
      throw new Error(`Approval gate '${approvalGateId}' not found.`);
    }

    if (gate.status !== "approved") {
      throw new Error(`Cannot resume workflow: approval gate '${approvalGateId}' status is '${gate.status}'.`);
    }

    // Load workflow definition
    const workflowRecord = await this.store.getWorkflowById(run.workflowId, tenant.institutionId);
    let workflow: WorkflowDsl | undefined;
    if (workflowRecord) {
      workflow = typeof workflowRecord.definitionJson === "string" ? JSON.parse(workflowRecord.definitionJson) : workflowRecord.definitionJson;
    }

    if (!workflow) {
      const allWfs = await this.store.listWorkflows(tenant.institutionId);
      const matched = allWfs.find((w) => w.key === run.workflowId || w.id === run.workflowId);
      if (matched) {
        workflow = typeof matched.definitionJson === "string" ? JSON.parse(matched.definitionJson) : matched.definitionJson;
      }
    }

    if (!workflow) {
      throw new Error(`Workflow definition for '${run.workflowId}' not found.`);
    }

    // Find the paused step and mark it completed
    const pausedDbStep = await this.store.getWorkflowStepById(gate.stepId, tenant.institutionId);
    if (pausedDbStep) {
      await this.store.updateWorkflowStep(
        pausedDbStep.id,
        {
          status: "completed",
          finishedAt: new Date().toISOString(),
        },
        tenant.institutionId
      );
    }

    // Set run to running
    await this.store.updateWorkflowRun(run.id, { status: "running" }, tenant.institutionId);

    // Reconstruct executed steps and scope
    const existingDbSteps = await this.store.listWorkflowSteps(run.id, tenant.institutionId);
    const executedSteps: ExecutedStepRecord[] = existingDbSteps
      .filter((s) => s.status === "completed")
      .map((s) => ({
        stepKey: s.stepKey,
        toolName: s.toolName,
        input: s.inputJson ? JSON.parse(s.inputJson) : {},
        output: s.outputJson ? JSON.parse(s.outputJson) : {},
        status: "completed" as const,
      }));

    const scope: Record<string, any> = {
      trigger: run.contextJson ? JSON.parse(run.contextJson) : {},
      steps: {},
      env: {},
    };
    executedSteps.forEach((s) => {
      scope.steps[s.stepKey] = { output: s.output };
    });

    const stepMap = new Map<string, DslStep>();
    workflow.steps.forEach((s) => stepMap.set(s.key, s));

    const pausedStepIndex = workflow.steps.findIndex((s) => s.key === pausedDbStep?.stepKey);
    let currentStep: DslStep | undefined =
      pausedStepIndex >= 0 && pausedStepIndex + 1 < workflow.steps.length
        ? workflow.steps[pausedStepIndex + 1]
        : undefined;

    let hasJumped = false;

    while (currentStep) {
      const maxRetries = currentStep.onFailure?.maxRetries ?? workflow.defaults?.maxRetries ?? 2;
      let attempt = 0;
      let stepResult: StepExecutionResult | undefined;

      const dbStep = await this.store.createWorkflowStep({
        runId: run.id,
        institutionId: tenant.institutionId,
        stepKey: currentStep.key,
        agentId: currentStep.agent || "system",
        toolName: currentStep.tool,
        status: "running",
        inputJson: JSON.stringify(currentStep.input || {}),
        startedAt: new Date().toISOString(),
      });

      while (attempt <= maxRetries) {
        attempt++;
        await this.store.updateWorkflowStep(dbStep.id, { attempt }, tenant.institutionId);
        stepResult = await this.stepRunner.runStep(currentStep, scope, tenant);
        if (stepResult.status === "completed" || stepResult.status === "awaiting_approval") {
          break;
        }
        if (attempt <= maxRetries) {
          await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 20));
        }
      }

      const res = stepResult!;

      if (res.status === "awaiting_approval") {
        await this.store.updateWorkflowStep(dbStep.id, { status: "awaiting_approval" }, tenant.institutionId);
        const newGate = await this.store.createApprovalGate({
          runId: run.id,
          stepId: dbStep.id,
          institutionId: tenant.institutionId,
          requiredPermission: res.approvalRequired?.permission || "agent:workflows:approve",
          severity: res.approvalRequired?.severity || "medium",
          status: "pending",
        });
        await this.store.updateWorkflowRun(run.id, { status: "awaiting_approval" }, tenant.institutionId);
        return {
          runId: run.id,
          workflowKey: workflow.key,
          status: "awaiting_approval",
          executedSteps,
          scope,
          approvalGateId: newGate.id,
          durationMs: Date.now() - startTime,
        };
      }

      if (res.status === "failed") {
        await this.store.updateWorkflowStep(dbStep.id, { status: "failed", error: res.error }, tenant.institutionId);
        const rollback = await this.compensation.rollbackRun(run.id, executedSteps, tenant);
        await this.store.updateWorkflowRun(
          run.id,
          {
            status: "rolled_back",
            error: `Step '${currentStep.key}' failed after ${attempt} attempt(s): ${res.error}. Rollback status: ${rollback.success ? "success" : "partial failure"}`,
            finishedAt: new Date().toISOString(),
          },
          tenant.institutionId
        );
        return {
          runId: run.id,
          workflowKey: workflow.key,
          status: "rolled_back",
          executedSteps,
          scope,
          error: res.error,
          durationMs: Date.now() - startTime,
        };
      }

      await this.store.updateWorkflowStep(
        dbStep.id,
        {
          status: "completed",
          outputJson: JSON.stringify(res.output || {}),
          finishedAt: new Date().toISOString(),
        },
        tenant.institutionId
      );

      executedSteps.push({
        stepKey: currentStep.key,
        toolName: currentStep.tool,
        input: currentStep.input,
        output: res.output,
        status: "completed",
      });

      scope.steps[currentStep.key] = { output: res.output };

      const explicitNext = res.nextStepKey || currentStep.next || (currentStep as any).goto;
      if (explicitNext) {
        currentStep = stepMap.get(explicitNext);
        hasJumped = true;
      } else if (!hasJumped) {
        const currentIndex = workflow.steps.findIndex((s) => s.key === currentStep!.key);
        currentStep = currentIndex >= 0 && currentIndex + 1 < workflow.steps.length ? workflow.steps[currentIndex + 1] : undefined;
      } else {
        currentStep = undefined;
      }
    }

    await this.store.updateWorkflowRun(
      run.id,
      {
        status: "completed",
        finishedAt: new Date().toISOString(),
      },
      tenant.institutionId
    );

    return {
      runId: run.id,
      workflowKey: workflow.key,
      status: "completed",
      executedSteps,
      scope,
      durationMs: Date.now() - startTime,
    };
  }
}

export const workflowExecutionEngine = WorkflowExecutionEngine.getInstance();
