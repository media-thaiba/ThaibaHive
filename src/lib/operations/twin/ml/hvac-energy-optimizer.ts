import { OccupancyForecastPoint } from '../twin-types';

export interface HvacScheduleAction {
  spaceId: string;
  hour: number;
  mode: 'occupied_comfort' | 'pre_condition' | 'unoccupied_setback';
  targetTempC: number;
  coolingKwEstimate: number;
  kwhSaved: number;
}

export interface HvacOptimizationReport {
  facilityId: string;
  spaceId: string;
  totalKwhBaseline: number;
  totalKwhOptimized: number;
  kwhSaved: number;
  percentageReduction: number;
  costSavingsEstimatedUsd: number;
  schedule: HvacScheduleAction[];
}

export class HvacEnergyOptimizer {
  /**
   * Compute 24-hour predictive HVAC setbacks based on occupancy forecasts
   */
  public static optimizeHvacSchedule(
    facilityId: string,
    spaceId: string,
    forecast: OccupancyForecastPoint[],
    baseOccupiedKw: number = 8.5,
    setbackKw: number = 2.0,
    electricityRateUsdPerKwh: number = 0.15
  ): HvacOptimizationReport {
    let totalKwhBaseline = 0;
    let totalKwhOptimized = 0;
    const schedule: HvacScheduleAction[] = [];

    for (let i = 0; i < forecast.length; i++) {
      const pt = forecast[i];
      const nextPt = i + 1 < forecast.length ? forecast[i + 1] : null;

      // Baseline: assumes HVAC runs at full blast between 7 AM and 10 PM
      const isBaselineOperating = pt.hour >= 7 && pt.hour <= 22;
      const baselineKw = isBaselineOperating ? baseOccupiedKw : setbackKw;
      totalKwhBaseline += baselineKw;

      // Optimized strategy
      let mode: 'occupied_comfort' | 'pre_condition' | 'unoccupied_setback' = 'unoccupied_setback';
      let targetTemp = 26.0; // Eco setback temperature
      let kw = setbackKw;

      if (pt.predictedOccupancy >= 5) {
        // Room has occupants -> full comfort
        mode = 'occupied_comfort';
        targetTemp = 22.0;
        kw = baseOccupiedKw;
      } else if (nextPt && nextPt.predictedOccupancy >= 5) {
        // Upcoming occupants in 1 hour -> pre-condition
        mode = 'pre_condition';
        targetTemp = 23.0;
        kw = baseOccupiedKw * 0.75;
      } else {
        // Empty room -> eco setback
        mode = 'unoccupied_setback';
        targetTemp = 26.0;
        kw = setbackKw;
      }

      totalKwhOptimized += kw;
      const saved = Math.max(0, baselineKw - kw);

      schedule.push({
        spaceId,
        hour: pt.hour,
        mode,
        targetTempC: targetTemp,
        coolingKwEstimate: Number(kw.toFixed(2)),
        kwhSaved: Number(saved.toFixed(2)),
      });
    }

    const kwhSaved = Math.max(0, totalKwhBaseline - totalKwhOptimized);
    const pctReduction = totalKwhBaseline > 0 ? (kwhSaved / totalKwhBaseline) * 100 : 0;
    const costSavings = kwhSaved * electricityRateUsdPerKwh;

    return {
      facilityId,
      spaceId,
      totalKwhBaseline: Number(totalKwhBaseline.toFixed(2)),
      totalKwhOptimized: Number(totalKwhOptimized.toFixed(2)),
      kwhSaved: Number(kwhSaved.toFixed(2)),
      percentageReduction: Number(pctReduction.toFixed(1)),
      costSavingsEstimatedUsd: Number(costSavings.toFixed(2)),
      schedule,
    };
  }
}
