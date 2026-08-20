import { AdaptiveGradientClipper } from '@/lib/operations/privacy/adaptive-gradient-clipper';
import { UtilityPrivacyOptimizer } from '@/lib/operations/privacy/utility-privacy-optimizer';

describe('AdaptiveGradientClipper & UtilityPrivacyOptimizer', () => {
  it('should clip gradients exceeding L2 threshold', () => {
    const vec = [3, 4]; // norm = 5
    const { clipped, norm, wasClipped } = AdaptiveGradientClipper.clip(vec, 2.5);

    expect(norm).toBe(5);
    expect(wasClipped).toBe(true);
    expect(clipped[0]).toBeCloseTo(1.5, 4);
    expect(clipped[1]).toBeCloseTo(2.0, 4);
  });

  it('should not clip gradients within threshold', () => {
    const vec = [1, 1]; // norm = sqrt(2) ~ 1.414
    const { clipped, wasClipped } = AdaptiveGradientClipper.clip(vec, 3.0);
    expect(wasClipped).toBe(false);
    expect(clipped).toEqual(vec);
  });

  it('should adapt threshold based on observed quantile gradient norms', () => {
    const norms = [1.2, 2.5, 3.8, 4.2, 5.0];
    const adapted = AdaptiveGradientClipper.adaptThreshold(2.0, norms, 0.5, 0.1);
    expect(adapted).toBeGreaterThan(2.0);
  });

  it('should recommend optimal DP hyperparameters', () => {
    const rec = UtilityPrivacyOptimizer.optimizeHyperparameters(10.0, 0.90, 5000, 10);
    expect(rec.recommendedEpsilonPerRound).toBeGreaterThan(0);
    expect(rec.recommendedBatchSize).toBeGreaterThan(0);
    expect(rec.expectedConvergenceAccuracy).toBeGreaterThan(0.7);
  });
});
