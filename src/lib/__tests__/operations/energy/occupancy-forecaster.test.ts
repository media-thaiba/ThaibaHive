import { OccupancyForecaster } from '@/lib/operations/energy/occupancy-forecaster';

describe('AIMS-004 — OccupancyForecaster', () => {
  it('should predict zone headcount accurately based on calendar events and live telemetry', () => {
    const forecaster = new OccupancyForecaster();
    const now = new Date('2026-08-20T10:00:00Z');

    forecaster.registerSchedule({
      zoneId: 'auditorium_a',
      eventName: 'Physics Lecture 101',
      expectedAttendance: 120,
      maxCapacity: 150,
      startTime: '2026-08-20T09:30:00Z',
      endTime: '2026-08-20T11:00:00Z',
    });

    const forecast = forecaster.forecastOccupancy(
      'campus_main',
      'bld_science',
      'auditorium_a',
      now,
      15,
      115
    );

    expect(forecast.predictedHeadcount).toBeGreaterThan(100);
    expect(forecast.predictedHeadcount).toBeLessThanOrEqual(150);
    expect(forecast.activeCalendarEvent).toBe('Physics Lecture 101');
    expect(forecast.occupancyRatio).toBeGreaterThan(0.7);
  });
});
