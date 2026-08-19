

import { RealTimeStreamingService } from "../realtime/realtime-streaming-service";
import { RedisClusterManager } from "../redis/redis-cluster-manager";
import { AutomatedNotificationRouter } from "../notifications/automated-notification-router";
import { SMSGatewayAdapter } from "../notifications/sms-gateway-adapter";
import { hasPermission } from "../../../packages/auth/roles";

describe("STREAM-019: Multi-Tenant Real-Time Security & Redis Cluster Key Sharding Test Suite", () => {
  it("enforces strict tenant isolation across real-time streaming event buffers", () => {
    const streamService = new RealTimeStreamingService();

    streamService.publishEvent("tenant-alpha", "copilot_feed", "alert", { title: "Alpha Secret" });
    streamService.publishEvent("tenant-beta", "copilot_feed", "alert", { title: "Beta Secret" });

    const alphaEvents = streamService.getReplayEvents("tenant-alpha", "copilot_feed");
    const betaEvents = streamService.getReplayEvents("tenant-beta", "copilot_feed");

    expect(alphaEvents.length).toBe(1);
    expect(alphaEvents[0].payload.title).toBe("Alpha Secret");

    expect(betaEvents.length).toBe(1);
    expect(betaEvents[0].payload.title).toBe("Beta Secret");
  });

  it("enforces tenant hashtag key syntax thaiba:{tenant_id}:... for cluster hash slot alignment", () => {
    const manager = new RedisClusterManager();

    const keyAlpha = manager.getShardedKey("tenant-alpha", "circuit_breaker", "lock");
    const keyBeta = manager.getShardedKey("tenant-beta", "circuit_breaker", "lock");

    expect(keyAlpha).toBe("thaiba:{tenant-alpha}:circuit_breaker:lock");
    expect(keyBeta).toBe("thaiba:{tenant-beta}:circuit_breaker:lock");

    expect(keyAlpha).not.toEqual(keyBeta);
  });

  it("verifies RBAC permissions matrix for real-time services", () => {
    expect(hasPermission("super_admin", "realtime:stream")).toBe(true);
    expect(hasPermission("admin", "realtime:stream")).toBe(true);
    expect(hasPermission("principal", "realtime:stream")).toBe(true);
    expect(hasPermission("regional_admin", "realtime:stream")).toBe(true);

    expect(hasPermission("admin", "triggers:manage")).toBe(true);
    expect(hasPermission("staff", "triggers:manage")).toBe(false);

    expect(hasPermission("admin", "simulation:budget")).toBe(true);
    expect(hasPermission("staff", "simulation:budget")).toBe(false);
  });

  it("enforces SMS dispatch rate-limiting buckets per recipient", async () => {
    const router = new AutomatedNotificationRouter(new SMSGatewayAdapter());
    const trigger = {
      ruleId: "r1",
      ruleName: "Alert",
      eventType: "absenteeism",
      matched: true,
      actionChannel: "sms" as const,
      recipientGroup: "parents" as const,
      priority: "high" as const,
      payload: { studentId: "std_secure_1", recipientPhone: "+15550001111" },
      evaluatedAt: new Date().toISOString(),
    };

    for (let i = 0; i < 3; i++) {
      const res = await router.dispatchNotification("tenant-main", trigger);
      expect(res.dispatchStatus).toBe("DELIVERED");
    }

    const blockedRes = await router.dispatchNotification("tenant-main", trigger);
    expect(blockedRes.dispatchStatus).toBe("RATE_LIMITED");
  });
});
