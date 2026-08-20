import { AgentAction } from './marl-types';

export interface PendingDecision {
  id: string;
  action: AgentAction;
  reason: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  institutionId: string;
}

/**
 * Human-in-the-Loop Approval Controller
 * Manages administrative review queues, approvals, rejections, and emergency kill switches.
 */
export class HumanApprovalController {
  private pendingQueue: Map<string, PendingDecision> = new Map();
  private emergencyOverrideActive = false;

  public submitForApproval(action: AgentAction, reason: string, riskTier: PendingDecision['riskTier'] = 'MEDIUM'): PendingDecision {
    const decision: PendingDecision = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      reason,
      riskTier,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      institutionId: action.institutionId,
    };

    this.pendingQueue.set(decision.id, decision);
    return decision;
  }

  public approveDecision(decisionId: string, approverUserId: string): PendingDecision | null {
    const decision = this.pendingQueue.get(decisionId);
    if (!decision || decision.status !== 'PENDING') {
      return null;
    }

    decision.status = 'APPROVED';
    decision.decidedAt = new Date().toISOString();
    decision.decidedBy = approverUserId;
    decision.action.status = 'approved';

    return decision;
  }

  public rejectDecision(decisionId: string, approverUserId: string, rejectReason?: string): PendingDecision | null {
    const decision = this.pendingQueue.get(decisionId);
    if (!decision || decision.status !== 'PENDING') {
      return null;
    }

    decision.status = 'REJECTED';
    decision.decidedAt = new Date().toISOString();
    decision.decidedBy = approverUserId;
    decision.action.status = 'rejected';
    if (rejectReason) {
      decision.reason = `${decision.reason} | Rejection note: ${rejectReason}`;
    }

    return decision;
  }

  public triggerEmergencyKillSwitch(): { abortedCount: number; timestamp: string } {
    this.emergencyOverrideActive = true;
    let abortedCount = 0;

    for (const decision of this.pendingQueue.values()) {
      if (decision.status === 'PENDING') {
        decision.status = 'REJECTED';
        decision.action.status = 'rejected';
        decision.reason += ' | Aborted by emergency global kill-switch';
        decision.decidedAt = new Date().toISOString();
        decision.decidedBy = 'SYSTEM_EMERGENCY_KILL_SWITCH';
        abortedCount++;
      }
    }

    return {
      abortedCount,
      timestamp: new Date().toISOString(),
    };
  }

  public isEmergencyOverrideActive(): boolean {
    return this.emergencyOverrideActive;
  }

  public resetEmergencyOverride(): void {
    this.emergencyOverrideActive = false;
  }

  public getPendingDecisions(institutionId?: string): PendingDecision[] {
    const list = Array.from(this.pendingQueue.values());
    if (institutionId) {
      return list.filter((d) => d.institutionId === institutionId);
    }
    return list;
  }
}
