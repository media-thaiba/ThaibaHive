/**
 * Automated Primary Database Failover Detector & Circuit Breaker
 * Part of Sprint-034: Enterprise Multi-Region Infrastructure & Automated Dependency Security
 */

import { replicaRouter } from "@/db";

export enum FailoverCircuitState {
  CLOSED = "CLOSED",     // Normal: Primary is healthy
  OPEN = "OPEN",         // Tripped: Primary failed 3+ probes, failover active
  HALF_OPEN = "HALF_OPEN" // Recovery test mode
}

export interface FailoverEvent {
  id: string;
  timestamp: string;
  previousState: FailoverCircuitState;
  newState: FailoverCircuitState;
  reason: string;
  electedReplicaId?: string;
  dispatchedWebhook: boolean;
}

export class FailoverDetector {
  private static instance: FailoverDetector;
  private state: FailoverCircuitState = FailoverCircuitState.CLOSED;
  private consecutiveFailures = 0;
  private failureThreshold = 3;
  private eventHistory: FailoverEvent[] = [];
  private activePromotionCandidate?: string;

  private constructor() {}

  public static getInstance(): FailoverDetector {
    if (!FailoverDetector.instance) {
      FailoverDetector.instance = new FailoverDetector();
    }
    return FailoverDetector.instance;
  }

  public getState(): FailoverCircuitState {
    return this.state;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public getHistory(): FailoverEvent[] {
    return [...this.eventHistory];
  }

  public getPromotionCandidate(): string | undefined {
    return this.activePromotionCandidate;
  }

  public async recordProbeResult(isPrimaryHealthy: boolean, errorDetail?: string): Promise<FailoverCircuitState> {
    if (isPrimaryHealthy) {
      if (this.state === FailoverCircuitState.HALF_OPEN || this.consecutiveFailures > 0) {
        this.transitionState(
          FailoverCircuitState.CLOSED,
          "Primary health restored after successful probes"
        );
      }
      this.consecutiveFailures = 0;
      return this.state;
    }

    // Probe failed
    this.consecutiveFailures++;
    console.warn(`[FailoverDetector] Primary probe failure ${this.consecutiveFailures}/${this.failureThreshold}: ${errorDetail}`);

    if (this.consecutiveFailures >= this.failureThreshold && this.state !== FailoverCircuitState.OPEN) {
      // Find candidate replica with least lag
      const statuses = replicaRouter.getReplicaStatuses();
      const healthyReplicas = statuses.filter(s => s.isHealthy).sort((a, b) => a.lagMs - b.lagMs);
      const elected = healthyReplicas[0]?.id;
      this.activePromotionCandidate = elected;

      await this.transitionState(
        FailoverCircuitState.OPEN,
        `Primary failed ${this.consecutiveFailures} consecutive health probes. Auto-failover triggered.`,
        elected
      );
    }

    return this.state;
  }

  public async manualPromote(replicaId: string, operator: string): Promise<FailoverEvent> {
    this.activePromotionCandidate = replicaId;
    return await this.transitionState(
      FailoverCircuitState.OPEN,
      `Manual failover promotion executed by operator: ${operator}`,
      replicaId
    );
  }

  public async resetCircuit(operator: string): Promise<FailoverEvent> {
    this.consecutiveFailures = 0;
    this.activePromotionCandidate = undefined;
    return await this.transitionState(
      FailoverCircuitState.CLOSED,
      `Failover circuit manually reset to CLOSED by operator: ${operator}`
    );
  }

  private async transitionState(
    newState: FailoverCircuitState,
    reason: string,
    electedReplicaId?: string
  ): Promise<FailoverEvent> {
    const previousState = this.state;
    this.state = newState;

    const event: FailoverEvent = {
      id: `failover-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      previousState,
      newState,
      reason,
      electedReplicaId,
      dispatchedWebhook: false,
    };

    // Dispatch webhook if configured
    const webhookUrl = process.env.DATABASE_FAILOVER_WEBHOOK_URL;
    if (webhookUrl && newState === FailoverCircuitState.OPEN) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "DATABASE_FAILOVER_TRIGGERED",
            payload: event,
          }),
        });
        event.dispatchedWebhook = true;
      } catch (err) {
        console.error("[FailoverDetector] Failed to dispatch failover webhook:", err);
      }
    }

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 50) {
      this.eventHistory.pop();
    }

    return event;
  }
}
