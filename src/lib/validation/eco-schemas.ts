import { z } from 'zod';

export const energyAssetCreateSchema = z.object({
  assetId: z.string().min(1),
  facilityId: z.string().min(1),
  name: z.string().min(1),
  assetType: z.enum(['smart_meter', 'solar_inverter', 'wind_turbine', 'bess_battery', 'ev_charger', 'transformer', 'generator']).default('smart_meter'),
  status: z.enum(['online', 'offline', 'degraded', 'maintenance', 'fault']).default('online'),
  capacityKw: z.number().min(0).default(0.0),
  ratedVoltage: z.number().min(0).default(400.0),
  specificationsJson: z.string().default('{}'),
  institutionId: z.string().default('global'),
});

export const energyAssetUpdateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['online', 'offline', 'degraded', 'maintenance', 'fault']).optional(),
  capacityKw: z.number().min(0).optional(),
  ratedVoltage: z.number().min(0).optional(),
  specificationsJson: z.string().optional(),
});

export const energyTelemetryIngestSchema = z.object({
  telemetryId: z.string().optional(),
  assetId: z.string().min(1),
  sourceType: z.enum(['smart_meter', 'solar_pv', 'bess', 'ev_charger', 'grid_feed']).default('smart_meter'),
  powerKw: z.number(),
  energyKwh: z.number().min(0).default(0.0),
  voltageV: z.number().default(400.0),
  currentA: z.number().default(0.0),
  powerFactor: z.number().default(0.98),
  frequencyHz: z.number().default(50.0),
  socPercent: z.number().min(0).max(100).optional(),
  carbonGramsPerKwh: z.number().min(0).default(350.0),
  recordedAt: z.string().optional(),
  institutionId: z.string().default('global'),
});

export const microgridOptimizeSchema = z.object({
  hourlyLoadKw: z.array(z.number()).length(24),
  hourlySolarGenKw: z.array(z.number()).length(24),
  bessCapacityKwh: z.number().min(1).default(500),
  bessMaxPowerKw: z.number().min(1).default(250),
  bessInitialSoCPercent: z.number().min(0).max(100).default(60),
  minSoCPercent: z.number().min(0).max(100).default(20),
  maxSoCPercent: z.number().min(0).max(100).default(90),
});

export const carbonCalculateSchema = z.object({
  inputs: z.array(
    z.object({
      activityId: z.string().optional(),
      facilityId: z.string().min(1),
      departmentId: z.string().optional(),
      scope: z.enum(['scope_1', 'scope_2', 'scope_3']),
      category: z.enum([
        'stationary_combustion',
        'mobile_fleet',
        'electricity_location',
        'electricity_market',
        'heating_cooling',
        'commute',
        'waste',
        'procurement',
        'business_travel',
      ]),
      fuelOrSource: z.string().min(1),
      quantity: z.number().min(0),
      unit: z.enum(['kWh', 'MWh', 'liters', 'gallons', 'm3', 'kg', 'tons', 'km', 'passenger_km']),
      activityDate: z.string().min(1),
      customEmissionFactor: z.number().optional(),
    })
  ),
  retiredOffsetsKg: z.number().min(0).default(0),
  region: z.string().default('GLOBAL'),
});

export const evFleetDispatchSchema = z.object({
  vehicles: z.array(
    z.object({
      vehicleId: z.string().min(1),
      vehicleType: z.enum(['bus', 'maintenance_van', 'shuttle']),
      batteryCapacityKwh: z.number().min(1),
      maxV2GDischargeKw: z.number().min(0),
      maxChargeKw: z.number().min(1),
      currentSoCPercent: z.number().min(0).max(100),
      scheduledDepartureTime: z.string().min(1),
      scheduledReturnTime: z.string().optional(),
      requiredTripEnergyKwh: z.number().min(0),
      targetDepartureSoCPercent: z.number().min(0).max(100).default(85),
      isV2GApproved: z.boolean().default(true),
    })
  ),
  peakDeficitKw: z.number().min(0),
  tariffRatePerKwh: z.number().min(0).default(0.32),
});

export const offsetRegisterSchema = z.object({
  offsetId: z.string().min(1),
  certificateNumber: z.string().min(1),
  registry: z.enum(['verra_vcs', 'gold_standard', 'irec_standard', 'cdm']).default('verra_vcs'),
  offsetType: z.enum(['reforestation', 'solar_renewable', 'methane_capture', 'direct_air_capture', 'irec_rec']).default('reforestation'),
  vintageYear: z.number().int().min(2000).max(2100).default(2025),
  quantityTonsCo2e: z.number().min(0.01),
  costPerTon: z.number().min(0).default(25.0),
  institutionId: z.string().default('global'),
});

export const offsetRetireSchema = z.object({
  offsetId: z.string().min(1),
  reportingPeriod: z.string().min(1),
  institutionId: z.string().default('global'),
});

export const esgReportCreateSchema = z.object({
  reportId: z.string().min(1),
  title: z.string().min(1),
  reportingPeriod: z.string().min(1),
  framework: z.enum(['ghg_protocol_gri305', 'csrd_esrs_e1', 'sec_climate', 'tcfd']).default('ghg_protocol_gri305'),
  scope1TotalKg: z.number().min(0).default(0.0),
  scope2LocationKg: z.number().min(0).default(0.0),
  scope2MarketKg: z.number().min(0).default(0.0),
  scope3TotalKg: z.number().min(0).default(0.0),
  netEmissionsKg: z.number().min(0).default(0.0),
  recOffsetsDeductedKg: z.number().min(0).default(0.0),
  merkleRoot: z.string().default(''),
  institutionId: z.string().default('global'),
});
