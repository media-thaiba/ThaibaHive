import { PushNotificationService } from "@/lib/notifications/push-notification-service";

describe("PushNotificationService", () => {
  it("dispatches notification successfully to Android FCM client", async () => {
    const res = await PushNotificationService.sendToUser(
      "user_001",
      "fcm_test_token_xyz",
      "android",
      "Governance Alert",
      "Circuit breaker OPENED for Attendance Service",
      { eventType: "CIRCUIT_BREAKER_STATE_CHANGED" }
    );

    expect(res.success).toBe(true);
  });

  it("dispatches notification successfully to iOS APNs client", async () => {
    const res = await PushNotificationService.sendToUser(
      "user_002",
      "apns_test_token_abc",
      "ios",
      "Policy Update",
      "New attendance policy propagated across campuses",
      { eventType: "POLICY_PROPAGATED" }
    );

    expect(res.success).toBe(true);
  });
});
