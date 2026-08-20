/**
 * Bayesian Threat Probability Model & Prior Calibration Engine
 * Sprint-042 (ARES) — ARES-001
 */

import { ThreatCategory, ThreatSignalEvidence } from './ares-types';
import {
  ThreatPriorDistribution,
  LikelihoodEstimator,
  BayesianModelConfig,
  PosteriorEvaluationResult,
} from './bayesian-types';

export const DEFAULT_PRIORS: Record<ThreatCategory, ThreatPriorDistribution> = {
  CREDENTIAL_STUFFING: {
    category: 'CREDENTIAL_STUFFING',
    priorProbability: 0.15,
    alpha: 15,
    beta: 85,
    lastUpdated: new Date().toISOString(),
  },
  ZERO_DAY_EXPLOIT: {
    category: 'ZERO_DAY_EXPLOIT',
    priorProbability: 0.05,
    alpha: 5,
    beta: 95,
    lastUpdated: new Date().toISOString(),
  },
  LATERAL_MOVEMENT: {
    category: 'LATERAL_MOVEMENT',
    priorProbability: 0.08,
    alpha: 8,
    beta: 92,
    lastUpdated: new Date().toISOString(),
  },
  DATA_EXFILTRATION: {
    category: 'DATA_EXFILTRATION',
    priorProbability: 0.06,
    alpha: 6,
    beta: 94,
    lastUpdated: new Date().toISOString(),
  },
  SUPPLY_CHAIN_POISONING: {
    category: 'SUPPLY_CHAIN_POISONING',
    priorProbability: 0.04,
    alpha: 4,
    beta: 96,
    lastUpdated: new Date().toISOString(),
  },
  DISTRIBUTED_DENIAL_OF_SERVICE: {
    category: 'DISTRIBUTED_DENIAL_OF_SERVICE',
    priorProbability: 0.10,
    alpha: 10,
    beta: 90,
    lastUpdated: new Date().toISOString(),
  },
  RANSOMWARE_IMPACT: {
    category: 'RANSOMWARE_IMPACT',
    priorProbability: 0.03,
    alpha: 3,
    beta: 97,
    lastUpdated: new Date().toISOString(),
  },
  PRIVILEGE_ESCALATION: {
    category: 'PRIVILEGE_ESCALATION',
    priorProbability: 0.07,
    alpha: 7,
    beta: 93,
    lastUpdated: new Date().toISOString(),
  },
};

export const DEFAULT_LIKELIHOODS: Record<string, LikelihoodEstimator> = {
  FAILED_AUTH_SPIKE: { signalType: 'FAILED_AUTH_SPIKE', pSignalGivenThreat: 0.85, pSignalGivenNoThreat: 0.05 },
  IMPOSSIBLE_TRAVEL: { signalType: 'IMPOSSIBLE_TRAVEL', pSignalGivenThreat: 0.78, pSignalGivenNoThreat: 0.02 },
  NEW_CVE_DISCLOSED: { signalType: 'NEW_CVE_DISCLOSED', pSignalGivenThreat: 0.88, pSignalGivenNoThreat: 0.10 },
  ANOMALOUS_PORT_SCAN: { signalType: 'ANOMALOUS_PORT_SCAN', pSignalGivenThreat: 0.75, pSignalGivenNoThreat: 0.04 },
  UNUSUAL_OUTBOUND_EGRESS: { signalType: 'UNUSUAL_OUTBOUND_EGRESS', pSignalGivenThreat: 0.82, pSignalGivenNoThreat: 0.03 },
  DEP_INTEGRITY_MISMATCH: { signalType: 'DEP_INTEGRITY_MISMATCH', pSignalGivenThreat: 0.90, pSignalGivenNoThreat: 0.01 },
  HIGH_VOLUME_SYN_FLOOD: { signalType: 'HIGH_VOLUME_SYN_FLOOD', pSignalGivenThreat: 0.95, pSignalGivenNoThreat: 0.02 },
  UNAUTHORIZED_SUDO_BURST: { signalType: 'UNAUTHORIZED_SUDO_BURST', pSignalGivenThreat: 0.80, pSignalGivenNoThreat: 0.05 },
};

export class BayesianThreatModel {
  private static instance: BayesianThreatModel | null = null;
  private priors: Map<ThreatCategory, ThreatPriorDistribution>;
  private likelihoods: Map<string, LikelihoodEstimator>;
  private config: Required<BayesianModelConfig>;

  private constructor(config?: BayesianModelConfig) {
    this.config = {
      laplaceSmoothingFactor: config?.laplaceSmoothingFactor ?? 1.0,
      minEvidenceCount: config?.minEvidenceCount ?? 1,
      confidenceBaseWeight: config?.confidenceBaseWeight ?? 20,
      decayRatePerDay: config?.decayRatePerDay ?? 0.02,
    };

    this.priors = new Map(Object.entries(DEFAULT_PRIORS) as [ThreatCategory, ThreatPriorDistribution][]);
    this.likelihoods = new Map(Object.entries(DEFAULT_LIKELIHOODS));
  }

  public static getInstance(config?: BayesianModelConfig): BayesianThreatModel {
    if (!BayesianThreatModel.instance) {
      BayesianThreatModel.instance = new BayesianThreatModel(config);
    }
    return BayesianThreatModel.instance;
  }

  public static resetInstance(): void {
    BayesianThreatModel.instance = null;
  }

  /**
   * Computes posterior probability P(Threat | Evidence) using Bayes' Theorem
   * with Laplace smoothing and likelihood updates:
   * P(T | E) = P(E | T) * P(T) / [ P(E | T)*P(T) + P(E | ~T)*P(~T) ]
   */
  public evaluatePosterior(
    category: ThreatCategory,
    evidenceSignals: ThreatSignalEvidence[]
  ): PosteriorEvaluationResult {
    const priorDist = this.priors.get(category) || DEFAULT_PRIORS[category];
    const priorP = Math.min(Math.max(priorDist.priorProbability, 0.001), 0.999);
    const priorNotP = 1 - priorP;

    if (!evidenceSignals || evidenceSignals.length === 0) {
      return {
        category,
        posteriorProbability: priorP,
        priorProbability: priorP,
        likelihoodRatio: 1.0,
        evidenceCount: 0,
        confidenceScore: 30,
        timestamp: new Date().toISOString(),
      };
    }

    let logLikelihoodGivenThreat = 0;
    let logLikelihoodGivenNotThreat = 0;
    let totalWeight = 0;

    for (const sig of evidenceSignals) {
      const estimator = this.likelihoods.get(sig.signalType) || {
        signalType: sig.signalType,
        pSignalGivenThreat: 0.70,
        pSignalGivenNoThreat: 0.10,
      };

      const weight = Math.min(Math.max(sig.weight, 0.1), 1.0);
      const intensity = Math.min(Math.max(sig.observedValue, 0.01), 1.0);
      totalWeight += weight;

      // Calculate weighted probabilities
      const pT = Math.min(Math.max(estimator.pSignalGivenThreat * intensity, 0.001), 0.999);
      const pNotT = Math.min(Math.max(estimator.pSignalGivenNoThreat * intensity, 0.001), 0.999);

      logLikelihoodGivenThreat += weight * Math.log(pT);
      logLikelihoodGivenNotThreat += weight * Math.log(pNotT);
    }

    // Likelihood ratio L = P(E | T) / P(E | ~T)
    const logOddsRatio = logLikelihoodGivenThreat - logLikelihoodGivenNotThreat;
    const likelihoodRatio = Math.exp(Math.min(Math.max(logOddsRatio, -20), 20));

    // Posterior odds = Prior Odds * Likelihood Ratio
    const priorOdds = priorP / priorNotP;
    const posteriorOdds = priorOdds * likelihoodRatio;
    const rawPosterior = posteriorOdds / (1 + posteriorOdds);

    // Apply Laplace smoothing
    const smoothedPosterior =
      (rawPosterior * evidenceSignals.length + this.config.laplaceSmoothingFactor * priorP) /
      (evidenceSignals.length + this.config.laplaceSmoothingFactor);

    // Clamp to valid range [0.001, 0.999]
    const posteriorProbability = Number(Math.min(Math.max(smoothedPosterior, 0.001), 0.999).toFixed(4));

    // Confidence score based on evidence volume and total weight
    const rawConfidence = Math.min(100, Math.round(this.config.confidenceBaseWeight + totalWeight * 18 + evidenceSignals.length * 5));
    const confidenceScore = Math.max(10, Math.min(100, rawConfidence));

    return {
      category,
      posteriorProbability,
      priorProbability: priorP,
      likelihoodRatio: Number(likelihoodRatio.toFixed(4)),
      evidenceCount: evidenceSignals.length,
      confidenceScore,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calibrates prior probability with observed historical incidence counts
   */
  public calibratePrior(category: ThreatCategory, observedIncidents: number, totalPeriods: number): ThreatPriorDistribution {
    const existing = this.priors.get(category) || DEFAULT_PRIORS[category];
    const alpha = existing.alpha + observedIncidents;
    const beta = existing.beta + (totalPeriods - observedIncidents);
    const newPrior = Number((alpha / (alpha + beta)).toFixed(4));

    const updated: ThreatPriorDistribution = {
      category,
      priorProbability: Math.min(Math.max(newPrior, 0.01), 0.95),
      alpha,
      beta,
      lastUpdated: new Date().toISOString(),
    };

    this.priors.set(category, updated);
    return updated;
  }

  public getPriors(): Map<ThreatCategory, ThreatPriorDistribution> {
    return new Map(this.priors);
  }

  public registerLikelihoodEstimator(estimator: LikelihoodEstimator): void {
    this.likelihoods.set(estimator.signalType, estimator);
  }
}
