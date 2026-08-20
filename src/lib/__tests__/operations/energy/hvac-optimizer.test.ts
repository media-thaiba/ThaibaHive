import { HvacOptimizer } from '@/lib/operations/energy/hvac-optimizer';
import { BmsSensorReading, ZoneOccupancyForecast } from '@/lib/operations/energy/energy-types';

describe('AIMS-006 — HvacOptimizer', () => {
  it('should optimize setpoint for empty zone and calculate energy and carbon savings', () => {
    const optimizer = new HvacOptimizer();

    const reading: BmsSensorReading = {
      sensorId: 'sensor_1',
      campusId: 'campus_main',
      buildingId: 'bld_1',
      zoneId: 'room_101',
      temperatureCelsius: 22.0,
      relativeHumidityPercent: 50.0,
      co2Ppm: 420,
      luxLevel: 200,
      powerKw: 15.0,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const emptyForecast: ZoneOccupancyForecast = {
      campusId: 'campus_main',
      buildingId: 'bld_1',
      zoneId: 'room_101',
      forecastTimestamp: new Date().toISOString(),
      horizonMinutes: 15,
      predictedHeadcount: 0,
      confidenceInterval: [0, 0],
      occupancyRatio: 0,
    };

    const result = optimizer.optimizeZoneSetpoint(reading, emptyForecast, false);

    expect(result.optimizedSetpointCelsius).toBe(25.5);
    expect(result.projectedKwhSavings).toBeGreaterThan(0);
    expect(result.projectedCostSavingsDollars).toBeGreaterThan(0);
    expect(result.projectedCo2ReductionKg).toBeGreaterThan(0);
    expect(result.pmvConstraintSatisfied).toBe(true);
  });
});
