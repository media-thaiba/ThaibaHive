import { checkRedisCircuitBreaker, recordRedisCircuitFailure, resetRedisCircuit } from "../redis-circuit-breaker";

describe("Sprint-011 Redis Circuit Breaker Middleware", () => {
  const tenant = "inst_101";
  const feature = "copilot_query";

  beforeEach(async () => {
    await resetRedisCircuit(tenant, feature);
  });

  it("allows requests when circuit is CLOSED", async () => {
    const res = await checkRedisCircuitBreaker(tenant, feature);
    expect(res.allowed).toBe(true);
    expect(res.state).toBe("CLOSED");
  });

  it("blocks requests when circuit threshold is reached and state becomes OPEN", async () => {
    for (let i = 0; i < 5; i++) {
      await recordRedisCircuitFailure(tenant, feature);
    }

    const res = await checkRedisCircuitBreaker(tenant, feature);
    expect(res.allowed).toBe(false);
    expect(res.state).toBe("OPEN");
    expect(res.reason).toContain("Circuit breaker is OPEN");
  });

  it("resets circuit state back to CLOSED", async () => {
    await recordRedisCircuitFailure(tenant, feature);
    await resetRedisCircuit(tenant, feature);

    const res = await checkRedisCircuitBreaker(tenant, feature);
    expect(res.allowed).toBe(true);
    expect(res.state).toBe("CLOSED");
  });
});
