import { AgentMessageBus, agentMessageBus } from "../core/message-bus";

export interface EscalationNotice {
  gateId: string;
  runId: string;
  institutionId: string;
  severity: "critical" | "high" | "medium" | "low";
  reason: string;
  requiredPermission: string;
}

export interface RunFailureNotice {
  runId: string;
  workflowKey: string;
  institutionId: string;
  ownerId: string;
  error: string;
}

export class EscalationNotifier {
  private bus: AgentMessageBus;

  constructor(bus?: AgentMessageBus) {
    this.bus = bus || agentMessageBus;
  }

  public async notifyEscalation(notice: EscalationNotice): Promise<void> {
    this.bus.publish(
      "approval-engine",
      "*",
      "approval.escalated",
      {
        ...notice,
        escalatedAt: new Date().toISOString(),
      },
      notice.severity === "critical" ? "critical" : "high",
      { institutionId: notice.institutionId, durable: true }
    );
  }

  public async notifyRunFailure(notice: RunFailureNotice): Promise<void> {
    this.bus.publish(
      "execution-engine",
      notice.ownerId,
      "run.failed",
      {
        ...notice,
        failedAt: new Date().toISOString(),
      },
      "high",
      { institutionId: notice.institutionId, durable: true }
    );
  }
}

export const escalationNotifier = new EscalationNotifier();
