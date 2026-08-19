import { FailoverDetector, FailoverCircuitState } from "../failover-detector";

describe("FailoverDetector", () => {
  let detector: FailoverDetector;

  beforeEach(() => {
    detector = FailoverDetector.getInstance();
    // Reset state to closed before each test
    detector.resetCircuit("test-setup");
  });

  test("maintains CLOSED state when primary probe is healthy", async () => {
    const state = await detector.recordProbeResult(true);
    expect(state).toBe(FailoverCircuitState.CLOSED);
    expect(detector.getConsecutiveFailures()).toBe(0);
  });

  test("trips circuit breaker to OPEN after 3 consecutive failures", async () => {
    expect(detector.getState()).toBe(FailoverCircuitState.CLOSED);

    await detector.recordProbeResult(false, "Connection timeout");
    expect(detector.getConsecutiveFailures()).toBe(1);
    expect(detector.getState()).toBe(FailoverCircuitState.CLOSED);

    await detector.recordProbeResult(false, "Connection timeout");
    expect(detector.getConsecutiveFailures()).toBe(2);
    expect(detector.getState()).toBe(FailoverCircuitState.CLOSED);

    // 3rd failure trips the breaker
    const state = await detector.recordProbeResult(false, "Connection timeout");
    expect(state).toBe(FailoverCircuitState.OPEN);
    expect(detector.getState()).toBe(FailoverCircuitState.OPEN);

    const history = detector.getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].newState).toBe(FailoverCircuitState.OPEN);
  });

  test("allows manual failover promotion and reset", async () => {
    const promoteEvt = await detector.manualPromote("replica-node-1", "admin@thaiba.com");
    expect(promoteEvt.newState).toBe(FailoverCircuitState.OPEN);
    expect(promoteEvt.electedReplicaId).toBe("replica-node-1");
    expect(detector.getPromotionCandidate()).toBe("replica-node-1");

    const resetEvt = await detector.resetCircuit("admin@thaiba.com");
    expect(resetEvt.newState).toBe(FailoverCircuitState.CLOSED);
    expect(detector.getState()).toBe(FailoverCircuitState.CLOSED);
  });
});
