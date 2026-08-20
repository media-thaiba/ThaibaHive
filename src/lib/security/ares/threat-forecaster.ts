/**
 * Threat Vector Forecaster
 * Sprint-042 (ARES) — ARES-002
 */

import { randomUUID } from 'crypto';
import { ThreatCategory, PredictiveThreatForecast, AlertSeverityTier, ThreatSignalEvidence } from './ares-types';
import { BayesianThreatModel } from './bayesian-threat-model';
import { PatternAnalyzer } from './pattern-analyzer';

export class ThreatForecaster {
  private static instance: ThreatForecaster | null = null;
  private bayesianModel: BayesianThreatModel;
  private patternAnalyzer: PatternAnalyzer;

  private constructor(bayesianModel?: BayesianThreatModel, patternAnalyzer?: PatternAnalyzer) {
    this.bayesianModel = bayesianModel || BayesianThreatModel.getInstance();
    this.patternAnalyzer = patternAnalyzer || PatternAnalyzer.getInstance();
  }

  public static getInstance(bayesianModel?: BayesianThreatModel, patternAnalyzer?: PatternAnalyzer): ThreatForecaster {
    if (!ThreatForecaster.instance) {
      ThreatForecaster.instance = new ThreatForecaster(bayesianModel, patternAnalyzer);
    }
    return ThreatForecaster.instance;
  }

  public static resetInstance(): void {
    ThreatForecaster.instance = null;
  }

  /**
   * Forecasts threat probability and exploit windows 7-14 days forward
   */
  public generateForecast(
    category: ThreatCategory,
    evidenceSignals: ThreatSignalEvidence[],
    affectedAssetIds: string[] = ['asset-primary-cluster']
  ): PredictiveThreatForecast {
    const posterior = this.bayesianModel.evaluatePosterior(category, evidenceSignals);

    let severityTier: AlertSeverityTier = 'MONITOR';
    if (posterior.posteriorProbability >= 0.80 && posterior.confidenceScore >= 70) {
      severityTier = 'CRITICAL_FORECAST';
    } else if (posterior.posteriorProbability >= 0.60 && posterior.confidenceScore >= 50) {
      severityTier = 'HIGH_FORECAST';
    } else if (posterior.posteriorProbability >= 0.35) {
      severityTier = 'ELEVATED_RISK';
    }

    // Dynamic exploit window projection based on velocity of signals
    const highIntensitySignals = evidenceSignals.filter((s) => s.observedValue > 0.7);
    const projectedDays = highIntensitySignals.length > 2 ? 7 : 14;

    const recommendedMitigations = this.getRecommendedMitigations(category, severityTier);

    return {
      forecastId: `fc-${randomUUID().slice(0, 8)}`,
      threatCategory: category,
      posteriorProbability: posterior.posteriorProbability,
      confidenceScore: posterior.confidenceScore,
      severityTier,
      projectedExploitWindowDays: projectedDays,
      keyIndicators: evidenceSignals.map((s) => `${s.signalType} (weight: ${s.weight})`),
      affectedAssetIds,
      recommendedMitigations,
      calculatedAt: new Date().toISOString(),
    };
  }

  private getRecommendedMitigations(category: ThreatCategory, severity: AlertSeverityTier): string[] {
    switch (category) {
      case 'CREDENTIAL_STUFFING':
        return [
          'Enforce strict DPoP binding and WebAuthn step-up auth on all edge logins',
          'Deploy aggressive 429 rate limiting on /api/auth/* routes',
          'Proactively invalidate high-risk session tokens older than 12 hours',
        ];
      case 'ZERO_DAY_EXPLOIT':
        return [
          'Elevate micro-segmentation trust-tier to High-Trust mandatory on targeted VLANs',
          'Enable proactive WAF payload inspection filtering for CVE signature patterns',
          'Isolate affected service containers into inspection VLAN 30',
        ];
      case 'LATERAL_MOVEMENT':
        return [
          'Enforce strict mTLS service mesh verification with immediate CRL rotation',
          'Quarantine anomalous client endpoints to VLAN 99',
          'Trigger SOAR playbook COMPROMISED_ACCOUNT_LOCKDOWN on implicated service accounts',
        ];
      case 'SUPPLY_CHAIN_POISONING':
        return [
          'Trigger emergency SBOM package checksum re-verification scan',
          'Lock downstream package manager installations to approved internal artifact mirrors',
          'Verify upstream dependency signatures against transparency logs',
        ];
      default:
        return [
          'Increase security telemetry sampling frequency',
          'Enable enhanced Prometheus audit metrics',
          'Review recent Merkle audit chain logs for anomalous access',
        ];
    }
  }
}
