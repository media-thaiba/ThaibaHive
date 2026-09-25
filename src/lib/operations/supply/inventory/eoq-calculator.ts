/**
 * Economic Order Quantity & Safety Stock Calculator
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

export interface EoqParameters {
  annualDemandUnits: number; // D
  orderCostUsd: number; // S (fixed cost per order)
  holdingCostPerUnitUsd: number; // H (carrying cost per unit per year)
}

export interface ReorderPointParameters {
  dailyUsageRate: number; // d
  leadTimeDays: number; // L
  serviceLevelZScore?: number; // Z (e.g. 1.65 for 95%, 2.33 for 99%)
  leadTimeStdDevDays?: number; // sigma_L
}

export class EoqCalculator {
  /**
   * Calculates Wilson Economic Order Quantity:
   * EOQ = sqrt((2 * D * S) / H)
   */
  public static calculateEoq(params: EoqParameters): number {
    if (params.annualDemandUnits <= 0 || params.orderCostUsd <= 0 || params.holdingCostPerUnitUsd <= 0) {
      return 1;
    }
    const eoq = Math.sqrt((2 * params.annualDemandUnits * params.orderCostUsd) / params.holdingCostPerUnitUsd);
    return Math.max(1, Math.round(eoq));
  }

  /**
   * Calculates Reorder Point:
   * ROP = (d * L) + SafetyStock
   * SafetyStock = Z * sqrt(L * sigma_d^2 + d^2 * sigma_L^2) simplified to Z * d * sigma_L
   */
  public static calculateReorderPoint(params: ReorderPointParameters): {
    reorderPoint: number;
    safetyStock: number;
    leadTimeDemand: number;
  } {
    const leadTimeDemand = params.dailyUsageRate * params.leadTimeDays;
    const zScore = params.serviceLevelZScore || 1.65; // default 95% service level
    const stdDev = params.leadTimeStdDevDays || 1.0;
    const safetyStock = Math.round(zScore * params.dailyUsageRate * stdDev);
    const reorderPoint = Math.round(leadTimeDemand + safetyStock);

    return {
      reorderPoint,
      safetyStock,
      leadTimeDemand: Math.round(leadTimeDemand),
    };
  }
}
