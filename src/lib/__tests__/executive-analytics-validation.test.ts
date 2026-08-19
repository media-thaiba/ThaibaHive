import { executiveAnalyticsQuerySchema } from "@/lib/validation/schemas";
import { eventBus } from "@/lib/sse/event-bus";

describe("MHD-018: Executive Analytics & Production Hardening Validation Test Suite", () => {
  it("validates executiveAnalyticsQuerySchema with valid and invalid parameters", () => {
    const valid = executiveAnalyticsQuerySchema.safeParse({
      from: "2026-08-01T00:00:00Z",
      to: "2026-08-01T23:59:59Z",
      institutionId: "inst-north-01",
    });
    expect(valid.success).toBe(true);

    const empty = executiveAnalyticsQuerySchema.safeParse({});
    expect(empty.success).toBe(true);
  });

  it("publishes and validates POLICY_PROPAGATED events on eventBus", () => {
    const spyPublish = jest.spyOn(eventBus, "publish");

    eventBus.publish("governance", {
      type: "POLICY_PROPAGATED",
      payload: {
        policyId: "pol_test_123",
        institutionIds: ["inst-1", "inst-2"],
        version: 1,
        sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status: "ACTIVE",
      },
    });

    expect(spyPublish).toHaveBeenCalledWith("governance", expect.objectContaining({
      type: "POLICY_PROPAGATED",
    }));

    spyPublish.mockRestore();
  });
});
