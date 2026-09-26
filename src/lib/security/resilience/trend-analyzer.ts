/**
 * Historical Resilience Trend Analyzer
 * Sprint-042 (ARES) — ARES-016
 */

import { ResilienceCalculator } from './resilience-calculator';
import { ResilienceTrendReport } from './resilience-types';

export class ResilienceTrendAnalyzer {
  private static instance: ResilienceTrendAnalyzer | null = null;
  private calculator: ResilienceCalculator;

  private constructor(calculator?: ResilienceCalculator) {
    this.calculator = calculator || ResilienceCalculator.getInstance();
  }

  public static getInstance(calculator?: ResilienceCalculator): ResilienceTrendAnalyzer {
    if (!ResilienceTrendAnalyzer.instance) {
      ResilienceTrendAnalyzer.instance = new ResilienceTrendAnalyzer(calculator);
    }
    return ResilienceTrendAnalyzer.instance;
  }

  public analyzeTrends(): ResilienceTrendReport {
    const history = this.calculator.getSnapshotHistory();

    if (history.length === 0) {
      const current = this.calculator.calculateSystemResilience();
      return {
        currentScore: current.overallScore,
        sevenDayAverage: current.overallScore,
        thirtyDayAverage: current.overallScore,
        driftVelocityPercent: 0,
        trajectory: 'STABLE',
        historySnapshots: [{ timestamp: current.calculatedAt, score: current.overallScore }],
      };
    }

    const currentScore = history[history.length - 1].overallScore;
    const scores = history.map((h) => h.overallScore);
    const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));

    const firstScore = scores[0];
    const diff = currentScore - firstScore;
    const driftVelocityPercent = Number(((diff / (firstScore || 1)) * 100).toFixed(1));

    let trajectory: ResilienceTrendReport['trajectory'] = 'STABLE';
    if (driftVelocityPercent > 2.0) trajectory = 'IMPROVING';
    else if (driftVelocityPercent < -2.0) trajectory = 'DEGRADING';

    return {
      currentScore,
      sevenDayAverage: avg,
      thirtyDayAverage: avg,
      driftVelocityPercent,
      trajectory,
      historySnapshots: history.map((h) => ({ timestamp: h.calculatedAt, score: h.overallScore })),
    };
  }
}
