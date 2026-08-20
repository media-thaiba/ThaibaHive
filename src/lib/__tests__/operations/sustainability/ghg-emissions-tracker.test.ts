import { GhgEmissionsTracker } from '@/lib/operations/sustainability/ghg-emissions-tracker';

describe('AIMS-014 — GhgEmissionsTracker', () => {
  it('should track daily emissions and calculate savings vs unoptimized baselines', () => {
    const tracker = new GhgEmissionsTracker();

    const log = tracker.logDailyEmissions('campus_north', '2026-08-20', 50, 1500, 4000, 2000);

    expect(log.emissions.totalKgCo2e).toBeGreaterThan(0);
    expect(log.savingsVsBaselineKgCo2e).toBeGreaterThan(0);
    expect(tracker.getHistory('campus_north').length).toBe(1);
  });
});
