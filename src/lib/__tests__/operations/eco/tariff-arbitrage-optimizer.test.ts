import { TariffArbitrageOptimizer } from '../../../operations/eco/ml/tariff-arbitrage-optimizer';
import { TimeOfUseSchedule } from '../../../operations/eco/ml/time-of-use-schedule';

describe('TariffArbitrageOptimizer & TimeOfUseSchedule Unit Tests', () => {
  it('should return correct tariff rates for off-peak, shoulder, and peak hours', () => {
    const tariff = TimeOfUseSchedule.getDefaultCampusTariff();

    expect(TimeOfUseSchedule.getRateForHour(3, tariff).tierName).toBe('off_peak');
    expect(TimeOfUseSchedule.getRateForHour(10, tariff).tierName).toBe('shoulder');
    expect(TimeOfUseSchedule.getRateForHour(16, tariff).tierName).toBe('peak');
    expect(TimeOfUseSchedule.getRateForHour(16, tariff).ratePerKwh).toBe(0.320);
  });

  it('should optimize 24h battery schedule and achieve >= 15% cost savings', () => {
    // 24-hour typical commercial building load profile (kW)
    const hourlyLoadKw = [
      40, 38, 36, 35, 38, 55, 90, 140, 180, 210, 230, 240, 235, 230, 250, 260, 245, 220, 180, 140, 95, 70, 50, 42,
    ];

    // 24-hour typical solar generation profile (kW)
    const hourlySolarGenKw = [
      0, 0, 0, 0, 0, 0, 20, 65, 120, 180, 220, 240, 235, 210, 160, 95, 40, 10, 0, 0, 0, 0, 0, 0,
    ];

    const result = TariffArbitrageOptimizer.optimize({
      hourlyLoadKw,
      hourlySolarGenKw,
      bessCapacityKwh: 500,
      bessMaxPowerKw: 250,
      bessInitialSoCPercent: 60,
      minSoCPercent: 20,
      maxSoCPercent: 90,
    });

    expect(result.hourlyBessActionKw).toHaveLength(24);
    expect(result.hourlySoCPercent).toHaveLength(24);
    expect(result.optimizedCostWithBess).toBeLessThan(result.baselineCostWithoutBess);
    expect(result.savingsPercentage).toBeGreaterThanOrEqual(15.0);
    expect(result.totalCostSavingsDollars).toBeGreaterThan(50);
    expect(result.peakDemandShavedKw).toBeGreaterThan(0);
  });
});
