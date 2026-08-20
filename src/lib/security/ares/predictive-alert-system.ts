/**
 * Predictive Early Warning Alert System
 * Sprint-042 (ARES) — ARES-003
 */

import { randomUUID } from 'crypto';
import { EarlyWarningAlert, PredictiveThreatForecast, ThreatSignalEvidence } from './ares-types';
import { ConfidenceThresholdEngine } from './confidence-threshold';

export class PredictiveAlertSystem {
  private static instance: PredictiveAlertSystem | null = null;
  private thresholdEngine: ConfidenceThresholdEngine;
  private alertHistory: EarlyWarningAlert[] = [];
  private listeners: ((alert: EarlyWarningAlert) => void)[] = [];

  private constructor(thresholdEngine?: ConfidenceThresholdEngine) {
    this.thresholdEngine = thresholdEngine || ConfidenceThresholdEngine.getInstance();
  }

  public static getInstance(thresholdEngine?: ConfidenceThresholdEngine): PredictiveAlertSystem {
    if (!PredictiveAlertSystem.instance) {
      PredictiveAlertSystem.instance = new PredictiveAlertSystem(thresholdEngine);
    }
    return PredictiveAlertSystem.instance;
  }

  public static resetInstance(): void {
    PredictiveAlertSystem.instance = null;
  }

  public onAlert(listener: (alert: EarlyWarningAlert) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Evaluates a threat forecast and emits an early warning alert if thresholds are met.
   */
  public evaluateAndAlert(
    forecast: PredictiveThreatForecast,
    evidenceSignals: ThreatSignalEvidence[] = []
  ): EarlyWarningAlert | null {
    const check = this.thresholdEngine.shouldAlert(
      forecast.threatCategory,
      forecast.posteriorProbability,
      forecast.confidenceScore
    );

    if (!check.shouldAlert) {
      return null;
    }

    const alert: EarlyWarningAlert = {
      alertId: `alert-${randomUUID().slice(0, 8)}`,
      forecastId: forecast.forecastId,
      threatCategory: forecast.threatCategory,
      severityTier: check.tier,
      probability: forecast.posteriorProbability,
      confidenceScore: forecast.confidenceScore,
      title: `Predictive Alert: Emerging ${forecast.threatCategory.replace(/_/g, ' ')} Risk`,
      summary: `Bayesian forecasting detected an elevated threat probability of ${(
        forecast.posteriorProbability * 100
      ).toFixed(1)}% (Confidence: ${forecast.confidenceScore}%) with projected exploit window within ${
        forecast.projectedExploitWindowDays
      } days.`,
      evidenceSignals,
      recommendedActions: forecast.recommendedMitigations.map((m, idx) => ({
        actionId: `act-${randomUUID().slice(0, 8)}`,
        threatCategory: forecast.threatCategory,
        actionType: 'TIGHTEN_MICRO_SEGMENTATION',
        targetAssetOrSubnet: forecast.affectedAssetIds[0] || 'primary-cluster',
        parameters: { ruleIndex: idx },
        status: 'PROPOSED',
        justification: m,
      })),
      emittedAt: new Date().toISOString(),
      acknowledged: false,
    };

    this.alertHistory.push(alert);
    for (const listener of this.listeners) {
      try {
        listener(alert);
      } catch (err) {
        console.error('Error in alert listener:', err);
      }
    }

    return alert;
  }

  public getAlerts(): EarlyWarningAlert[] {
    return [...this.alertHistory];
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alertHistory.find((a) => a.alertId === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }
}
