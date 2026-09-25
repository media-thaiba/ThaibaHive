/**
 * Battery Energy Storage System (BESS) Autonomous Dispatch Controller
 */

import { BatteryDispatchMode, BessDispatchScheduleSlot } from '../eco-types';
import { BatteryHealthModel, BatterySpecs } from './battery-health-model';
import { TariffArbitrageOptimizer } from './tariff-arbitrage-optimizer';
import { TimeOfUseSchedule, TariffRateStructure } from './time-of-use-schedule';

export interface BessDispatchDecision {
  batteryId: string;
  timestamp: string;
  mode: BatteryDispatchMode;
  targetPowerKw: number; // Positive = discharge, Negative = charge, 0 = idle
  actualSetPointKw: number;
  currentSoCPercent: number;
  projectedSoCPercent: number;
  isSafe: boolean;
  statusMessage: string;
}

export class BessDispatchController {
  private specs: BatterySpecs;
  private currentMode: BatteryDispatchMode = 'arbitrage';
  private currentTariff: TariffRateStructure;

  constructor(specs: BatterySpecs, tariff?: TariffRateStructure) {
    this.specs = specs;
    this.currentTariff = tariff || TimeOfUseSchedule.getDefaultCampusTariff();
    if (specs.minAllowedSoCPercent === undefined) this.specs.minAllowedSoCPercent = 20.0;
    if (specs.maxAllowedSoCPercent === undefined) this.specs.maxAllowedSoCPercent = 90.0;
    if (specs.emergencyReserveSoCPercent === undefined) this.specs.emergencyReserveSoCPercent = 25.0;
  }

  public setMode(mode: BatteryDispatchMode): void {
    this.currentMode = mode;
  }

  public getMode(): BatteryDispatchMode {
    return this.currentMode;
  }

  /**
   * Determine immediate real-time dispatch action given instantaneous conditions
   */
  public computeRealTimeDispatch(
    instantSolarKw: number,
    instantLoadKw: number,
    hourOfDay: number,
    manualPowerKw?: number
  ): BessDispatchDecision {
    let requestedPowerKw = 0;
    let statusMessage = '';

    const rateInfo = TimeOfUseSchedule.getRateForHour(hourOfDay, this.currentTariff);
    const netDeficit = instantLoadKw - instantSolarKw;

    switch (this.currentMode) {
      case 'emergency_reserve': {
        // Maintain reserve at or above emergency threshold (e.g. 50%)
        const reserveTarget = 50.0;
        if (this.specs.currentSoCPercent < reserveTarget) {
          requestedPowerKw = -Math.min(this.specs.maxContinuousPowerKw, 100);
          statusMessage = `Charging battery to maintain emergency critical reserve (${this.specs.currentSoCPercent}% < ${reserveTarget}%)`;
        } else {
          requestedPowerKw = 0;
          statusMessage = `Emergency reserve secured (${this.specs.currentSoCPercent}%). Inverter in idle reserve standby.`;
        }
        break;
      }

      case 'peak_shaving': {
        // Discharge only if building load exceeds threshold (e.g. 200 kW)
        const peakThresholdKw = 150.0;
        if (instantLoadKw > peakThresholdKw && this.specs.currentSoCPercent > (this.specs.emergencyReserveSoCPercent ?? 25)) {
          const neededDischarge = instantLoadKw - peakThresholdKw;
          requestedPowerKw = Math.min(neededDischarge, this.specs.maxContinuousPowerKw);
          statusMessage = `Peak shaving active: Discharging ${requestedPowerKw.toFixed(1)} kW to clip peak demand above ${peakThresholdKw} kW.`;
        } else if (instantSolarKw > instantLoadKw) {
          requestedPowerKw = -(instantSolarKw - instantLoadKw);
          statusMessage = `Absorbing ${Math.abs(requestedPowerKw).toFixed(1)} kW surplus solar generation.`;
        } else {
          requestedPowerKw = 0;
          statusMessage = `Grid load within normal threshold (${instantLoadKw} kW <= ${peakThresholdKw} kW). BESS idle.`;
        }
        break;
      }

      case 'manual': {
        requestedPowerKw = manualPowerKw ?? 0;
        statusMessage = `Manual operator setpoint override: ${requestedPowerKw} kW.`;
        break;
      }

      case 'arbitrage':
      default: {
        // Economic arbitrage: charge during cheap/solar hours, discharge during peak hours
        if (instantSolarKw > instantLoadKw) {
          requestedPowerKw = -(instantSolarKw - instantLoadKw);
          statusMessage = `Absorbing surplus solar generation (${Math.abs(requestedPowerKw).toFixed(1)} kW).`;
        } else if (rateInfo.tierName === 'peak' && netDeficit > 0) {
          requestedPowerKw = Math.min(netDeficit, this.specs.maxContinuousPowerKw);
          statusMessage = `Peak tariff arbitrage ($${rateInfo.ratePerKwh}/kWh): Discharging ${requestedPowerKw.toFixed(1)} kW to offset high utility rates.`;
        } else if (rateInfo.tierName === 'off_peak' && this.specs.currentSoCPercent < 80) {
          requestedPowerKw = -Math.min(this.specs.maxContinuousPowerKw * 0.5, 100);
          statusMessage = `Off-peak grid charging ($${rateInfo.ratePerKwh}/kWh) to prepare for peak periods.`;
        } else {
          requestedPowerKw = 0;
          statusMessage = `Normal shoulder tariff period. BESS holding current charge.`;
        }
        break;
      }
    }

    // Safety validation
    const validation = BatteryHealthModel.validateSetpoint(requestedPowerKw, this.specs.currentSoCPercent, this.specs);
    const allowedKw = validation.allowedPowerKw;

    // Estimate new SoC after 15 minutes of execution
    const energyDeltaKwh = (allowedKw * 0.25); // Positive = discharge, negative = charge
    const newStoredKwh = (this.specs.currentSoCPercent / 100) * this.specs.nominalCapacityKwh - energyDeltaKwh;
    const projectedSoC = Number(((newStoredKwh / this.specs.nominalCapacityKwh) * 100).toFixed(1));

    return {
      batteryId: this.specs.batteryId,
      timestamp: new Date().toISOString(),
      mode: this.currentMode,
      targetPowerKw: requestedPowerKw,
      actualSetPointKw: allowedKw,
      currentSoCPercent: this.specs.currentSoCPercent,
      projectedSoCPercent: projectedSoC,
      isSafe: !validation.isClamped,
      statusMessage: validation.isClamped ? `${statusMessage} [SAFETY OVERRIDE: ${validation.clampReason}]` : statusMessage,
    };
  }

  /**
   * Generate 24-hour optimal dispatch schedule
   */
  public generate24hSchedule(
    hourlyLoadKw: number[],
    hourlySolarGenKw: number[]
  ): BessDispatchScheduleSlot[] {
    const optimization = TariffArbitrageOptimizer.optimize({
      hourlyLoadKw,
      hourlySolarGenKw,
      bessCapacityKwh: this.specs.nominalCapacityKwh,
      bessMaxPowerKw: this.specs.maxContinuousPowerKw,
      bessInitialSoCPercent: this.specs.currentSoCPercent,
      minSoCPercent: this.specs.minAllowedSoCPercent,
      maxSoCPercent: this.specs.maxAllowedSoCPercent,
      tariff: this.currentTariff,
    });

    const slots: BessDispatchScheduleSlot[] = [];
    for (let h = 0; h < 24; h++) {
      const actionKw = optimization.hourlyBessActionKw[h];
      const rateInfo = TimeOfUseSchedule.getRateForHour(h, this.currentTariff);
      let dispatchAction: 'charge' | 'discharge' | 'idle' | 'hold_reserve' = 'idle';

      if (actionKw > 5) dispatchAction = 'discharge';
      else if (actionKw < -5) dispatchAction = 'charge';

      slots.push({
        timeSlot: `${h.toString().padStart(2, '0')}:00`,
        hour: h,
        expectedSolarKw: hourlySolarGenKw[h] || 0,
        expectedLoadKw: hourlyLoadKw[h],
        tariffRatePerKwh: rateInfo.ratePerKwh,
        dispatchAction,
        targetPowerKw: Math.abs(actionKw),
        projectedSoCPercent: optimization.hourlySoCPercent[h],
        costSavingsEstimated: Number((Math.abs(actionKw) * rateInfo.ratePerKwh * 0.5).toFixed(2)),
      });
    }

    return slots;
  }
}
