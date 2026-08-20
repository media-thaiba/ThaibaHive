import { CarbonAbatementInitiative } from './sustainability-types';

/**
 * Automated Carbon Reduction Strategy Planner
 * Formulates ranked carbon abatement playbooks and calculates estimated ROI.
 */
export class CarbonReductionPlanner {
  /**
   * Proposes ranked carbon reduction initiatives based on current campus profile
   */
  public generateAbatementPlan(campusElectricityKwhMonthly: number, fleetLitersMonthly: number): CarbonAbatementInitiative[] {
    const initiatives: CarbonAbatementInitiative[] = [
      {
        initiativeId: 'init_hvac_opt',
        title: 'Deploy Autonomous HVAC Setpoint & Pre-Cooling Optimization',
        domain: 'HVAC_ENERGY',
        projectedAnnualCo2ReductionKg: Number((campusElectricityKwhMonthly * 0.22 * 0.475 * 12).toFixed(0)),
        estimatedAnnualCostSavingsDollars: Number((campusElectricityKwhMonthly * 0.22 * 0.14 * 12).toFixed(0)),
        implementationEffort: 'LOW',
        status: 'PROPOSED',
      },
      {
        initiativeId: 'init_fleet_routing',
        title: 'Dynamic Multi-Stop Shuttle Route Optimization & Idle Reduction',
        domain: 'FLEET_ELECTRIFICATION',
        projectedAnnualCo2ReductionKg: Number((fleetLitersMonthly * 0.18 * 2.68 * 12).toFixed(0)),
        estimatedAnnualCostSavingsDollars: Number((fleetLitersMonthly * 0.18 * 1.20 * 12).toFixed(0)),
        implementationEffort: 'LOW',
        status: 'PROPOSED',
      },
      {
        initiativeId: 'init_solar_bess',
        title: 'Expand Rooftop Solar PV & Battery Energy Storage Microgrid',
        domain: 'SOLAR_MICROGRID',
        projectedAnnualCo2ReductionKg: Number((campusElectricityKwhMonthly * 0.35 * 0.475 * 12).toFixed(0)),
        estimatedAnnualCostSavingsDollars: Number((campusElectricityKwhMonthly * 0.35 * 0.14 * 12).toFixed(0)),
        implementationEffort: 'HIGH',
        status: 'PROPOSED',
      },
    ];

    // Sort by CO2 reduction ROI
    return initiatives.sort((a, b) => b.projectedAnnualCo2ReductionKg - a.projectedAnnualCo2ReductionKg);
  }
}
