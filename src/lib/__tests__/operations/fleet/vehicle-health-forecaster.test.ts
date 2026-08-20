import { VehicleHealthForecaster } from '@/lib/operations/fleet/vehicle-health-forecaster';
import { VehicleHealthAssessment } from '@/lib/operations/fleet/fleet-types';

describe('AIMS-008 — VehicleHealthForecaster', () => {
  it('should project degradation over 14 days and calculate optimal service date', () => {
    const forecaster = new VehicleHealthForecaster();

    const assessment: VehicleHealthAssessment = {
      vehicleId: 'shuttle_3',
      compositeHealthScore: 82,
      failureProbabilityNext14Days: 0.18,
      urgentMaintenanceRequired: false,
      subsystemScores: {
        powertrain: 85,
        braking: 80,
        batteryElectrical: 88,
        tires: 90,
      },
      assessedAt: new Date().toISOString(),
    };

    const projection = forecaster.projectDegradation(assessment, 55, 120);

    expect(projection.daysProjected).toBe(14);
    expect(projection.projectedBrakeWearPercent).toBeGreaterThan(55);
    expect(projection.projectedHealthScore).toBeLessThanOrEqual(82);
    expect(projection.recommendedServiceDateIso).toBeDefined();
  });
});
