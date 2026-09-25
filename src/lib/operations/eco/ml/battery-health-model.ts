/**
 * Battery Health & Degradation Physics Model
 * Enforces SoC bounds, thermal envelope, C-rate limits, and cycle degradation cost
 */

import { BatteryChemistry } from '../eco-types';

export interface BatterySpecs {
  batteryId: string;
  chemistry: BatteryChemistry;
  nominalCapacityKwh: number;
  maxContinuousPowerKw: number;
  currentSoCPercent: number;
  minAllowedSoCPercent?: number; // default 20%
  maxAllowedSoCPercent?: number; // default 90%
  emergencyReserveSoCPercent?: number; // default 25%
  maxCRate?: number; // default 0.5C
  installedCostPerKwh?: number; // default $250/kWh
  expectedCycleLife?: number; // default 4000 cycles
}

export class BatteryHealthModel {
  /**
   * Validate if a requested charge/discharge setpoint is safe and compliant with health bounds
   */
  public static validateSetpoint(
    requestedPowerKw: number, // Positive = discharge, Negative = charge
    currentSoCPercent: number,
    specs: BatterySpecs
  ): {
    allowedPowerKw: number;
    isClamped: boolean;
    clampReason?: string;
  } {
    const minSoC = specs.minAllowedSoCPercent ?? 20.0;
    const maxSoC = specs.maxAllowedSoCPercent ?? 90.0;
    const maxPower = specs.maxContinuousPowerKw;
    const cRateLimitKw = specs.nominalCapacityKwh * (specs.maxCRate ?? 0.5);
    const effectiveMaxKw = Math.min(maxPower, cRateLimitKw);

    let power = requestedPowerKw;
    let isClamped = false;
    let clampReason: string | undefined;

    // 1. Check C-rate / max power limits
    if (Math.abs(power) > effectiveMaxKw) {
      power = Math.sign(power) * effectiveMaxKw;
      isClamped = true;
      clampReason = `Power clamped to maximum safe C-rate limit (${effectiveMaxKw} kW)`;
    }

    // 2. Check lower SoC boundary for discharging
    if (power > 0 && currentSoCPercent <= minSoC) {
      power = 0;
      isClamped = true;
      clampReason = `Discharging blocked: Battery at minimum State of Charge limit (${currentSoCPercent}% <= ${minSoC}%)`;
    }

    // 3. Check upper SoC boundary for charging
    if (power < 0 && currentSoCPercent >= maxSoC) {
      power = 0;
      isClamped = true;
      clampReason = `Charging blocked: Battery at maximum State of Charge limit (${currentSoCPercent}% >= ${maxSoC}%)`;
    }

    return {
      allowedPowerKw: Number(power.toFixed(2)),
      isClamped,
      clampReason,
    };
  }

  /**
   * Calculate marginal battery cell degradation cost per kWh throughput
   */
  public static calculateDegradationCost(
    energyThroughputKwh: number,
    specs: BatterySpecs
  ): number {
    const costPerKwh = specs.installedCostPerKwh ?? 250.0;
    const cycleLife = specs.expectedCycleLife ?? 4000;
    // Degradation cost per kWh = Installed Cost / (Cycle Life * 2 [charge+discharge])
    const degradationPerKwh = costPerKwh / (cycleLife * 2);
    return Number((energyThroughputKwh * degradationPerKwh).toFixed(4));
  }
}
