import { CarbonReductionPlanner } from '@/lib/operations/sustainability/carbon-reduction-planner';

describe('AIMS-015 — CarbonReductionPlanner', () => {
  it('should generate ranked carbon abatement roadmaps with projected ROI', () => {
    const planner = new CarbonReductionPlanner();

    const plan = planner.generateAbatementPlan(50000, 2000); // 50k kWh, 2k L fuel

    expect(plan.length).toBe(3);
    expect(plan[0].projectedAnnualCo2ReductionKg).toBeGreaterThan(plan[1].projectedAnnualCo2ReductionKg);
    expect(plan.some((i) => i.domain === 'HVAC_ENERGY')).toBe(true);
    expect(plan.some((i) => i.domain === 'FLEET_ELECTRIFICATION')).toBe(true);
  });
});
