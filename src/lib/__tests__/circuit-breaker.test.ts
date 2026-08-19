import { QueryCircuitBreaker } from "../resilience/query-circuit-breaker";

describe("FED-007: Query Performance Circuit Breaker Middleware Test Suite", () => {
  it("executes functions normally when circuit is CLOSED", async () => {
    const cb = new QueryCircuitBreaker({
      serviceName: "test-db",
      maxFailureRate: 0.2,
      maxMedianLatencyMs: 1000,
      cooldownPeriodSec: 10,
    });

    const result = await cb.execute(async () => "DB_RESULT");
    expect(result).toBe("DB_RESULT");
    expect(cb.getState().state).toBe("CLOSED");
  });

  it("trips circuit to OPEN when failure rate threshold is exceeded", async () => {
    const cb = new QueryCircuitBreaker({
      serviceName: "test-db",
      maxFailureRate: 0.2,
      maxMedianLatencyMs: 1000,
      cooldownPeriodSec: 10,
    });

    for (let i = 0; i < 5; i++) {
      try {
        await cb.execute(async () => {
          throw new Error("DB Error");
        });
      } catch {}
    }

    expect(cb.getState().state).toBe("OPEN");

    // Next execution should fast-fail or use fallback
    const fallbackResult = await cb.execute(
      async () => "DB_PRIMARY",
      async () => "STALE_FALLBACK"
    );
    expect(fallbackResult).toBe("STALE_FALLBACK");
  });

  it("resets circuit breaker on manual admin command or recovery", async () => {
    const cb = new QueryCircuitBreaker({
      serviceName: "test-db",
      maxFailureRate: 0.2,
      maxMedianLatencyMs: 1000,
      cooldownPeriodSec: 10,
    });

    cb.tripCircuit();
    expect(cb.getState().state).toBe("OPEN");

    cb.resetCircuitBreaker();
    expect(cb.getState().state).toBe("CLOSED");
  });

  it("bypasses circuit breaker when bypass flag is true", async () => {
    const cb = new QueryCircuitBreaker({
      serviceName: "test-db",
      maxFailureRate: 0.2,
      maxMedianLatencyMs: 1000,
      cooldownPeriodSec: 10,
    });

    cb.tripCircuit();
    const result = await cb.execute(async () => "DIRECT_QUERY", undefined, true);
    expect(result).toBe("DIRECT_QUERY");
  });
});
