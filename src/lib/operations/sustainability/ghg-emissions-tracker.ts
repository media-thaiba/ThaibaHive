import { ScopeEmissions } from './sustainability-types';
import { CarbonCalculator } from './carbon-calculator';

export interface DailyEmissionsLog {
  dateIso: string;
  campusId: string;
  emissions: ScopeEmissions;
  savingsVsBaselineKgCo2e: number;
}

/**
 * Greenhouse Gas (GHG) Emissions Time-Series Tracker
 */
export class GhgEmissionsTracker {
  private calculator = new CarbonCalculator();
  private history: DailyEmissionsLog[] = [];

  public logDailyEmissions(
    campusId: string,
    dateIso: string,
    fuelLiters: number,
    gridKwh: number,
    cloudCoreHours: number,
    baselineKwh = 1000
  ): DailyEmissionsLog {
    const emissions = this.calculator.calculateEmissions({
      fuelLitersConsumed: fuelLiters,
      gridElectricityKwh: gridKwh,
      cloudComputeCoreHours: cloudCoreHours,
    });

    const baselineEmissions = this.calculator.calculateEmissions({
      fuelLitersConsumed: fuelLiters * 1.25, // Unoptimized fleet
      gridElectricityKwh: baselineKwh,
      cloudComputeCoreHours: cloudCoreHours * 1.4, // Unoptimized cloud
    });

    const savingsKg = Math.max(0, baselineEmissions.totalKgCo2e - emissions.totalKgCo2e);

    const log: DailyEmissionsLog = {
      dateIso,
      campusId,
      emissions,
      savingsVsBaselineKgCo2e: Number(savingsKg.toFixed(2)),
    };

    this.history.push(log);
    return log;
  }

  public getHistory(campusId?: string): DailyEmissionsLog[] {
    if (campusId) {
      return this.history.filter((h) => h.campusId === campusId);
    }
    return this.history;
  }
}
