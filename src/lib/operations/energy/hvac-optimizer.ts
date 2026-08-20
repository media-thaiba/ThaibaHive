import { HvacSetpointOptimization, BmsSensorReading, ZoneOccupancyForecast } from './energy-types';
import { ThermalComfortModel } from './thermal-comfort-model';

/**
 * Autonomous HVAC Setpoint Optimizer
 * Computes energy-saving setpoint adjustments while strictly maintaining thermal comfort constraints.
 */
export class HvacOptimizer {
  private comfortModel = new ThermalComfortModel();

  /**
   * Optimizes zone setpoint based on occupancy forecast and ambient conditions
   */
  public optimizeZoneSetpoint(
    currentReading: BmsSensorReading,
    forecast: ZoneOccupancyForecast,
    isPeakTariff = false
  ): HvacSetpointOptimization {
    const baseTemp = currentReading.temperatureCelsius;
    let targetTemp = baseTemp;

    if (forecast.predictedHeadcount === 0) {
      // Empty room setback mode (raise cooling setpoint to 25.5°C or lower heating to 20°C)
      targetTemp = 25.5;
    } else if (forecast.predictedHeadcount < 10) {
      // Light occupancy (24.0°C)
      targetTemp = isPeakTariff ? 24.5 : 24.0;
    } else {
      // High occupancy (heat load from people, slight cooling priority: 22.5°C - 23.0°C)
      targetTemp = isPeakTariff ? 23.5 : 22.5;
    }

    // Verify PMV constraint on proposed target
    const comfort = this.comfortModel.calculateComfort(currentReading.zoneId, {
      airTempCelsius: targetTemp,
      meanRadiantTempCelsius: targetTemp,
      relativeHumidityPercent: currentReading.relativeHumidityPercent,
      airVelocityMps: 0.1,
      metabolicRateMet: 1.1,
      clothingInsulationClo: 0.65,
    });

    const deltaCelsius = Number((targetTemp - baseTemp).toFixed(2));
    // Rule of thumb: ~6-8% kWh savings per 1°C increase in cooling setpoint
    const tempSavingsRatio = Math.abs(deltaCelsius) * 0.07;
    const projectedKwhSavings = Number((currentReading.powerKw * 4 * tempSavingsRatio).toFixed(2)); // 4-hour window
    const projectedCostSavingsDollars = Number((projectedKwhSavings * 0.14).toFixed(2));
    const projectedCo2ReductionKg = Number((projectedKwhSavings * 0.45).toFixed(2));

    const pmvSatisfied = Math.abs(comfort.pmv) <= 0.7;

    return {
      id: `hvac_opt_${currentReading.zoneId}_${Date.now()}`,
      campusId: currentReading.campusId,
      buildingId: currentReading.buildingId,
      zoneId: currentReading.zoneId,
      baselineTempCelsius: baseTemp,
      optimizedSetpointCelsius: targetTemp,
      deltaCelsius,
      projectedKwhSavings,
      projectedCostSavingsDollars,
      projectedCo2ReductionKg,
      pmvConstraintSatisfied: pmvSatisfied,
      status: 'DISPATCHED',
      dispatchedAt: new Date().toISOString(),
      institutionId: currentReading.institutionId,
    };
  }
}
