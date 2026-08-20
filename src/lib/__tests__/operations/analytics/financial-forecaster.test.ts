import { FinancialForecaster } from '@/lib/operations/analytics/financial-forecaster';
import { ResourceDemandModel } from '@/lib/operations/analytics/resource-demand-model';

describe('FinancialForecaster (AFED-021 — Federated Financial Forecasting)', () => {
  it('should project tuition revenue, opex, and net margin for a campus', () => {
    const forecast = FinancialForecaster.forecastFinancials(
      'campus_alpha',
      1200,           // enrolled students
      15000,          // avg tuition per student
      500000,         // base monthly opex
      '2026-Q4'
    );

    expect(forecast.campusId).toBe('campus_alpha');
    expect(forecast.forecastQuarter).toBe('2026-Q4');
    expect(forecast.projectedTuitionRevenue).toBe(1200 * 15000);         // 18,000,000
    expect(forecast.projectedOpexExpenditure).toBeCloseTo(500000 * 3 * 1.05, 0); // 1,575,000
    expect(forecast.projectedNetMargin).toBeCloseTo(18000000 - 1575000, 0);
    expect(forecast.confidenceInterval).toHaveLength(2);
    expect(forecast.confidenceInterval[0]).toBeLessThan(forecast.confidenceInterval[1]);
  });

  it('should detect budget deficit and add bottleneck alert', () => {
    // Opex > Revenue => deficit
    const forecast = FinancialForecaster.forecastFinancials(
      'campus_deficit',
      50,       // very few students
      1000,     // low tuition
      200000,   // high opex
    );
    expect(forecast.projectedNetMargin).toBeLessThan(0);
    expect(forecast.resourceBottlenecks.length).toBeGreaterThan(0);
  });

  it('should compute projections in < 20ms', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      FinancialForecaster.forecastFinancials('campus_perf', 1000, 12000, 400000);
    }
    const elapsed = Date.now() - start;
    expect(elapsed / 100).toBeLessThan(20); // avg per call < 20ms
  });

  it('should output confidence interval tighter margin around net margin', () => {
    const forecast = FinancialForecaster.forecastFinancials('c1', 500, 10000, 100000);
    const [lo, hi] = forecast.confidenceInterval;
    const mid = forecast.projectedNetMargin;
    expect(lo).toBeCloseTo(mid * 0.95, 0);
    expect(hi).toBeCloseTo(mid * 1.05, 0);
  });
});

describe('ResourceDemandModel (AFED-021 — Campus Resource Demand Forecasting)', () => {
  it('should project lab hours, classrooms, and HPC compute needed', () => {
    const projection = ResourceDemandModel.forecastDemand(200, 30, 'Computer Science', 3);

    expect(projection.department).toBe('Computer Science');
    expect(projection.projectedLabHoursNeeded).toBe(200 * 2.5);       // 500
    expect(projection.projectedClassroomsNeeded).toBe(Math.ceil(30 / 3)); // 10
    expect(projection.projectedHpcComputeHours).toBe(200 * 5.0 * 3);  // 3000
    expect(projection.capacitySurplusOrDeficit).toBe(0); // 500 available - 500 needed
  });

  it('should flag bottleneck alert when lab demand exceeds capacity', () => {
    const projection = ResourceDemandModel.forecastDemand(300, 20, 'Physics'); // 750 hours needed > 500
    expect(projection.capacitySurplusOrDeficit).toBeLessThan(0);
    expect(projection.bottleneckAlerts.length).toBeGreaterThan(0);
    expect(projection.bottleneckAlerts[0]).toContain('deficit');
  });

  it('should flag high classroom demand for large course loads', () => {
    const projection = ResourceDemandModel.forecastDemand(100, 70, 'Business'); // 24 rooms
    expect(projection.projectedClassroomsNeeded).toBeGreaterThan(20);
    expect(projection.bottleneckAlerts.some((a) => a.includes('classroom'))).toBe(true);
  });
});
