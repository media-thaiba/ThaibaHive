import { BmsTelemetryIngester } from '@/lib/operations/energy/bms-telemetry-ingester';

describe('AIMS-004 — BmsTelemetryIngester', () => {
  it('should ingest and smooth sensor readings with Kalman filtering', () => {
    const ingester = new BmsTelemetryIngester();

    const reading1 = ingester.ingest({
      sensorId: 'temp_01',
      zoneId: 'hall_101',
      temperatureCelsius: 25.0,
      co2Ppm: 500,
    });
    expect(reading1.temperatureCelsius).toBeCloseTo(25.0, 1);

    // Sudden noisy reading
    const reading2 = ingester.ingest({
      sensorId: 'temp_01',
      zoneId: 'hall_101',
      temperatureCelsius: 27.5,
      co2Ppm: 520,
    });
    // Kalman smoothed value should dampen the jump
    expect(reading2.temperatureCelsius).toBeLessThan(27.5);
    expect(reading2.temperatureCelsius).toBeGreaterThan(25.0);
  });
});
