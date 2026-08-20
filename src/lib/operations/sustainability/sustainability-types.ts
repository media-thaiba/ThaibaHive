/**
 * ESG Sustainability & Carbon Footprint Calculation Types (AIMS / AutoOps)
 */

export interface ScopeEmissions {
  scope1FleetFuelKgCo2e: number; // Direct combustion
  scope2GridElectricityKgCo2e: number; // Purchased electricity
  scope3CloudComputeKgCo2e: number; // Cloud data center PUE & server lifecycle
  totalKgCo2e: number;
  totalMetricTonsCo2e: number;
}

export interface CarbonAbatementInitiative {
  initiativeId: string;
  title: string;
  domain: 'HVAC_ENERGY' | 'FLEET_ELECTRIFICATION' | 'CLOUD_WORKLOAD_SHIFTING' | 'SOLAR_MICROGRID';
  projectedAnnualCo2ReductionKg: number;
  estimatedAnnualCostSavingsDollars: number;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface EsgReportSummary {
  reportId: string;
  reportingPeriod: string; // e.g. "2026-Q3"
  campusId: string;
  scopeEmissions: ScopeEmissions;
  emissionsIntensityPerStudentKg: number;
  renewableEnergyRatioPercent: number;
  carbonReductionVsBaselinePercent: number;
  verifiedGRICompliant: boolean;
  generatedAt: string;
  institutionId: string;
}
