/**
 * Fleet Departure Schedule & V2G Optimization Model
 */

export interface FleetVehicleSchedule {
  vehicleId: string;
  vehicleType: 'bus' | 'maintenance_van' | 'shuttle';
  batteryCapacityKwh: number;
  maxV2GDischargeKw: number;
  maxChargeKw: number;
  currentSoCPercent: number;
  scheduledDepartureTime: string; // ISO
  scheduledReturnTime?: string;
  requiredTripEnergyKwh: number;
  targetDepartureSoCPercent: number; // e.g. 85%
  isV2GApproved: boolean;
}

export class FleetScheduleOptimizer {
  /**
   * Determine available V2G discharge capacity (kWh and kW) while strictly preserving departure SoC
   */
  public static evaluateV2GCapacity(
    schedule: FleetVehicleSchedule,
    currentTime: Date = new Date()
  ): {
    availableForDischargeKwh: number;
    maxSafeDischargeKw: number;
    hoursUntilDeparture: number;
    minutesNeededToRecharge: number;
    canDischargeNow: boolean;
  } {
    const depTime = new Date(schedule.scheduledDepartureTime);
    const msUntilDeparture = Math.max(0, depTime.getTime() - currentTime.getTime());
    const hoursUntilDeparture = msUntilDeparture / (1000 * 3600);

    const targetSoC = schedule.targetDepartureSoCPercent || 85.0;
    const targetStoredKwh = (targetSoC / 100) * schedule.batteryCapacityKwh;
    const currentStoredKwh = (schedule.currentSoCPercent / 100) * schedule.batteryCapacityKwh;

    // Minimum buffer: cannot discharge below 25% under any circumstances
    const absoluteMinKwh = 0.25 * schedule.batteryCapacityKwh;

    // Time required to recharge from minimum to target departure SoC
    const energyNeededToRechargeKwh = Math.max(0, targetStoredKwh - currentStoredKwh);
    const chargePowerKw = Math.max(10, schedule.maxChargeKw);
    const hoursToRecharge = energyNeededToRechargeKwh / (chargePowerKw * 0.92); // accounting for charge efficiency
    const minutesNeededToRecharge = Math.ceil(hoursToRecharge * 60);

    // If time until departure is too close to recharge window (with 30 min safety buffer), V2G is locked
    const safetyBufferHours = 0.5;
    const isSafeTimeWindow = hoursUntilDeparture > (hoursToRecharge + safetyBufferHours);

    let availableForDischargeKwh = 0;
    let maxSafeDischargeKw = 0;
    let canDischargeNow = false;

    if (schedule.isV2GApproved && isSafeTimeWindow && currentStoredKwh > absoluteMinKwh) {
      availableForDischargeKwh = Number((currentStoredKwh - absoluteMinKwh).toFixed(2));
      maxSafeDischargeKw = schedule.maxV2GDischargeKw;
      canDischargeNow = availableForDischargeKwh > 5;
    }

    return {
      availableForDischargeKwh,
      maxSafeDischargeKw,
      hoursUntilDeparture: Number(hoursUntilDeparture.toFixed(2)),
      minutesNeededToRecharge,
      canDischargeNow,
    };
  }
}
