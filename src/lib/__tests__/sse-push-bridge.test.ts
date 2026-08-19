import { SsePushBridge } from "@/lib/notifications/sse-push-bridge";
import { eventBus } from "@/lib/sse/event-bus";
import { PushNotificationService } from "@/lib/notifications/push-notification-service";

describe("SsePushBridge", () => {
  it("initializes bridge and converts POLICY_PROPAGATED SSE event to push notification", async () => {
    const spy = jest.spyOn(PushNotificationService, "sendToUser");
    SsePushBridge.init();

    eventBus.publish("governance", {
      type: "POLICY_PROPAGATED",
      policyId: "pol_test_100",
      status: "ACTIVE",
    });

    expect(spy).toHaveBeenCalled();
  });
});
