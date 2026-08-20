import { FleetSafetyEnforcer } from '@/lib/operations/fleet/fleet-safety-enforcer';
import { VehicleTelemetry } from '@/lib/operations/fleet/fleet-types';

describe('AIMS-009 — FleetSafetyEnforcer', () => {
  it('should detect speeding violations and driver fatigue limits', () => {
    const enforcer = new FleetSafetyEnforcer();

    const speedingVan: VehicleTelemetry = {
      vehicleId: 'van_09',
      campusId: 'campus_main',
      vehicleType: 'LOGISTICS_VAN',
      latitude: 12.97,
      longitude: 77.59,
      speedKmph: 38.0, // > 25 limit, > 35 critical
      odometerKm: 45000,
      batterySoCRatio: 0.9,
      engineTempCelsius: 85,
      brakePadWearPercent: 20,
      tirePressurePsi: 24, // < 26 low
      passengerCount: 1,
      maxCapacity: 2,
      status: 'IN_TRANSIT',
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const violations = enforcer.evaluateTelemetry(speedingVan, 4.5); // 4.5h > 4.0h limit

    expect(violations.length).toBe(3);
    expect(violations.some((v) => v.violationType === 'SPEEDING' && v.severity === 'CRITICAL')).toBe(true);
    expect(violations.some((v) => v.violationType === 'DRIVER_FATIGUE')).toBe(true);
    expect(violations.some((v) => v.violationType === 'LOW_TIRE_PRESSURE')).toBe(true);
  });
});
