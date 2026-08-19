import { hasPermission } from "@thaiba/auth/roles";
import { redisStateManager } from "@/lib/services/redis-state-manager";

describe("Sprint-011 AI Copilot & Redis Security Audits", () => {
  it("enforces strict tenant key isolation in Redis state manager", async () => {
    await redisStateManager.recordFailure("tenant_alpha", "copilot_query", 1, 300);

    const alphaState = await redisStateManager.getCircuitState("tenant_alpha", "copilot_query");
    const betaState = await redisStateManager.getCircuitState("tenant_beta", "copilot_query");

    expect(alphaState.failureCount).toBe(1);
    expect(betaState.failureCount).toBe(0);
  });

  it("verifies copilot RBAC permissions for authorized and unauthorized roles", () => {
    // Super admin has full permissions
    expect(hasPermission("super_admin", "copilot:interact")).toBe(true);
    expect(hasPermission("super_admin", "agent:manage")).toBe(true);

    // Regional admin has copilot permissions
    expect(hasPermission("regional_admin", "copilot:view")).toBe(true);
    expect(hasPermission("regional_admin", "copilot:interact")).toBe(true);
    expect(hasPermission("regional_admin", "agent:manage")).toBe(true);
    expect(hasPermission("regional_admin", "analytics:timeseries")).toBe(true);

    // Staff role lacks copilot management permissions
    expect(hasPermission("staff", "agent:manage")).toBe(false);
    expect(hasPermission("staff", "analytics:timeseries")).toBe(false);
  });
});
