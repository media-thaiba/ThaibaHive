import { redisStateManager } from "@/lib/services/redis-state-manager";

export interface CircuitBreakerCheckResult {
  allowed: boolean;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  reason?: string;
}

export async function checkRedisCircuitBreaker(
  tenantId: string,
  feature: string
): Promise<CircuitBreakerCheckResult> {
  const status = await redisStateManager.getCircuitState(tenantId, feature);
  if (status.state === "OPEN") {
    return {
      allowed: false,
      state: "OPEN",
      reason: `Circuit breaker is OPEN for feature "${feature}" on tenant "${tenantId}". Tripped at ${status.lastTrippedAt}.`,
    };
  }

  return {
    allowed: true,
    state: status.state,
  };
}

export async function recordRedisCircuitFailure(
  tenantId: string,
  feature: string
) {
  return redisStateManager.recordFailure(tenantId, feature);
}

export async function resetRedisCircuit(
  tenantId: string,
  feature: string
) {
  return redisStateManager.resetCircuit(tenantId, feature);
}
