/**
 * Departmental Carbon Emission Allocator
 * Apportions building-level emissions to occupant departments based on square footage and headcount
 */

import { DepartmentCarbonSummary } from '../eco-types';

export interface DepartmentAllocationProfile {
  departmentId: string;
  name: string;
  headcount: number;
  allocatedAreaM2: number;
  facilityShares: Array<{ facilityId: string; areaSharePercent: number }>;
}

export class DepartmentalCarbonAllocator {
  /**
   * Apportion facility-level carbon emissions across occupant departments
   */
  public static allocateEmissions(
    departments: DepartmentAllocationProfile[],
    facilityEmissionsMap: Record<string, { scope1Kg: number; scope2Kg: number; scope3Kg: number }>
  ): DepartmentCarbonSummary[] {
    const summaries: DepartmentCarbonSummary[] = [];

    for (const dept of departments) {
      let deptScope1 = 0;
      let deptScope2 = 0;
      let deptScope3 = 0;

      for (const share of dept.facilityShares) {
        const facEmissions = facilityEmissionsMap[share.facilityId] || { scope1Kg: 0, scope2Kg: 0, scope3Kg: 0 };
        const fraction = share.areaSharePercent / 100.0;

        deptScope1 += facEmissions.scope1Kg * fraction;
        deptScope2 += facEmissions.scope2Kg * fraction;
        deptScope3 += facEmissions.scope3Kg * fraction;
      }

      const gross = deptScope1 + deptScope2 + deptScope3;
      const headcount = Math.max(1, dept.headcount);
      const perCapita = Number((gross / headcount).toFixed(2));

      summaries.push({
        departmentId: dept.departmentId,
        departmentName: dept.name,
        grossEmissionsKg: Number(gross.toFixed(2)),
        netEmissionsKg: Number(gross.toFixed(2)),
        scope1Kg: Number(deptScope1.toFixed(2)),
        scope2Kg: Number(deptScope2.toFixed(2)),
        scope3Kg: Number(deptScope3.toFixed(2)),
        perCapitaKg: perCapita,
        energyUseIntensityKwhPerM2: dept.allocatedAreaM2 > 0 ? Number((gross / dept.allocatedAreaM2).toFixed(2)) : undefined,
      });
    }

    // Rank from lowest per-capita (best) or total
    return summaries.sort((a, b) => b.grossEmissionsKg - a.grossEmissionsKg);
  }
}
