/**
 * Bidirectional Vehicle-to-Grid (V2G) Campus Fleet Energy Dispatcher
 */

import { FleetVehicleSchedule, FleetScheduleOptimizer } from './fleet-schedule-optimizer';

export interface V2GDispatchCommand {
  vehicleId: string;
  action: 'v2g_discharge' | 'smart_charge' | 'standby';
  powerKw: number;
  currentSoCPercent: number;
  reason: string;
  estimatedSavingsDollars: number;
}

export class V2GFleetDispatcher {
  /**
   * Dispatch fleet vehicles for peak shaving / tariff arbitrage
   */
  public static dispatchFleet(
    vehicles: FleetVehicleSchedule[],
    peakDeficitKw: number,
    tariffRatePerKwh: number,
    currentTime: Date = new Date()
  ): {
    commands: V2GDispatchCommand[];
    totalDischargePowerKw: number;
    totalCostSavingsDollars: number;
  } {
    const commands: V2GDispatchCommand[] = [];
    let remainingDeficitKw = Math.max(0, peakDeficitKw);
    let totalDischargeKw = 0;
    let totalSavings = 0;

    for (const veh of vehicles) {
      const evalRes = FleetScheduleOptimizer.evaluateV2GCapacity(veh, currentTime);

      if (evalRes.canDischargeNow && remainingDeficitKw > 0 && tariffRatePerKwh >= 0.20) {
        // Safe to discharge
        const dischargeKw = Math.min(evalRes.maxSafeDischargeKw, remainingDeficitKw);
        remainingDeficitKw -= dischargeKw;
        totalDischargeKw += dischargeKw;

        // Estimated savings: 1 hour at tariff rate
        const savings = dischargeKw * tariffRatePerKwh;
        totalSavings += savings;

        commands.push({
          vehicleId: veh.vehicleId,
          action: 'v2g_discharge',
          powerKw: dischargeKw,
          currentSoCPercent: veh.currentSoCPercent,
          reason: `V2G Peak Shaving active (${dischargeKw} kW at $${tariffRatePerKwh}/kWh). Departure in ${evalRes.hoursUntilDeparture}h.`,
          estimatedSavingsDollars: Number(savings.toFixed(2)),
        });
      } else if (veh.currentSoCPercent < veh.targetDepartureSoCPercent && evalRes.hoursUntilDeparture <= 3) {
        // Urgent recharge required for departure
        commands.push({
          vehicleId: veh.vehicleId,
          action: 'smart_charge',
          powerKw: veh.maxChargeKw,
          currentSoCPercent: veh.currentSoCPercent,
          reason: `Charging priority for scheduled departure in ${evalRes.hoursUntilDeparture}h (Target SoC ${veh.targetDepartureSoCPercent}%).`,
          estimatedSavingsDollars: 0,
        });
      } else {
        commands.push({
          vehicleId: veh.vehicleId,
          action: 'standby',
          powerKw: 0,
          currentSoCPercent: veh.currentSoCPercent,
          reason: `Standby. Departure in ${evalRes.hoursUntilDeparture}h.`,
          estimatedSavingsDollars: 0,
        });
      }
    }

    return {
      commands,
      totalDischargePowerKw: Number(totalDischargeKw.toFixed(2)),
      totalCostSavingsDollars: Number(totalSavings.toFixed(2)),
    };
  }
}
