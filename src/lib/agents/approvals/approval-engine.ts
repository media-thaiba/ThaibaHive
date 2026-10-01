import { AgentDbStore, agentDbStore } from "../../db/agent-store";
import { EscalationNotifier, escalationNotifier } from "./escalation-notifier";

export interface CreateGateOptions {
  runId: string;
  stepId?: string;
  institutionId: string;
  requiredPermission?: string;
  severity?: "critical" | "high" | "medium" | "low";
  expiresAt?: string;
  onExpiryPolicy?: "escalate" | "hold" | "reject";
}

export interface GateDecisionResult {
  success: boolean;
  gateId: string;
  status: "approved" | "rejected" | "conflict";
  message?: string;
  error?: string;
}

export class ApprovalGateEngine {
  private static instance: ApprovalGateEngine;
  private store: AgentDbStore;
  private notifier: EscalationNotifier;

  constructor(options?: { store?: AgentDbStore; notifier?: EscalationNotifier }) {
    this.store = options?.store || agentDbStore;
    this.notifier = options?.notifier || escalationNotifier;
  }

  public static getInstance(): ApprovalGateEngine {
    if (!ApprovalGateEngine.instance) {
      ApprovalGateEngine.instance = new ApprovalGateEngine();
    }
    return ApprovalGateEngine.instance;
  }

  public async createGate(options: CreateGateOptions): Promise<any> {
    const gate = await this.store.createApprovalGate({
      runId: options.runId,
      stepId: options.stepId,
      institutionId: options.institutionId,
      requiredPermission: options.requiredPermission || "agent:workflows:approve",
      severity: options.severity || "medium",
      status: "pending",
      expiresAt: options.expiresAt,
    });

    return gate;
  }

  public async decideGate(
    gateId: string,
    decision: "approved" | "rejected",
    approverId: string,
    reason: string,
    tenantId: string = "global"
  ): Promise<GateDecisionResult> {
    const gate = await this.store.getApprovalGateById(gateId, tenantId);
    if (!gate) {
      return {
        success: false,
        gateId,
        status: "rejected",
        error: `Approval gate '${gateId}' not found for tenant '${tenantId}'`,
      };
    }

    // Server-authoritative conflict resolution (D14)
    if (gate.status !== "pending") {
      return {
        success: false,
        gateId,
        status: "conflict",
        error: `Gate '${gateId}' was already resolved as '${gate.status}' by '${gate.approverId || "system"}'`,
      };
    }

    await this.store.updateApprovalGate(
      gateId,
      {
        status: decision,
        approverId,
        decisionReason: reason,
        decidedAt: new Date().toISOString(),
      },
      tenantId
    );

    // Update associated run status
    if (decision === "approved") {
      await this.store.updateWorkflowRun(gate.runId, { status: "running" }, tenantId);
    } else {
      await this.store.updateWorkflowRun(
        gate.runId,
        {
          status: "cancelled",
          error: `Run cancelled due to rejected approval gate '${gateId}': ${reason}`,
          finishedAt: new Date().toISOString(),
        },
        tenantId
      );
    }

    return {
      success: true,
      gateId,
      status: decision,
      message: `Approval gate '${gateId}' ${decision} by ${approverId}`,
    };
  }

  public async checkExpiredGates(tenantId: string = "global"): Promise<{
    checkedCount: number;
    escalatedCount: number;
    rejectedCount: number;
  }> {
    const now = new Date().toISOString();
    const pendingGates = await this.store.listApprovalGates(tenantId, undefined, "pending");

    let escalatedCount = 0;
    const rejectedCount = 0;

    for (const gate of pendingGates) {
      if (gate.expiresAt && gate.expiresAt < now) {
        // Enforce SLA expiration policy
        await this.notifier.notifyEscalation({
          gateId: gate.id,
          runId: gate.runId,
          institutionId: gate.institutionId,
          severity: gate.severity as any,
          reason: `Approval SLA expired for gate ${gate.id}`,
          requiredPermission: gate.requiredPermission,
        });

        await this.store.updateApprovalGate(
          gate.id,
          {
            status: "expired",
            decisionReason: "SLA Auto-Expiry trigger fired",
            decidedAt: now,
          },
          tenantId
        );

        escalatedCount++;
      }
    }

    return {
      checkedCount: pendingGates.length,
      escalatedCount,
      rejectedCount,
    };
  }
}

export const approvalGateEngine = ApprovalGateEngine.getInstance();
