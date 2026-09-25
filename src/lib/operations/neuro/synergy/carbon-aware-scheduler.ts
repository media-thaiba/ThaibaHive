import { NeuroJobItem } from '../neuro-types';

export interface GridCarbonTelemetry {
  timestamp: string;
  solarGenerationKw: number;
  campusBaseLoadKw: number;
  netRenewableSurplusKw: number;
  gridCarbonIntensityGCO2PerKwh: number; // e.g. 450 gCO2/kWh from fossil grid, 25 gCO2/kWh from solar
}

export interface CarbonSchedulingRecommendation {
  jobId: string;
  shouldExecuteNow: boolean;
  recommendedStartWindow: string;
  estimatedPowerConsumptionKwh: number;
  estimatedCarbonEmissionsKg: number;
  potentialCarbonSavingsKg: number;
  greenComputeCertified: boolean;
  rationale: string;
}

export class CarbonAwareScheduler {
  /**
   * Evaluates if a batch job should run immediately or wait for peak solar window.
   */
  public static evaluateJobCarbonFootprint(
    job: NeuroJobItem,
    estimatedRuntimeHours: number = 4.0,
    telemetry: GridCarbonTelemetry = {
      timestamp: new Date().toISOString(),
      solarGenerationKw: 450,
      campusBaseLoadKw: 300,
      netRenewableSurplusKw: 150,
      gridCarbonIntensityGCO2PerKwh: 380,
    }
  ): CarbonSchedulingRecommendation {
    // 1 GPU consumes ~0.4 kW (400W)
    const totalPowerKw = job.requestedGpus * 0.4;
    const totalEnergyKwh = totalPowerKw * estimatedRuntimeHours;

    const isSolarSurplus = telemetry.netRenewableSurplusKw >= totalPowerKw;
    const isUrgent = job.priority === 'urgent' || job.priority === 'high';

    // Emissions under standard grid vs solar surplus
    const gridEmissionsKg = (totalEnergyKwh * telemetry.gridCarbonIntensityGCO2PerKwh) / 1000;
    const solarEmissionsKg = (totalEnergyKwh * 25) / 1000;
    const savingsKg = Number((gridEmissionsKg - solarEmissionsKg).toFixed(2));

    if (isSolarSurplus || isUrgent) {
      return {
        jobId: job.id,
        shouldExecuteNow: true,
        recommendedStartWindow: 'IMMEDIATE',
        estimatedPowerConsumptionKwh: Number(totalEnergyKwh.toFixed(2)),
        estimatedCarbonEmissionsKg: isSolarSurplus ? Number(solarEmissionsKg.toFixed(2)) : Number(gridEmissionsKg.toFixed(2)),
        potentialCarbonSavingsKg: savingsKg,
        greenComputeCertified: isSolarSurplus,
        rationale: isSolarSurplus
          ? `Running on 100% campus solar surplus (${telemetry.netRenewableSurplusKw} kW available). Green Compute Certified.`
          : 'High-priority job executed immediately on baseline power.',
      };
    }

    return {
      jobId: job.id,
      shouldExecuteNow: false,
      recommendedStartWindow: 'TOMORROW_11_00_AM_SOLAR_PEAK',
      estimatedPowerConsumptionKwh: Number(totalEnergyKwh.toFixed(2)),
      estimatedCarbonEmissionsKg: Number(gridEmissionsKg.toFixed(2)),
      potentialCarbonSavingsKg: savingsKg,
      greenComputeCertified: false,
      rationale: `Deferring non-urgent batch training until peak solar window to save ${savingsKg} kg CO2e.`,
    };
  }
}
