/**
 * Eco-Mesh / NetZeroOS Core Type Definitions
 * ThaibaHive Sprint-049
 */

export type EnergyAssetType =
  | 'smart_meter'
  | 'solar_inverter'
  | 'wind_turbine'
  | 'bess_battery'
  | 'ev_charger'
  | 'transformer'
  | 'generator'
  | 'sub_meter';

export type EnergyAssetStatus =
  | 'online'
  | 'offline'
  | 'degraded'
  | 'maintenance'
  | 'fault';

export type RenewableSourceType =
  | 'solar_pv'
  | 'wind'
  | 'biomass'
  | 'diesel_gen'
  | 'grid_interconnect';

export type BatteryChemistry =
  | 'lfp'
  | 'nmc'
  | 'solid_state'
  | 'flow';

export type BatteryDispatchMode =
  | 'arbitrage'
  | 'peak_shaving'
  | 'emergency_reserve'
  | 'grid_forming'
  | 'manual';

export type CarbonScope =
  | 'scope_1'
  | 'scope_2'
  | 'scope_3';

export type CarbonCategory =
  | 'stationary_combustion'
  | 'mobile_fleet'
  | 'electricity_location'
  | 'electricity_market'
  | 'heating_cooling'
  | 'commute'
  | 'waste'
  | 'procurement'
  | 'business_travel';

export type EmissionUnit =
  | 'kWh'
  | 'MWh'
  | 'liters'
  | 'gallons'
  | 'm3'
  | 'kg'
  | 'tons'
  | 'km'
  | 'passenger_km';

export interface EmissionFactor {
  factorId: string;
  activityCategory: CarbonCategory;
  fuelOrFuelSource: string;
  unit: EmissionUnit;
  co2FactorKg: number;
  ch4FactorKg?: number;
  n2oFactorKg?: number;
  co2eTotalKgPerUnit: number;
  standard: 'IPCC_AR6' | 'GHG_PROTOCOL' | 'DEFRA' | 'EPA_EGRID' | 'CUSTOM';
  region: string;
  effectiveYear: number;
}

export interface ActivityEmissionInput {
  activityId?: string;
  facilityId: string;
  departmentId?: string;
  scope: CarbonScope;
  category: CarbonCategory;
  fuelOrSource: string;
  quantity: number;
  unit: EmissionUnit;
  activityDate: string;
  customEmissionFactor?: number;
}

export interface ScopeBreakdown {
  scope1Kg: number;
  scope2LocationKg: number;
  scope2MarketKg: number;
  scope3Kg: number;
  totalGrossKg: number;
  offsetsRetiredKg: number;
  totalNetKg: number;
}

export interface DepartmentCarbonSummary {
  departmentId: string;
  departmentName?: string;
  grossEmissionsKg: number;
  netEmissionsKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  perCapitaKg: number;
  energyUseIntensityKwhPerM2?: number;
}

export interface BuildingCarbonSummary {
  facilityId: string;
  facilityName?: string;
  grossEmissionsKg: number;
  energyUseIntensityKwhPerM2: number;
  ecoScoreGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  solarSelfConsumptionPercent: number;
}

export interface RenewableForecastPoint {
  timestamp: string;
  hourOffset: number;
  forecastedGenerationKw: number;
  forecastedEnergyKwh: number;
  confidenceLowerP10Kw: number;
  confidenceUpperP90Kw: number;
  solarIrradianceGhiWm2: number;
  ambientTemperatureC: number;
  cloudCoverPercent: number;
}

export interface BessDispatchScheduleSlot {
  timeSlot: string; // ISO or 'HH:mm'
  hour: number;
  expectedSolarKw: number;
  expectedLoadKw: number;
  tariffRatePerKwh: number;
  dispatchAction: 'charge' | 'discharge' | 'idle' | 'hold_reserve';
  targetPowerKw: number;
  projectedSoCPercent: number;
  costSavingsEstimated: number;
}

export interface EvChargingSessionState {
  sessionId: string;
  stationId: string;
  vehicleId: string;
  vehicleType: 'bus' | 'maintenance_van' | 'shuttle' | 'staff_commuter';
  driverId?: string;
  currentSoC: number;
  targetSoC: number;
  allocatedPowerKw: number;
  isV2GActive: boolean;
  departureTime?: string;
  energyDeliveredKwh: number;
  energyDischargedKwh: number;
}

export interface MicrogridPowerFlowFrame {
  timestamp: string;
  solarGenerationKw: number;
  windGenerationKw: number;
  bessPowerKw: number; // Positive = discharging, Negative = charging
  bessSoCPercent: number;
  gridImportKw: number;
  gridExportKw: number;
  evChargingLoadKw: number;
  campusFacilityLoadKw: number;
  realtimeCarbonIntensityGramsPerKwh: number;
  currentTariffRatePerKwh: number;
  netGridBalanceKw: number;
}

export interface CampusPowerFlowSnapshot {
  timestamp: string;
  totalSolarGenerationKw: number;
  totalFacilityLoadKw: number;
  gridImportKw: number;
  gridExportKw: number;
  bessDischargeKw: number;
  bessChargeKw: number;
  evChargingLoadKw: number;
  realtimeCarbonIntensityGrams: number;
  powerQualityStatus: 'nominal' | 'degraded' | 'critical';
}

export interface CarbonCalculationResult {
  totalGrossEmissionsKg: number;
  totalNetEmissionsKg: number;
  retiredOffsetsDeductedKg: number;
  breakdown: ScopeBreakdown;
  departmentSummaries: DepartmentCarbonSummary[];
  buildingEcoScores: Array<{
    facilityId: string;
    facilityName?: string;
    ecoScoreGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    euiKwhPerM2: number;
    carbonIntensityKgPerM2: number;
    solarSelfSufficiencyPercent: number;
  }>;
  merkleProofHash: string;
  calculatedAt: string;
}
