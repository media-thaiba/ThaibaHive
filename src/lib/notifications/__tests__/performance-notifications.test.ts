import { PerformanceNotificationService } from "../performance-notifications";

describe("Performance Notification Engine", () => {
  it("builds self-assessment deadline reminder notification payload", () => {
    const payload = PerformanceNotificationService.buildReminderPayload({
      staffId: "stf_101",
      staffName: "Dr. Sarah Ahmed",
      cycleTitle: "2026 Q3 Appraisal",
      dueDate: "2026-08-15",
      reminderType: "self_assessment",
    });

    expect(payload.title).toContain("Self-Assessment Due");
    expect(payload.body).toContain("Dr. Sarah Ahmed");
    expect(payload.body).toContain("2026 Q3 Appraisal");
  });

  it("builds manager review pending notification payload", () => {
    const payload = PerformanceNotificationService.buildReminderPayload({
      staffId: "hod_002",
      staffName: "Prof. Robert Miller",
      cycleTitle: "2026 Q3 Appraisal",
      dueDate: "2026-08-31",
      reminderType: "manager_review",
    });

    expect(payload.title).toContain("Subordinate Review Pending");
    expect(payload.body).toContain("manager evaluations for your team members");
  });
});
