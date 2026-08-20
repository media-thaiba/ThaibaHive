/**
 * Confidence Threshold & Hysteresis Calibration Module
 * Sprint-042 (ARES) — ARES-003
 */

import { ThreatCategory, AlertSeverityTier } from './ares-types';

export interface ConfidenceThresholdConfig {
  criticalProbabilityThreshold: number; // e.g. 0.80
  highProbabilityThreshold: number; // e.g. 0.60
  elevatedProbabilityThreshold: number; // e.g. 0.35
  minConfidenceScore: number; // e.g. 60%
  hysteresisDelta: number; // e.g. 0.15 to prevent flapping
}

export class ConfidenceThresholdEngine {
  private static instance: ConfidenceThresholdEngine | null = null;
  private config: ConfidenceThresholdConfig;
  private lastEvaluatedProbabilities: Map<ThreatCategory, number> = new Map();

  private constructor(config?: Partial<ConfidenceThresholdConfig>) {
    this.config = {
      criticalProbabilityThreshold: config?.criticalProbabilityThreshold ?? 0.80,
      highProbabilityThreshold: config?.highProbabilityThreshold ?? 0.60,
      elevatedProbabilityThreshold: config?.elevatedProbabilityThreshold ?? 0.35,
      minConfidenceScore: config?.minConfidenceScore ?? 50,
      hysteresisDelta: config?.hysteresisDelta ?? 0.12,
    };
  }

  public static getInstance(config?: Partial<ConfidenceThresholdConfig>): ConfidenceThresholdEngine {
    if (!ConfidenceThresholdEngine.instance) {
      ConfidenceThresholdEngine.instance = new ConfidenceThresholdEngine(config);
    }
    return ConfidenceThresholdEngine.instance;
  }

  public static resetInstance(): void {
    ConfidenceThresholdEngine.instance = null;
  }

  /**
   * Determines if a threat forecast should trigger an early warning alert based on probability,
   * confidence, and hysteresis check against the previous state.
   */
  public shouldAlert(
    category: ThreatCategory,
    probability: number,
    confidence: number
  ): { shouldAlert: boolean; tier: AlertSeverityTier; delta: number } {
    const lastP = this.lastEvaluatedProbabilities.get(category) ?? 0;
    const delta = probability - lastP;

    let tier: AlertSeverityTier = 'MONITOR';
    if (probability >= this.config.criticalProbabilityThreshold && confidence >= this.config.minConfidenceScore) {
      tier = 'CRITICAL_FORECAST';
    } else if (probability >= this.config.highProbabilityThreshold && confidence >= this.config.minConfidenceScore) {
      tier = 'HIGH_FORECAST';
    } else if (probability >= this.config.elevatedProbabilityThreshold) {
      tier = 'ELEVATED_RISK';
    }

    const isSignificantChange = Math.abs(delta) >= this.config.hysteresisDelta || tier === 'CRITICAL_FORECAST';
    const shouldAlert = tier !== 'MONITOR' && isSignificantChange;

    if (shouldAlert) {
      this.lastEvaluatedProbabilities.set(category, probability);
    }

    return { shouldAlert, tier, delta: Number(delta.toFixed(4)) };
  }

  public resetHistory(): void {
    this.lastEvaluatedProbabilities.clear();
  }
}
