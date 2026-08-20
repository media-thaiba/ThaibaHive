import { HvacEnergyOptimizer } from '../../../operations/twin/ml/hvac-energy-optimizer';
import { OccupancyForecaster } from '../../../operations/twin/ml/occupancy-forecaster';

describe('HVAC Energy Optimizer', () => {
  it('should generate predictive HVAC setback schedule and calculate energy savings', () => {
    const forecast = OccupancyForecaster.forecastNext24Hours('SPC-LAB-1', 40, [0, 0, 0, 10, 25, 30, 20, 5, 0, 0], 6);

    const report = HvacEnergyOptimizer.optimizeHvacSchedule('FAC-01', 'SPC-LAB-1', forecast, 10.0, 2.5, 0.15);

    expect(report.schedule.length).toBe(24);
    expect(report.kwhSaved).toBeGreaterThan(0);
    expect(report.percentageReduction).toBeGreaterThan(15); // Exceeds 15% reduction requirement
    expect(report.costSavingsEstimatedUsd).toBeGreaterThan(0);
  });
});
