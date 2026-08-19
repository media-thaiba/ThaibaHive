/**
 * Default Trust Factor Weights and Tier Classification
 * Sprint-041 (ZASM)
 */

import { TrustWeights, TrustTier } from './trust-types';

export const DEFAULT_TRUST_WEIGHTS: TrustWeights = {
  osAndPatchWeight: 25,
  endpointComplianceWeight: 20,
  dpopBindingWeight: 20,
  authStrengthWeight: 15,
  geoRiskWeight: 10,
  behavioralStabilityWeight: 10,
};

export function classifyTrustTier(score: number): TrustTier {
  if (score >= 80) return 'HIGH_TRUST';
  if (score >= 50) return 'MEDIUM_TRUST';
  if (score >= 20) return 'LOW_TRUST';
  return 'UNTRUSTED';
}
