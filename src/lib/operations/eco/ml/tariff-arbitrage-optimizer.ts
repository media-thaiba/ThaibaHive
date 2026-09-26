/**
 * Dynamic Utility Tariff & Peak Shaving Arbitrage Optimizer
 * Minimizes grid energy costs and peak demand penalties
 */

import { TariffRateStructure, TimeOfUseSchedule } from './time-of-use-schedule';

export interface ArbitrageOptimizationInput {
  hourlyLoadKw: number[]; // 24 hours of campus building load
  hourlySolarGenKw: number[]; // 24 hours of solar generation
  bessCapacityKwh: number;
  bessMaxPowerKw: number;
  bessInitialSoCPercent?: number;
  minSoCPercent?: number;
  maxSoCPercent?: number;
  bessRoundTripEfficiency?: number;
  tariff?: TariffRateStructure;
}

export interface ArbitrageOptimizationResult {
  hourlyBessActionKw: number[]; // Positive = discharge, Negative = charge
  hourlySoCPercent: number[];
  hourlyNetGridDrawKw: number[];
  baselineCostWithoutBess: number;
  optimizedCostWithBess: number;
  totalCostSavingsDollars: number;
  savingsPercentage: number;
  peakDemandShavedKw: number;
}

export class TariffArbitrageOptimizer {
  /**
   * Optimize 24-hour battery schedule against TOU tariffs and peak demand charges
   */
  public static optimize(input: ArbitrageOptimizationInput): ArbitrageOptimizationResult {
    const tariff = input.tariff || TimeOfUseSchedule.getDefaultCampusTariff();
    const capacityKwh = input.bessCapacityKwh;
    const maxPowerKw = input.bessMaxPowerKw;
    const minSoC = input.minSoCPercent ?? 20.0;
    const maxSoC = input.maxSoCPercent ?? 90.0;
    const rtEff = input.bessRoundTripEfficiency ?? 0.90;
    const chargeEff = Math.sqrt(rtEff); // ~0.95
    const dischargeEff = Math.sqrt(rtEff); // ~0.95

    let currentSoC = input.bessInitialSoCPercent ?? 50.0;
    const hourlyActionKw: number[] = new Array(24).fill(0);
    const hourlySoC: number[] = new Array(24).fill(0);
    const hourlyNetGrid: number[] = new Array(24).fill(0);

    // 1. Compute baseline unmanaged net grid draw: Load - Solar
    const baselineNetGrid = input.hourlyLoadKw.map((load, h) => {
      const solar = input.hourlySolarGenKw[h] || 0;
      return Math.max(0, load - solar);
    });

    // 2. Identify peak rate and off-peak rate hours
    const hourlyRates = Array.from({ length: 24 }, (_, h) => TimeOfUseSchedule.getRateForHour(h, tariff));

    // Peak hours (top rates) -> prioritize discharge
    // Off-peak hours (lowest rates) or high solar surplus -> prioritize charge
    let currentCapacityStoredKwh = (currentSoC / 100) * capacityKwh;
    const maxStoredKwh = (maxSoC / 100) * capacityKwh;
    const minStoredKwh = (minSoC / 100) * capacityKwh;

    // Compute available discharge energy budget in kWh based on full usable capacity
    const availableDischargeEnergyKwh = (maxStoredKwh - minStoredKwh) * dischargeEff;

    // Determine optimal peak shaving threshold for peak hours (14..20)
    // Find target grid threshold such that sum(max(0, deficit - threshold)) <= availableDischargeEnergyKwh
    const peakHours = [14, 15, 16, 17, 18, 19];
    let peakShaveThresholdKw = 90.0;
    for (let candidate = 200; candidate >= 40; candidate -= 5) {
      let neededEnergy = 0;
      for (const h of peakHours) {
        const netDef = Math.max(0, input.hourlyLoadKw[h] - (input.hourlySolarGenKw[h] || 0));
        if (netDef > candidate) {
          neededEnergy += (netDef - candidate);
        }
      }
      if (neededEnergy <= availableDischargeEnergyKwh) {
        peakShaveThresholdKw = candidate;
      } else {
        break;
      }
    }

    // Simulation pass through the 24 hours
    for (let h = 0; h < 24; h++) {
      const load = input.hourlyLoadKw[h];
      const solar = input.hourlySolarGenKw[h] || 0;
      const rateInfo = hourlyRates[h];
      const netDeficit = Math.max(0, load - solar);

      let actionKw = 0;

      // Strategy A: Absorb solar surplus (FREE green energy)
      if (solar > load && currentCapacityStoredKwh < maxStoredKwh) {
        const excessSolarKw = solar - load;
        const roomToChargeKwh = maxStoredKwh - currentCapacityStoredKwh;
        const chargePowerKw = Math.min(excessSolarKw, maxPowerKw, roomToChargeKwh / chargeEff);
        actionKw = -chargePowerKw; // negative is charge
        currentCapacityStoredKwh += chargePowerKw * chargeEff;
      }
      // Strategy B: Peak tariff hours (14..20) -> shave load above calculated threshold
      else if (rateInfo.tierName === 'peak' && currentCapacityStoredKwh > minStoredKwh && netDeficit > 0) {
        const neededShaveKw = Math.max(0, netDeficit - peakShaveThresholdKw);
        const availableDischargeKwh = currentCapacityStoredKwh - minStoredKwh;
        const maxPossibleKw = Math.min(netDeficit, maxPowerKw, availableDischargeKwh * dischargeEff);
        
        const dischargeKw = neededShaveKw > 0 ? Math.min(maxPossibleKw, neededShaveKw + 15) : Math.min(maxPossibleKw, 30);
        actionKw = dischargeKw;
        currentCapacityStoredKwh -= dischargeKw / dischargeEff;
      }
      // Strategy C: Off-peak super cheap tariff ($0.075/kWh) -> charge from grid to maxStoredKwh
      else if (rateInfo.tierName === 'off_peak' && currentCapacityStoredKwh < maxStoredKwh) {
        const roomToChargeKwh = maxStoredKwh - currentCapacityStoredKwh;
        const chargePowerKw = Math.min(maxPowerKw * 0.6, roomToChargeKwh / chargeEff);
        actionKw = -chargePowerKw;
        currentCapacityStoredKwh += chargePowerKw * chargeEff;
      }

      currentCapacityStoredKwh = Math.max(minStoredKwh, Math.min(maxStoredKwh, currentCapacityStoredKwh));
      currentSoC = (currentCapacityStoredKwh / capacityKwh) * 100;

      hourlyActionKw[h] = Number(actionKw.toFixed(2));
      hourlySoC[h] = Number(currentSoC.toFixed(1));

      // Net grid draw after solar and BESS action
      // Load - Solar - BESS_discharge (or + BESS_charge)
      const finalGridKw = Math.max(0, load - solar - actionKw);
      hourlyNetGrid[h] = Number(finalGridKw.toFixed(2));
    }

    // 3. Financial calculations
    let baselineEnergyCost = 0;
    let optimizedEnergyCost = 0;
    let maxBaselineKw = 0;
    let maxOptimizedKw = 0;

    for (let h = 0; h < 24; h++) {
      const rate = hourlyRates[h].ratePerKwh;
      baselineEnergyCost += baselineNetGrid[h] * rate;
      optimizedEnergyCost += hourlyNetGrid[h] * rate;

      if (baselineNetGrid[h] > maxBaselineKw) maxBaselineKw = baselineNetGrid[h];
      if (hourlyNetGrid[h] > maxOptimizedKw) maxOptimizedKw = hourlyNetGrid[h];
    }

    // Add demand charge component (prorated for 1 day = 1/30 of month)
    const demandRateDay = tariff.demandChargePerKwMonth / 30.0;
    const baselineTotalCost = baselineEnergyCost + maxBaselineKw * demandRateDay;
    const optimizedTotalCost = optimizedEnergyCost + maxOptimizedKw * demandRateDay;

    const totalSavings = Math.max(0, baselineTotalCost - optimizedTotalCost);
    const savingsPercent = baselineTotalCost > 0 ? (totalSavings / baselineTotalCost) * 100 : 0;
    const peakShavedKw = Math.max(0, maxBaselineKw - maxOptimizedKw);

    return {
      hourlyBessActionKw: hourlyActionKw,
      hourlySoCPercent: hourlySoC,
      hourlyNetGridDrawKw: hourlyNetGrid,
      baselineCostWithoutBess: Number(baselineTotalCost.toFixed(2)),
      optimizedCostWithBess: Number(optimizedTotalCost.toFixed(2)),
      totalCostSavingsDollars: Number(totalSavings.toFixed(2)),
      savingsPercentage: Number(savingsPercent.toFixed(1)),
      peakDemandShavedKw: Number(peakShavedKw.toFixed(2)),
    };
  }
}
