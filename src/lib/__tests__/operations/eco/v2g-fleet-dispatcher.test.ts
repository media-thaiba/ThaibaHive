import { V2GFleetDispatcher } from '../../../operations/eco/ev/v2g-fleet-dispatcher';
import { FleetScheduleOptimizer, FleetVehicleSchedule } from '../../../operations/eco/ev/fleet-schedule-optimizer';

describe('V2GFleetDispatcher & FleetScheduleOptimizer Unit Tests', () => {
  const now = new Date('2026-08-21T14:00:00.000Z');

  it('should evaluate V2G capacity while strictly safeguarding departure schedule', () => {
    // Bus with departure in 4 hours (18:00), currently at 80% SoC, 200 kWh battery
    const busSchedule: FleetVehicleSchedule = {
      vehicleId: 'bus_01',
      vehicleType: 'bus',
      batteryCapacityKwh: 200,
      maxV2GDischargeKw: 50,
      maxChargeKw: 60,
      currentSoCPercent: 80, // 160 kWh
      scheduledDepartureTime: '2026-08-21T18:00:00.000Z',
      requiredTripEnergyKwh: 80,
      targetDepartureSoCPercent: 85, // 170 kWh needed
      isV2GApproved: true,
    };

    const evalResult = FleetScheduleOptimizer.evaluateV2GCapacity(busSchedule, now);
    expect(evalResult.canDischargeNow).toBe(true);
    expect(evalResult.availableForDischargeKwh).toBeGreaterThan(50);
    expect(evalResult.hoursUntilDeparture).toBe(4.0);
  });

  it('should block V2G discharge when vehicle is too close to departure time', () => {
    // Bus with departure in 45 minutes, needs recharging
    const urgentBus: FleetVehicleSchedule = {
      vehicleId: 'bus_urgent',
      vehicleType: 'bus',
      batteryCapacityKwh: 200,
      maxV2GDischargeKw: 50,
      maxChargeKw: 50,
      currentSoCPercent: 50, // 100 kWh
      scheduledDepartureTime: '2026-08-21T14:45:00.000Z',
      requiredTripEnergyKwh: 120,
      targetDepartureSoCPercent: 85,
      isV2GApproved: true,
    };

    const evalResult = FleetScheduleOptimizer.evaluateV2GCapacity(urgentBus, now);
    expect(evalResult.canDischargeNow).toBe(false);
  });

  it('should dispatch fleet vehicles for peak shaving and generate savings', () => {
    const fleet: FleetVehicleSchedule[] = [
      {
        vehicleId: 'bus_01',
        vehicleType: 'bus',
        batteryCapacityKwh: 200,
        maxV2GDischargeKw: 50,
        maxChargeKw: 60,
        currentSoCPercent: 85,
        scheduledDepartureTime: '2026-08-21T18:30:00.000Z',
        requiredTripEnergyKwh: 80,
        targetDepartureSoCPercent: 85,
        isV2GApproved: true,
      },
      {
        vehicleId: 'van_01',
        vehicleType: 'maintenance_van',
        batteryCapacityKwh: 80,
        maxV2GDischargeKw: 25,
        maxChargeKw: 30,
        currentSoCPercent: 90,
        scheduledDepartureTime: '2026-08-21T19:00:00.000Z',
        requiredTripEnergyKwh: 30,
        targetDepartureSoCPercent: 80,
        isV2GApproved: true,
      },
    ];

    const dispatch = V2GFleetDispatcher.dispatchFleet(fleet, 60, 0.32, now);
    expect(dispatch.totalDischargePowerKw).toBe(60); // Shaves full 60 kW deficit
    expect(dispatch.totalCostSavingsDollars).toBeCloseTo(60 * 0.32, 2);
    expect(dispatch.commands).toHaveLength(2);
    expect(dispatch.commands[0].action).toBe('v2g_discharge');
  });
});
