/**
 * IP Reputation Scoring Engine with Sliding-Window Decay
 * Sprint-038 / AGS-005
 */

import { ThreatSignal, IpReputationState, THREAT_WEIGHTS } from "./threat-heuristics";

export class IpReputationEngine {
  private static instance: IpReputationEngine | null = null;
  private ipStates: Map<string, IpReputationState> = new Map();
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window

  public static getInstance(): IpReputationEngine {
    if (!IpReputationEngine.instance) {
      IpReputationEngine.instance = new IpReputationEngine();
    }
    return IpReputationEngine.instance;
  }

  /**
   * Records a security threat signal for a given IP.
   */
  public recordSignal(
    ip: string,
    signalType: ThreatSignal["type"],
    metadata?: Record<string, unknown>,
    nowMs: number = Date.now()
  ): IpReputationState {
    let state = this.ipStates.get(ip);
    if (!state) {
      state = {
        ip,
        threatScore: 0,
        classification: "clean",
        signals: [],
        lastSeen: nowMs,
        quarantineTriggered: false,
      };
      this.ipStates.set(ip, state);
    }

    const weight = THREAT_WEIGHTS[signalType] || 5;
    state.signals.push({
      type: signalType,
      timestamp: nowMs,
      weight,
      metadata,
    });
    state.lastSeen = nowMs;

    this.recalculateScore(state, nowMs);
    return state;
  }

  /**
   * Recalculates the threat score taking into account window expiration and decay.
   */
  public recalculateScore(state: IpReputationState, nowMs: number = Date.now()): void {
    const cutoff = nowMs - this.WINDOW_MS;
    state.signals = state.signals.filter((s) => s.timestamp > cutoff);

    let rawScore = 0;
    for (const s of state.signals) {
      rawScore += s.weight;
    }

    state.threatScore = Math.min(100, rawScore);

    if (state.threatScore >= 90) {
      state.classification = "banned";
      state.quarantineTriggered = true;
    } else if (state.threatScore >= 70) {
      state.classification = "malicious";
    } else if (state.threatScore >= 30) {
      state.classification = "suspicious";
    } else {
      state.classification = "clean";
    }
  }

  /**
   * Gets current reputation state for an IP.
   */
  public getReputation(ip: string, nowMs: number = Date.now()): IpReputationState {
    const state = this.ipStates.get(ip);
    if (!state) {
      return {
        ip,
        threatScore: 0,
        classification: "clean",
        signals: [],
        lastSeen: nowMs,
        quarantineTriggered: false,
      };
    }
    this.recalculateScore(state, nowMs);
    return state;
  }

  public reset(): void {
    this.ipStates.clear();
  }
}
