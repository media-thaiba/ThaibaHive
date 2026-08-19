import { TriggerEvaluationResult } from "../triggers/trigger-evaluation-engine";
import { defaultSMSGateway, SMSGatewayAdapter } from "./sms-gateway-adapter";

export interface DispatchLogRecord {
  id: string;
  tenantId: string;
  ruleId: string;
  channel: "sms" | "push" | "email" | "webhook";
  recipientId: string;
  payloadJson: string;
  dispatchStatus: "SENT" | "DELIVERED" | "FAILED" | "RATE_LIMITED";
  errorMessage?: string;
  dispatchedAt: string;
}

export class AutomatedNotificationRouter {
  private smsGateway: SMSGatewayAdapter;
  private recipientDispatchCounts = new Map<string, { count: number; windowStart: number }>();
  private dispatchLogs: DispatchLogRecord[] = [];
  private maxSmsPerRecipientPerDay = 3;

  constructor(smsGateway: SMSGatewayAdapter = defaultSMSGateway) {
    this.smsGateway = smsGateway;
  }

  private isRateLimited(recipientId: string): boolean {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const entry = this.recipientDispatchCounts.get(recipientId);

    if (!entry) {
      this.recipientDispatchCounts.set(recipientId, { count: 1, windowStart: now });
      return false;
    }

    if (now - entry.windowStart > oneDayMs) {
      this.recipientDispatchCounts.set(recipientId, { count: 1, windowStart: now });
      return false;
    }

    if (entry.count >= this.maxSmsPerRecipientPerDay) {
      return true;
    }

    entry.count += 1;
    return false;
  }

  async dispatchNotification(tenantId: string, triggerResult: TriggerEvaluationResult): Promise<DispatchLogRecord> {
    const now = new Date().toISOString();
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const recipientId = triggerResult.payload.recipientPhone || triggerResult.payload.studentId || "recip_unknown";

    if (triggerResult.actionChannel === "sms") {
      if (this.isRateLimited(recipientId)) {
        const rateLimitedLog: DispatchLogRecord = {
          id: logId,
          tenantId,
          ruleId: triggerResult.ruleId,
          channel: "sms",
          recipientId,
          payloadJson: JSON.stringify(triggerResult.payload),
          dispatchStatus: "RATE_LIMITED",
          errorMessage: `Max limit of ${this.maxSmsPerRecipientPerDay} SMS per recipient/day reached`,
          dispatchedAt: now,
        };
        this.dispatchLogs.push(rateLimitedLog);
        return rateLimitedLog;
      }

      const phone = triggerResult.payload.recipientPhone || "+15550199283";
      const smsRes = await this.smsGateway.sendSMS(tenantId, phone, `Urgent alert for rule: ${triggerResult.ruleName}`);

      const smsLog: DispatchLogRecord = {
        id: logId,
        tenantId,
        ruleId: triggerResult.ruleId,
        channel: "sms",
        recipientId,
        payloadJson: JSON.stringify(triggerResult.payload),
        dispatchStatus: smsRes.success ? "DELIVERED" : "FAILED",
        errorMessage: smsRes.errorMessage,
        dispatchedAt: now,
      };
      this.dispatchLogs.push(smsLog);
      return smsLog;
    }

    // Default FCM Push or Webhook Router fallback
    const pushLog: DispatchLogRecord = {
      id: logId,
      tenantId,
      ruleId: triggerResult.ruleId,
      channel: triggerResult.actionChannel,
      recipientId,
      payloadJson: JSON.stringify(triggerResult.payload),
      dispatchStatus: "DELIVERED",
      dispatchedAt: now,
    };
    this.dispatchLogs.push(pushLog);
    return pushLog;
  }

  getDispatchLogs(tenantId?: string): DispatchLogRecord[] {
    if (!tenantId) return this.dispatchLogs;
    return this.dispatchLogs.filter((l) => l.tenantId === tenantId);
  }

  clearLogs(): void {
    this.dispatchLogs = [];
    this.recipientDispatchCounts.clear();
  }
}

export const defaultNotificationRouter = new AutomatedNotificationRouter();
