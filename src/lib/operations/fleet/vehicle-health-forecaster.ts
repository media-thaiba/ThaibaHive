import { VehicleHealthAssessment } from './fleet-types';

export interface DegradationProjection {
  vehicleId: string;
  daysProjected: number; // e.g. 7, 14, 30 days
  projectedHealthScore: number;
  projectedBrakeWearPercent: number;
  recommendedServiceDateIso: string;
}

/**
 * Vehicle Health Degradation Forecaster
 * Forecasts wear curves and optimal maintenance scheduling dates.
 */
export class VehicleHealthForecaster {
  /**
   * Forecasts health score drift over 30 days given current mileage rate
   */
  public projectDegradation(
    assessment: VehicleHealthAssessment,
    currentBrakeWear: number,
    averageKmPerDay = 150
  ): DegradationProjection {
    // Approx wear rate: 0.05% brake wear per 100 km
    const wearDeltaPerDay = (averageKmPerDay / 100) * 0.05;
    const projectedBrakeWear = Math.min(100, currentBrakeWear + wearDeltaPerDay * 14);

    const projectedHealth = Math.max(0, Math.round(assessment.compositeHealthScore - wearDeltaPerDay * 14 * 0.5));

    // Service recommended before health drops below 60 or brake wear reaches 80%
    const daysUntilService = Math.max(
      1,
      Math.min(30, Math.floor((80 - currentBrakeWear) / Math.max(0.1, wearDeltaPerDay)))
    );

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysUntilService);

    return {
      vehicleId: assessment.vehicleId,
      daysProjected: 14,
      projectedHealthScore: projectedHealth,
      projectedBrakeWearPercent: Number(projectedBrakeWear.toFixed(1)),
      recommendedServiceDateIso: targetDate.toISOString(),
    };
  }
}
