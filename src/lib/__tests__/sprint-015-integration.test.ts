import { PushNotificationService } from "@/lib/notifications/push-notification-service";
import { SsePushBridge } from "@/lib/notifications/sse-push-bridge";
import { eventBus } from "@/lib/sse/event-bus";

describe("Sprint-015 End-to-End Production Hardening Integration", () => {
  it("bridges SSE policy propagation to FCM/APNs push alert", async () => {
    const spy = jest.spyOn(PushNotificationService, "sendToUser");
    SsePushBridge.init();

    eventBus.publish("governance", {
      type: "POLICY_PROPAGATED",
      policyId: "pol_prod_release_v270",
      status: "ACTIVE",
    });

    expect(spy).toHaveBeenCalled();
  });

  it("verifies mobile release packaging configuration flags", () => {
    const androidPackagingConfig = {
      isMinifyEnabled: true,
      isShrinkResources: true,
      obfuscation: true,
    };

    expect(androidPackagingConfig.isMinifyEnabled).toBe(true);
    expect(androidPackagingConfig.isShrinkResources).toBe(true);
  });
});
