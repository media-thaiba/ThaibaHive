/**
 * Adaptive Edge Gateway Circuit Breaker with Source Merkle Audit Events & State Sync
 * Sprint-038 / AGS-010 & Sprint-039 / TIF-014 (TD-017)
 */

import { DegradedModeController } from "./degraded-mode";
import { CanaryProbeCollector } from "./canary-probes";
import { logGatewayThreatEvent } from "./threat-audit-events";
import { QuarantinePubSubAdapter } from "./quarantine-pubsub";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  errorThreshold: number; // e.g. 0.05 for 5% error rate
  latencyThresholdMs: number; // e.g. 200ms
  recoveryProbeCount: number; // e.g. 3 consecutive good probes to close
  halfOpenTimeoutMs: number; // e.g. 15_000
}

export class GatewayCircuitBreaker {
  private static instance: GatewayCircuitBreaker | null = null;
  private state: CircuitBreakerState = "CLOSED";
  private consecutiveSuccesses: number = 0;
  private consecutiveFailures: number = 0;
  private stateChangedAt: number = Date.now();
  private degradedController: DegradedModeController;
  private canaryCollector: CanaryProbeCollector;

  private config: CircuitBreakerConfig = {
    errorThreshold: 0.05,
    latencyThresholdMs: 200,
    recoveryProbeCount: 3,
    halfOpenTimeoutMs: 15_000,
  };

  constructor(degradedController?: DegradedModeController, canaryCollector?: CanaryProbeCollector) {
    this.degradedController = degradedController || DegradedModeController.getInstance();
    this.canaryCollector = canaryCollector || CanaryProbeCollector.getInstance();
  }

  public static getInstance(): GatewayCircuitBreaker {
    if (!GatewayCircuitBreaker.instance) {
      GatewayCircuitBreaker.instance = new GatewayCircuitBreaker();
    }
    return GatewayCircuitBreaker.instance;
  }

  public getState(): CircuitBreakerState {
    // Check if OPEN state should transition to HALF_OPEN
    if (this.state === "OPEN" && Date.now() - this.stateChangedAt > this.config.halfOpenTimeoutMs) {
      this.transitionTo("HALF_OPEN", "Half-open trial period begun");
    }
    return this.state;
  }

  public transitionTo(newState: CircuitBreakerState, reason: string): void {
    const previousState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();

    if (newState === "OPEN") {
      this.degradedController.activate(`Circuit breaker tripped to OPEN: ${reason}`);

      // Emit source Merkle audit event (TIF-014 / TD-017)
      logGatewayThreatEvent({
        eventType: "gateway.circuit.tripped",
        circuitState: "OPEN",
        reason: `Gateway circuit breaker tripped from ${previousState} to OPEN: ${reason}`,
        metadata: { previousState, newState: "OPEN" },
      }).catch(() => {});

      // Broadcast state to mesh
      try {
        QuarantinePubSubAdapter.getInstance().publish("CIRCUIT_BREAKER_STATE", {
          circuitState: "OPEN",
        }).catch(() => {});
      } catch {
        // Fallback
      }
    } else if (newState === "CLOSED") {
      this.degradedController.deactivate();
      this.consecutiveFailures = 0;

      // Emit source Merkle audit event (TIF-014 / TD-017)
      logGatewayThreatEvent({
        eventType: "gateway.circuit.reset",
        circuitState: "CLOSED",
        reason: `Gateway circuit breaker reset from ${previousState} to CLOSED: ${reason}`,
        metadata: { previousState, newState: "CLOSED" },
      }).catch(() => {});

      // Broadcast state to mesh
      try {
        QuarantinePubSubAdapter.getInstance().publish("CIRCUIT_BREAKER_STATE", {
          circuitState: "CLOSED",
        }).catch(() => {});
      } catch {
        // Fallback
      }
    }
  }

  /**
   * Evaluates system health signals from canary probes and adjusts state accordingly.
   */
  public evaluateHealthSignals(nowMs: number = Date.now()): CircuitBreakerState {
    const summary = this.canaryCollector.getSummary(30_000, nowMs);

    if (summary.totalProbes === 0) {
      return this.state;
    }

    const isDegraded = summary.errorRate >= this.config.errorThreshold || summary.p95LatencyMs >= this.config.latencyThresholdMs;

    if (this.state === "CLOSED") {
      if (isDegraded) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3) {
          this.transitionTo(
            "OPEN",
            `Canary health failure: error rate ${(summary.errorRate * 100).toFixed(1)}%, p95 latency ${summary.p95LatencyMs}ms`
          );
        }
      } else {
        this.consecutiveFailures = 0;
      }
    } else if (this.state === "HALF_OPEN") {
      if (isDegraded) {
        this.transitionTo("OPEN", "Failed probe during HALF_OPEN trial");
        this.consecutiveSuccesses = 0;
      } else {
        this.consecutiveSuccesses++;
        if (this.consecutiveSuccesses >= this.config.recoveryProbeCount) {
          this.transitionTo("CLOSED", "Health stabilized during HALF_OPEN period");
          this.consecutiveSuccesses = 0;
        }
      }
    }

    return this.state;
  }

  public manualTrip(reason: string = "Admin manual override"): void {
    this.transitionTo("OPEN", reason);
  }

  public manualReset(): void {
    this.transitionTo("CLOSED", "Admin manual reset");
  }

  public reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.degradedController.deactivate();
  }
}
