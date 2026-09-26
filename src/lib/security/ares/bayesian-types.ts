/**
 * Bayesian Predictive Threat Modeling Types
 * Sprint-042 (ARES)
 */

import { ThreatCategory } from './ares-types';

export interface ThreatPriorDistribution {
  category: ThreatCategory;
  priorProbability: number; // P(Threat), typically base rate (0.01 - 0.20)
  alpha: number; // Pseudo-count positive prior (Laplace smoothing)
  beta: number; // Pseudo-count negative prior
  lastUpdated: string;
}

export interface LikelihoodEstimator {
  signalType: string;
  pSignalGivenThreat: number; // P(Signal | Threat)
  pSignalGivenNoThreat: number; // P(Signal | ~Threat)
}

export interface BayesianModelConfig {
  laplaceSmoothingFactor?: number;
  minEvidenceCount?: number;
  confidenceBaseWeight?: number;
  decayRatePerDay?: number;
}

export interface PosteriorEvaluationResult {
  category: ThreatCategory;
  posteriorProbability: number; // P(Threat | Evidence)
  priorProbability: number; // P(Threat)
  likelihoodRatio: number; // P(E | T) / P(E | ~T)
  evidenceCount: number;
  confidenceScore: number; // 0 - 100%
  timestamp: string;
}
