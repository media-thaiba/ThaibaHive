import { ScopeEmissions } from './sustainability-types';

export interface CarbonInputData {
  fuelLitersConsumed: number; // Diesel/Petrol liters
  gridElectricityKwh: number; // Grid electricity imported
  cloudComputeCoreHours: number; // vCPU-hours in cloud regions
  regionalGridEmissionFactorKgPerKwh?: number; // default 0.475 kg CO2e / kWh
}

/**
 * Multi-Source Carbon Footprint Calculator (GHG Protocol Scope 1, 2, 3)
 */
export class CarbonCalculator {
  private dieselEmissionFactorKgPerLiter = 2.68; // EPA / DEFRA standard
  private cloudEmissionFactorKgPerVcpuHour = 0.0035; // Cloud carbon footprint benchmark

  /**
   * Calculates comprehensive Scope 1, 2, and 3 GHG emissions
   */
  public calculateEmissions(inputs: CarbonInputData): ScopeEmissions {
    const gridFactor = inputs.regionalGridEmissionFactorKgPerKwh ?? 0.475;

    const scope1 = inputs.fuelLitersConsumed * this.dieselEmissionFactorKgPerLiter;
    const scope2 = inputs.gridElectricityKwh * gridFactor;
    const scope3 = inputs.cloudComputeCoreHours * this.cloudEmissionFactorKgPerVcpuHour;

    const totalKg = scope1 + scope2 + scope3;
    const totalTons = totalKg / 1000.0;

    return {
      scope1FleetFuelKgCo2e: Number(scope1.toFixed(2)),
      scope2GridElectricityKgCo2e: Number(scope2.toFixed(2)),
      scope3CloudComputeKgCo2e: Number(scope3.toFixed(2)),
      totalKgCo2e: Number(totalKg.toFixed(2)),
      totalMetricTonsCo2e: Number(totalTons.toFixed(3)),
    };
  }
}
