import { RulEstimationResult } from './predictive-types';

export class RulEstimator {
  /**
   * Estimates Remaining Useful Life (RUL) using Weibull degradation hazard modeling.
   * @param equipmentId Target equipment ID
   * @param currentOperatingHours Total runtime hours accumulated
   * @param anomalySeverityScore Degradation severity (0.0 = pristine, 1.0 = total mechanical breakdown)
   * @param nominalMeanTimeBetweenFailures MTBF in hours (e.g. 20,000 hours for industrial motors/compressors)
   * @param shapeParameterBeta Weibull shape parameter (typically beta ~ 2.5 for mechanical wear-out phase)
   */
  public static estimateRul(
    equipmentId: string,
    currentOperatingHours: number,
    anomalySeverityScore: number,
    nominalMeanTimeBetweenFailures: number = 20000,
    shapeParameterBeta: number = 2.5
  ): RulEstimationResult {
    const eta = nominalMeanTimeBetweenFailures; // Characteristic life scale parameter
    const t = Math.max(1, currentOperatingHours);

    // Hazard rate lambda(t)
    const baseHazardRate = (shapeParameterBeta / eta) * Math.pow(t / eta, shapeParameterBeta - 1);
    // Accelerated wear factor from active anomaly telemetry
    const acceleratedWearMultiplier = 1.0 + anomalySeverityScore * 8.0;
    const hazardRate = baseHazardRate * acceleratedWearMultiplier;

    // Remaining Useful Life calculation
    const theoreticalRemainingHours = Math.max(0, nominalMeanTimeBetweenFailures - currentOperatingHours);
    const degradationDampener = Math.max(0.05, 1.0 - Math.pow(anomalySeverityScore, 1.5));
    const estimatedRulHours = Math.round(theoreticalRemainingHours * degradationDampener);

    // Confidence Interval (90% CI)
    const varianceRatio = 0.15 + anomalySeverityScore * 0.25;
    const lowerBoundHours = Math.max(0, Math.round(estimatedRulHours * (1 - varianceRatio)));
    const upperBoundHours = Math.round(estimatedRulHours * (1 + varianceRatio));

    // Health Index Percentage
    const healthIndexPercent = Number(
      Math.max(0, Math.min(100, (1.0 - anomalySeverityScore) * 100 * (1 - currentOperatingHours / (nominalMeanTimeBetweenFailures * 1.5)))).toFixed(1)
    );

    const timeToCriticalFailureHours = Math.max(1, Math.round(estimatedRulHours * 0.4));
    const recommendedMaintenanceWindowDays = Math.max(1, Math.round(lowerBoundHours / 24));

    return {
      equipmentId,
      estimatedRulHours,
      confidenceInterval: {
        lowerBoundHours,
        upperBoundHours,
      },
      healthIndexPercent,
      hazardRate: Number(hazardRate.toExponential(4)),
      timeToCriticalFailureHours,
      recommendedMaintenanceWindowDays,
    };
  }
}
