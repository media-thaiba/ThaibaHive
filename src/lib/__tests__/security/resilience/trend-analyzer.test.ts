/**
 * Unit tests for ResilienceTrendAnalyzer & RemediationAdvisor (ARES-016)
 */

import { ResilienceTrendAnalyzer } from '@/lib/security/resilience/trend-analyzer';
import { ResilienceCalculator } from '@/lib/security/resilience/resilience-calculator';
import { RemediationAdvisor } from '@/lib/security/resilience/remediation-advisor';

describe('ARES-016: ResilienceTrendAnalyzer & RemediationAdvisor', () => {
  beforeEach(() => {
    ResilienceCalculator.resetInstance();
  });

  it('should analyze historical trend trajectories and calculate drift velocity', () => {
    const calc = ResilienceCalculator.getInstance();
    calc.calculateSystemResilience({ chaosPassRate: 70, mttrSeconds: 100 });
    calc.calculateSystemResilience({ chaosPassRate: 95, mttrSeconds: 30 });

    const analyzer = ResilienceTrendAnalyzer.getInstance(calc);
    const trend = analyzer.analyzeTrends();

    expect(trend.currentScore).toBeGreaterThan(70);
    expect(trend.historySnapshots.length).toBe(2);
    expect(trend.trajectory).toBe('IMPROVING');
  });

  it('should generate prioritized remediation recommendations for degraded vectors', () => {
    const calc = ResilienceCalculator.getInstance();
    const degradedSnapshot = calc.calculateSystemResilience({
      chaosPassRate: 50,
      mttrSeconds: 200,
      microSegPercent: 40,
    });

    const recommendations = RemediationAdvisor.generateRecommendations(degradedSnapshot);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].estimatedScoreImpact).toBeGreaterThan(0);
    expect(recommendations[0].remediationSteps.length).toBeGreaterThan(0);
  });
});
