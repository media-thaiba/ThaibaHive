/**
 * Unit tests for ResilienceCalculator & BenchmarkEngine (ARES-015)
 */

import { ResilienceCalculator } from '@/lib/security/resilience/resilience-calculator';

describe('ARES-015: ResilienceCalculator', () => {
  beforeEach(() => {
    ResilienceCalculator.resetInstance();
  });

  it('should calculate composite resilience score and assign RESILIENT tier when metrics are high', () => {
    const calc = ResilienceCalculator.getInstance();
    const snapshot = calc.calculateSystemResilience({
      chaosPassRate: 98,
      redundancyNodes: 3,
      mttrSeconds: 30,
      mtlsPercent: 100,
      microSegPercent: 95,
      forecastAccuracy: 90,
      preemptiveRate: 92,
      merkleIntact: true,
      zkpPassRate: 100,
    });

    expect(snapshot.overallScore).toBeGreaterThanOrEqual(85);
    expect(snapshot.tier).toBe('RESILIENT');
    expect(snapshot.vectors.faultToleranceAndChaos.weight).toBe(0.30);
    expect(snapshot.vectors.recoveryTimeAndMTTR.weight).toBe(0.25);
    expect(calc.getSnapshotHistory().length).toBe(1);
  });

  it('should downgrade tier to DEGRADED or CRITICAL when critical vectors fail', () => {
    const calc = ResilienceCalculator.getInstance();
    const snapshot = calc.calculateSystemResilience({
      chaosPassRate: 40,
      redundancyNodes: 1,
      mttrSeconds: 250,
      mtlsPercent: 40,
      microSegPercent: 20,
      merkleIntact: false,
    });

    expect(snapshot.overallScore).toBeLessThan(70);
    expect(['DEGRADED', 'CRITICAL']).toContain(snapshot.tier);
    expect(snapshot.unresolvedGapsCount).toBeGreaterThan(0);
  });
});
