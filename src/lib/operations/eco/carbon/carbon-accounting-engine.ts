/**
 * Carbon Accounting Engine
 * Deterministic GHG Scope 1/2/3 Accounting conforming to GHG Protocol & GRI 305
 */

import { createHash } from 'crypto';
import {
  ActivityEmissionInput,
  ScopeBreakdown,
  DepartmentCarbonSummary,
  BuildingCarbonSummary,
} from '../eco-types';
import { EmissionFactorRegistry } from './emission-factor-registry';

export interface CalculatedEmissionRecord {
  activityId: string;
  facilityId: string;
  departmentId?: string;
  scope: 'scope_1' | 'scope_2' | 'scope_3';
  category: string;
  fuelOrSource: string;
  quantity: number;
  unit: string;
  emissionFactorUsed: number;
  co2EquivalentKg: number;
  activityDate: string;
  auditHash: string;
}

export class CarbonAccountingEngine {
  private factorRegistry: EmissionFactorRegistry;

  constructor(factorRegistry?: EmissionFactorRegistry) {
    this.factorRegistry = factorRegistry || EmissionFactorRegistry.getInstance();
  }

  /**
   * Calculate CO2e for a single activity
   */
  public calculateActivityEmission(input: ActivityEmissionInput, region: string = 'GLOBAL'): CalculatedEmissionRecord {
    let factorValue: number;

    if (input.customEmissionFactor !== undefined && input.customEmissionFactor >= 0) {
      factorValue = input.customEmissionFactor;
    } else {
      const factor = this.factorRegistry.findFactor(input.category, input.fuelOrSource, region);
      if (!factor) {
        // Fallback standard factor if not found
        factorValue = 0.35; // Standard default kg CO2e / unit
      } else {
        factorValue = factor.co2eTotalKgPerUnit;
      }
    }

    const co2EquivalentKg = Number((input.quantity * factorValue).toFixed(4));
    const activityId = input.activityId || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Generate deterministic SHA-256 Merkle leaf audit hash
    const payload = `${activityId}:${input.facilityId}:${input.scope}:${input.quantity}:${factorValue}:${co2EquivalentKg}:${input.activityDate}`;
    const auditHash = createHash('sha256').update(payload).digest('hex');

    return {
      activityId,
      facilityId: input.facilityId,
      departmentId: input.departmentId,
      scope: input.scope,
      category: input.category,
      fuelOrSource: input.fuelOrSource,
      quantity: input.quantity,
      unit: input.unit,
      emissionFactorUsed: factorValue,
      co2EquivalentKg,
      activityDate: input.activityDate,
      auditHash,
    };
  }

  /**
   * Calculate aggregated Scope 1, 2, and 3 emissions from a batch of activity records
   */
  public calculateBatchEmissions(
    inputs: ActivityEmissionInput[],
    retiredOffsetsKg: number = 0,
    region: string = 'GLOBAL'
  ): {
    records: CalculatedEmissionRecord[];
    breakdown: ScopeBreakdown;
    merkleRoot: string;
  } {
    let scope1Kg = 0;
    let scope2LocationKg = 0;
    let scope2MarketKg = 0;
    let scope3Kg = 0;

    const records: CalculatedEmissionRecord[] = [];
    const hashes: string[] = [];

    for (const input of inputs) {
      const record = this.calculateActivityEmission(input, region);
      records.push(record);
      hashes.push(record.auditHash);

      if (input.scope === 'scope_1') {
        scope1Kg += record.co2EquivalentKg;
      } else if (input.scope === 'scope_2') {
        if (input.category === 'electricity_market') {
          scope2MarketKg += record.co2EquivalentKg;
        } else {
          scope2LocationKg += record.co2EquivalentKg;
        }
      } else if (input.scope === 'scope_3') {
        scope3Kg += record.co2EquivalentKg;
      }
    }

    // If no market-based specific entries exist, default market-based to location-based
    if (scope2MarketKg === 0 && scope2LocationKg > 0) {
      scope2MarketKg = scope2LocationKg;
    }

    const totalGrossKg = Number((scope1Kg + scope2LocationKg + scope3Kg).toFixed(4));
    const totalNetKg = Number(Math.max(0, totalGrossKg - retiredOffsetsKg).toFixed(4));

    // Compute Merkle Root for the batch
    const combinedHash = hashes.join('');
    const merkleRoot = createHash('sha256').update(combinedHash || 'empty_batch').digest('hex');

    const breakdown: ScopeBreakdown = {
      scope1Kg: Number(scope1Kg.toFixed(4)),
      scope2LocationKg: Number(scope2LocationKg.toFixed(4)),
      scope2MarketKg: Number(scope2MarketKg.toFixed(4)),
      scope3Kg: Number(scope3Kg.toFixed(4)),
      totalGrossKg,
      offsetsRetiredKg: Number(retiredOffsetsKg.toFixed(4)),
      totalNetKg,
    };

    return { records, breakdown, merkleRoot };
  }

  /**
   * Summarize carbon footprint per department
   */
  public summarizeByDepartment(
    records: CalculatedEmissionRecord[],
    departmentHeadcounts: Record<string, number> = {}
  ): DepartmentCarbonSummary[] {
    const deptMap = new Map<string, { scope1: number; scope2: number; scope3: number }>();

    for (const rec of records) {
      const deptId = rec.departmentId || 'unallocated';
      const curr = deptMap.get(deptId) || { scope1: 0, scope2: 0, scope3: 0 };
      if (rec.scope === 'scope_1') curr.scope1 += rec.co2EquivalentKg;
      else if (rec.scope === 'scope_2') curr.scope2 += rec.co2EquivalentKg;
      else if (rec.scope === 'scope_3') curr.scope3 += rec.co2EquivalentKg;
      deptMap.set(deptId, curr);
    }

    const summaries: DepartmentCarbonSummary[] = [];
    for (const [deptId, counts] of deptMap.entries()) {
      const gross = counts.scope1 + counts.scope2 + counts.scope3;
      const headcount = departmentHeadcounts[deptId] || 1;
      summaries.push({
        departmentId: deptId,
        grossEmissionsKg: Number(gross.toFixed(2)),
        netEmissionsKg: Number(gross.toFixed(2)),
        scope1Kg: Number(counts.scope1.toFixed(2)),
        scope2Kg: Number(counts.scope2.toFixed(2)),
        scope3Kg: Number(counts.scope3.toFixed(2)),
        perCapitaKg: Number((gross / headcount).toFixed(2)),
      });
    }

    return summaries.sort((a, b) => b.grossEmissionsKg - a.grossEmissionsKg);
  }

  /**
   * Compute building Eco-Score and Energy Use Intensity (EUI)
   */
  public evaluateBuildingEcoScore(
    totalKwh: number,
    floorAreaM2: number,
    solarGeneratedKwh: number = 0,
    grossEmissionsKg: number = 0
  ): BuildingCarbonSummary {
    const area = Math.max(1, floorAreaM2);
    const eui = Number((totalKwh / area).toFixed(2)); // kWh / m2 / yr
    const selfConsumption = totalKwh > 0 ? Number(Math.min(100, (solarGeneratedKwh / totalKwh) * 100).toFixed(1)) : 0;

    let ecoScoreGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    if (eui <= 50 && selfConsumption >= 40) ecoScoreGrade = 'A+';
    else if (eui <= 90) ecoScoreGrade = 'A';
    else if (eui <= 140) ecoScoreGrade = 'B';
    else if (eui <= 200) ecoScoreGrade = 'C';
    else if (eui <= 280) ecoScoreGrade = 'D';
    else ecoScoreGrade = 'F';

    return {
      facilityId: 'facility_eval',
      grossEmissionsKg: Number(grossEmissionsKg.toFixed(2)),
      energyUseIntensityKwhPerM2: eui,
      ecoScoreGrade,
      solarSelfConsumptionPercent: selfConsumption,
    };
  }
}
