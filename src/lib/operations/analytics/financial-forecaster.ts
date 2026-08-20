import { InstitutionalFinancialForecast } from './analytics-types';

/**
 * Federated Institutional Financial Forecaster
 */
export class FinancialForecaster {
  /**
   * Forecast multi-term budget variance and revenue streams
   */
  public static forecastFinancials(
    campusId: string,
    enrolledStudents: number,
    averageTuitionPerStudent: number,
    baselineOpexMonthly: number,
    forecastQuarter: string = '2026-Q4'
  ): InstitutionalFinancialForecast {
    // Revenue = enrolled * tuition
    const projectedTuitionRevenue = enrolledStudents * averageTuitionPerStudent;
    // Opex for quarter (3 months) + seasonal scaling
    const projectedOpexExpenditure = baselineOpexMonthly * 3 * 1.05;
    const projectedNetMargin = projectedTuitionRevenue - projectedOpexExpenditure;

    // Confidence interval (+- 5%)
    const ciLower = Number((projectedNetMargin * 0.95).toFixed(2));
    const ciUpper = Number((projectedNetMargin * 1.05).toFixed(2));

    const resourceBottlenecks: string[] = [];
    if (projectedNetMargin < 0) {
      resourceBottlenecks.push(`Projected quarterly budget deficit of $${Math.abs(projectedNetMargin).toLocaleString()}`);
    } else if (projectedNetMargin / projectedTuitionRevenue < 0.10) {
      resourceBottlenecks.push('Tight operational net margin (< 10%)');
    }

    return {
      campusId,
      forecastQuarter,
      projectedTuitionRevenue: Number(projectedTuitionRevenue.toFixed(2)),
      projectedOpexExpenditure: Number(projectedOpexExpenditure.toFixed(2)),
      projectedNetMargin: Number(projectedNetMargin.toFixed(2)),
      confidenceInterval: [ciLower, ciUpper],
      resourceBottlenecks,
    };
  }
}
