import {
  RemediationPlan,
  RemediationToolContext,
  RemediationRunResult,
  RemediationStepResult,
} from "./types";
import { remediationToolRegistry } from "./tools";
import { MerkleAuditLedger } from "../../agents/guardrails/merkle-ledger";
import { createHash, randomUUID } from "crypto";

export interface ApprovalGate {
  id: string;
  runId: string;
  stepId: string;
  planName: string;
  institutionId: string;
  requiredRole?: string;
  requiresStepUpAuth: boolean;
  status: "pending" | "approved" | "rejected";
  payload: Record<string, any>;
  createdAt: string;
  decidedAt?: string;
  decidedById?: string;
}

export class RemediationRuntime {
  private static instance: RemediationRuntime;
  private activeRuns: Map<string, RemediationRunResult> = new Map();
  private approvalGates: Map<string, ApprovalGate> = new Map();

  public static getInstance(): RemediationRuntime {
    if (!RemediationRuntime.instance) {
      RemediationRuntime.instance = new RemediationRuntime();
    }
    return RemediationRuntime.instance;
  }

  /**
   * Executes a remediation workflow plan.
   */
  public async executePlan(
    plan: RemediationPlan,
    ctx: RemediationToolContext
  ): Promise<RemediationRunResult> {
    const runId = plan.id || randomUUID();
    const stepResults: RemediationStepResult[] = [];
    const ledger = MerkleAuditLedger.getInstance();

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const startTime = Date.now();

      // 1. Check HITL gate
      if (step.requiresHitl) {
        // D12 Step-Up freshness is enforced at approval time (see resolveApprovalGate),
        // since the approver's session cannot be evaluated until they act.
        const gateId = randomUUID();

        const gate: ApprovalGate = {
          id: gateId,
          runId,
          stepId: step.id,
          planName: plan.name,
          institutionId: ctx.institutionId,
          requiredRole: step.hitlRole || "principal",
          requiresStepUpAuth: Boolean(step.requiresStepUpAuth),
          status: "pending",
          payload: step.params,
          createdAt: new Date().toISOString(),
        };

        this.approvalGates.set(gateId, gate);

        const stepResult: RemediationStepResult = {
          stepId: step.id,
          name: step.name,
          tool: step.tool,
          status: "waiting_approval",
          gateId,
          durationMs: Date.now() - startTime,
        };

        stepResults.push(stepResult);

        // Record gate creation in Merkle ledger
        const inputHash = createHash("sha256").update(JSON.stringify(step.params)).digest("hex");
        await ledger.enqueueInvocation({
          agentId: "copilot-remediation-engine",
          toolName: `${step.tool}:approval_gate`,
          institutionId: ctx.institutionId,
          status: "success",
          durationMs: Date.now() - startTime,
          inputHash,
          outputHash: inputHash,
          traceId: runId,
        });

        const runResult: RemediationRunResult = {
          runId,
          status: "waiting_approval",
          completedSteps: stepResults.filter((s) => s.status === "completed").length,
          totalSteps: plan.steps.length,
          stepResults,
        };

        this.activeRuns.set(runId, runResult);
        await ledger.flushAll();
        return runResult;
      }

      // 2. Execute typed tool
      const toolHandler = remediationToolRegistry.getTool(step.tool);
      if (!toolHandler) {
        const errorMsg = `Tool executor '${step.tool}' not found in registry`;
        stepResults.push({
          stepId: step.id,
          name: step.name,
          tool: step.tool,
          status: "failed",
          error: errorMsg,
          durationMs: Date.now() - startTime,
        });

        // Trigger Saga Compensating Rollback
        await this.rollbackExecutedSteps(stepResults, plan, ctx);

        const failedResult: RemediationRunResult = {
          runId,
          status: "rolled_back",
          completedSteps: stepResults.filter((s) => s.status === "completed").length,
          totalSteps: plan.steps.length,
          stepResults,
          error: errorMsg,
        };
        this.activeRuns.set(runId, failedResult);
        await ledger.flushAll();
        return failedResult;
      }

      try {
        const output = await toolHandler(step.params, ctx);
        const durationMs = Date.now() - startTime;
        const inputHash = createHash("sha256").update(JSON.stringify(step.params)).digest("hex");
        const outputHash = createHash("sha256").update(JSON.stringify(output || {})).digest("hex");

        await ledger.enqueueInvocation({
          agentId: "copilot-remediation-engine",
          toolName: step.tool,
          institutionId: ctx.institutionId,
          status: "success",
          durationMs,
          inputHash,
          outputHash,
          traceId: runId,
        });

        stepResults.push({
          stepId: step.id,
          name: step.name,
          tool: step.tool,
          status: "completed",
          output,
          durationMs,
          auditHash: outputHash,
        });
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const inputHash = createHash("sha256").update(JSON.stringify(step.params)).digest("hex");

        await ledger.enqueueInvocation({
          agentId: "copilot-remediation-engine",
          toolName: step.tool,
          institutionId: ctx.institutionId,
          status: "error",
          durationMs,
          inputHash,
          error: err.message,
          traceId: runId,
        });

        stepResults.push({
          stepId: step.id,
          name: step.name,
          tool: step.tool,
          status: "failed",
          error: err.message,
          durationMs,
        });

        // Trigger rollback
        await this.rollbackExecutedSteps(stepResults, plan, ctx);

        const rollbackResult: RemediationRunResult = {
          runId,
          status: "rolled_back",
          completedSteps: stepResults.filter((s) => s.status === "completed").length,
          totalSteps: plan.steps.length,
          stepResults,
          error: err.message,
        };
        this.activeRuns.set(runId, rollbackResult);
        await ledger.flushAll();
        return rollbackResult;
      }
    }

    await ledger.flushAll();

    const successResult: RemediationRunResult = {
      runId,
      status: "completed",
      completedSteps: stepResults.filter((s) => s.status === "completed").length,
      totalSteps: plan.steps.length,
      stepResults,
    };

    this.activeRuns.set(runId, successResult);
    return successResult;
  }

  /**
   * Saga Rollback: Executes compensating actions for previously completed steps in reverse order.
   */
  private async rollbackExecutedSteps(
    stepResults: RemediationStepResult[],
    plan: RemediationPlan,
    ctx: RemediationToolContext
  ): Promise<void> {
    const completed = stepResults.filter((s) => s.status === "completed");
    const ledger = MerkleAuditLedger.getInstance();

    for (let i = completed.length - 1; i >= 0; i--) {
      const completedStep = completed[i];
      const stepDef = plan.steps.find((s) => s.id === completedStep.stepId);

      if (stepDef?.compensatingAction) {
        const compAction = stepDef.compensatingAction;
        const compHandler = remediationToolRegistry.getTool(compAction.tool);

        if (compHandler) {
          try {
            await compHandler(compAction.params, ctx);
            await ledger.enqueueInvocation({
              agentId: "copilot-remediation-engine",
              toolName: `${compAction.tool}:rollback`,
              institutionId: ctx.institutionId,
              status: "success",
              durationMs: 50,
              inputHash: createHash("sha256").update(JSON.stringify(compAction.params)).digest("hex"),
            });
          } catch {
            // Compensating action error log
          }
        }
      }
    }
  }

  /**
   * Resumes a paused HITL approval gate.
   */
  public async resumeGate(
    gateId: string,
    decision: "approve" | "reject",
    approverCtx: RemediationToolContext
  ): Promise<RemediationRunResult> {
    const gate = this.approvalGates.get(gateId);
    if (!gate) {
      throw new Error(`Approval gate '${gateId}' not found`);
    }

    if (gate.requiresStepUpAuth && (approverCtx.stepUpFreshnessSeconds ?? 9999) > 300) {
      throw new Error("D12 Step-Up authentication required (freshness > 300s)");
    }

    gate.status = decision === "approve" ? "approved" : "rejected";
    gate.decidedAt = new Date().toISOString();
    gate.decidedById = approverCtx.staffId;

    const ledger = MerkleAuditLedger.getInstance();
    await ledger.enqueueInvocation({
      agentId: "copilot-remediation-engine",
      toolName: `approval_gate:${decision}`,
      institutionId: approverCtx.institutionId,
      status: decision === "approve" ? "success" : "denied",
      durationMs: 10,
      inputHash: createHash("sha256").update(JSON.stringify(gate.payload)).digest("hex"),
      traceId: gate.runId,
    });
    await ledger.flushAll();

    const run = this.activeRuns.get(gate.runId);
    if (run) {
      const step = run.stepResults.find((s) => s.gateId === gateId);
      if (step) {
        step.status = decision === "approve" ? "completed" : "failed";
      }
      run.status = decision === "approve" ? "completed" : "failed";
      return run;
    }

    return {
      runId: gate.runId,
      status: decision === "approve" ? "completed" : "failed",
      completedSteps: decision === "approve" ? 1 : 0,
      totalSteps: 1,
      stepResults: [],
    };
  }

  public getGate(gateId: string): ApprovalGate | undefined {
    return this.approvalGates.get(gateId);
  }

  public listPendingGates(institutionId: string): ApprovalGate[] {
    return Array.from(this.approvalGates.values()).filter(
      (g) => g.institutionId === institutionId && g.status === "pending"
    );
  }

  public getRun(runId: string): RemediationRunResult | undefined {
    return this.activeRuns.get(runId);
  }
}

export const remediationRuntime = RemediationRuntime.getInstance();
