import { PredictiveMaintenanceEngine } from '@/lib/operations/fleet/predictive-maintenance';
import { VehicleTelemetry } from '@/lib/operations/fleet/fleet-types';

describe('AIMS-008 — PredictiveMaintenanceEngine', () => {
  it('should flag high failure risk and urgent maintenance for severely worn brake pads', () => {
    const engine = new PredictiveMaintenanceEngine();

    const telemetry: VehicleTelemetry = {
      vehicleId: 'van_02',
      campusId: 'campus_main',
      vehicleType: 'LOGISTICS_VAN',
      latitude: 12.97,
      longitude: 77.59,
      speedKmph: 25,
      odometerKm: 85000,
      batterySoCRatio: 0.8,
      engineTempCelsius: 90,
      brakePadWearPercent: 88, // > 80% urgent
      tirePressurePsi: 33,
      passengerCount: 1,
      maxCapacity: 2,
      status: 'IN_TRANSIT',
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const health = engine.evaluateVehicleHealth(telemetry);

    expect(health.urgentMaintenanceRequired).toBe(true);
    expect(health.failureProbabilityNext14Days).toBeGreaterThan(0.3);
    expect(health.recommendedServiceAction).toContain('brake pads');
  });
});
