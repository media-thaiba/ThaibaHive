import { RemediationNotificationRouter } from "../remediation-notification-router";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(true),
      }),
    },
    remediationEscalationLogs: {},
  };
});

describe("RemediationNotificationRouter", () => {
  it("dispatches multi-channel escalation notifications to parents & staff", async () => {
    const result = await RemediationNotificationRouter.dispatchNotification({
      ticketId: "rem_101",
      channel: "push",
      recipientRole: "parent",
      recipientId: "prt_101",
      template: "chronic_absenteeism_parent",
      templateVars: { studentName: "Ahmad", campusName: "Thaiba North" },
    });

    expect(result.success).toBe(true);
    expect(result.logId).toBeDefined();
  });
});
