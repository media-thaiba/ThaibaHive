import { defaultNotificationRouter } from "../notifications/automated-notification-router";
import { defaultStreamingService } from "../realtime/realtime-streaming-service";
import { TriggerEvaluationResult } from "./trigger-evaluation-engine";

export interface AnomalyRemediationPayload {
  type: "absenteeism" | "fee_default" | "grade_drop" | "compliance_warning";
  studentId: string;
  studentName: string;
  consecutiveDaysAbsent?: number;
  parentPhone?: string;
  feeAmountOverdue?: number;
  gradeDropPercentage?: number;
}

export class RemediationTriggerBridge {
  async processAnomalyAndDispatch(
    tenantId: string,
    anomaly: AnomalyRemediationPayload
  ): Promise<{ evaluated: boolean; dispatched: boolean; actionChannel: string; recipientPhone?: string }> {
    let matched = false;
    let actionChannel: "sms" | "push" = "push";
    let priority: "normal" | "high" | "urgent" = "normal";

    if (anomaly.type === "absenteeism" && (anomaly.consecutiveDaysAbsent || 0) >= 3) {
      matched = true;
      actionChannel = "sms";
      priority = "urgent";
    } else if (anomaly.type === "fee_default" && (anomaly.feeAmountOverdue || 0) > 5000) {
      matched = true;
      actionChannel = "push";
      priority = "high";
    } else if (anomaly.type === "grade_drop" && (anomaly.gradeDropPercentage || 0) >= 15) {
      matched = true;
      actionChannel = "push";
      priority = "normal";
    }

    if (!matched) {
      return { evaluated: true, dispatched: false, actionChannel };
    }

    const triggerResult: TriggerEvaluationResult = {
      ruleId: `auto_rule_${anomaly.type}`,
      ruleName: `Auto Remediation Alert - ${anomaly.type.toUpperCase()}`,
      eventType: anomaly.type,
      matched: true,
      actionChannel,
      recipientGroup: "parents",
      priority,
      payload: {
        studentId: anomaly.studentId,
        studentName: anomaly.studentName,
        recipientPhone: anomaly.parentPhone || "+15550199283",
        anomalyDetails: anomaly,
      },
      evaluatedAt: new Date().toISOString(),
    };

    // 1. Dispatch Notification (SMS/Push)
    await defaultNotificationRouter.dispatchNotification(tenantId, triggerResult);

    // 2. Publish real-time stream event frame to copilot & risk feed
    defaultStreamingService.publishEvent(tenantId, "risk_alerts", "automated_intervention_dispatched", {
      anomalyType: anomaly.type,
      studentId: anomaly.studentId,
      studentName: anomaly.studentName,
      actionChannel,
      priority,
    });

    return {
      evaluated: true,
      dispatched: true,
      actionChannel,
      recipientPhone: anomaly.parentPhone,
    };
  }
}

export const defaultRemediationBridge = new RemediationTriggerBridge();
