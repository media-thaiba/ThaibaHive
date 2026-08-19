import { db, remediationEscalationLogs } from "@thaiba/db";

export interface NotificationDispatchParams {
  ticketId: string;
  recipientId: string;
  recipientRole: "parent" | "staff" | "principal" | "regional_admin";
  channel: "push" | "sms" | "email" | "outbox";
  template: "chronic_absenteeism_parent" | "fee_default_warning" | "grade_drop_alert" | "ticket_assigned_staff" | string;
  templateVars?: Record<string, string>;
}

export class RemediationNotificationRouter {
  /**
   * Format message body using template parameters
   */
  static formatMessage(template: string, vars: Record<string, string> = {}): string {
    const studentName = vars.studentName || "your student";
    const campusName = vars.campusName || "Thaiba Campus";

    switch (template) {
      case "chronic_absenteeism_parent":
        return `[Automated Alert - ${campusName}] Urgent Notice: Attendance for ${studentName} has dropped below the critical 75% threshold. Please review the student portal or contact the counselor.`;
      case "fee_default_warning":
        return `[Financial Notice - ${campusName}] Reminder: Fee realization milestone pending for ${studentName}. Click to inspect details.`;
      case "grade_drop_alert":
        return `[Academic Warning - ${campusName}] Academic progress update for ${studentName}: Recent exam performance flagged for intervention.`;
      case "ticket_assigned_staff":
        return `[Remediation Ticket] You have been assigned an urgent remediation ticket: ${vars.ticketTitle || "Action Required"}.`;
      default:
        return `[Autonomous System Alert - ${campusName}] ${vars.customBody || "An operational anomaly requires your attention."}`;
    }
  }

  /**
   * Format, route, and log escalation notification
   */
  static async dispatchNotification(params: NotificationDispatchParams) {
    const startTime = Date.now();
    const messageBody = this.formatMessage(params.template, params.templateVars);
    const logId = `esc_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Simulate multi-channel routing (Push -> SMS fallback)
    const deliveryStatus = "sent";

    const logRecord = {
      id: logId,
      ticketId: params.ticketId,
      recipientId: params.recipientId,
      recipientRole: params.recipientRole,
      channel: params.channel,
      messageBody,
      deliveryStatus,
      sentAt: new Date().toISOString(),
    };

    await db.insert(remediationEscalationLogs).values(logRecord);

    return {
      success: true,
      logId,
      deliveryStatus,
      dispatchTimeMs: Date.now() - startTime,
      messageBody,
    };
  }
}
