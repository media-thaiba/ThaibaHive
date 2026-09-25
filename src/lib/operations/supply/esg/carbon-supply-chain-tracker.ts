import { VendorCategory } from '../supply-types';

export class CarbonSupplyChainTracker {
  private static intensityFactors: Record<VendorCategory, number> = {
    hardware: 0.25, // kg CO2e per USD
    facilities_maintenance: 0.18,
    lab_supplies: 0.20,
    office_consumables: 0.10,
    software_services: 0.04,
    logistics: 0.35,
  };

  /**
   * Calculates Scope 3 carbon emissions for a purchase order or spend item
   */
  public static calculateScope3EmissionsKg(
    category: VendorCategory,
    spendAmountUsd: number,
    recycledContentPercent = 0
  ): {
    grossEmissionsKg: number;
    recycledContentDeductionKg: number;
    netEmissionsKg: number;
  } {
    const factor = this.intensityFactors[category] || 0.15;
    const grossEmissionsKg = Number((spendAmountUsd * factor).toFixed(2));
    const recycledDeduction = Number((grossEmissionsKg * (recycledContentPercent / 100) * 0.4).toFixed(2));
    const netEmissionsKg = Number(Math.max(0, grossEmissionsKg - recycledDeduction).toFixed(2));

    return {
      grossEmissionsKg,
      recycledContentDeductionKg: recycledDeduction,
      netEmissionsKg,
    };
  }
}
