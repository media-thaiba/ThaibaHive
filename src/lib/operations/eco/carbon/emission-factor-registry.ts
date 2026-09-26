/**
 * Emission Factor Registry
 * Conforms to GHG Protocol Corporate Standard, IPCC AR6, and GRI 305
 */

import { EmissionFactor, CarbonCategory } from '../eco-types';

export class EmissionFactorRegistry {
  private static instance: EmissionFactorRegistry;
  private factors: Map<string, EmissionFactor> = new Map();

  private constructor() {
    this.seedDefaultFactors();
  }

  public static getInstance(): EmissionFactorRegistry {
    if (!EmissionFactorRegistry.instance) {
      EmissionFactorRegistry.instance = new EmissionFactorRegistry();
    }
    return EmissionFactorRegistry.instance;
  }

  private seedDefaultFactors(): void {
    const defaultFactors: EmissionFactor[] = [
      // ─── Scope 1: Direct Stationary & Mobile Combustion ───
      {
        factorId: 'ef_diesel_stationary',
        activityCategory: 'stationary_combustion',
        fuelOrFuelSource: 'diesel_generator',
        unit: 'liters',
        co2FactorKg: 2.687,
        ch4FactorKg: 0.003,
        n2oFactorKg: 0.006,
        co2eTotalKgPerUnit: 2.696,
        standard: 'IPCC_AR6',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_natural_gas',
        activityCategory: 'stationary_combustion',
        fuelOrFuelSource: 'natural_gas',
        unit: 'm3',
        co2FactorKg: 2.015,
        ch4FactorKg: 0.008,
        n2oFactorKg: 0.002,
        co2eTotalKgPerUnit: 2.025,
        standard: 'IPCC_AR6',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_petrol_fleet',
        activityCategory: 'mobile_fleet',
        fuelOrFuelSource: 'gasoline_petrol',
        unit: 'liters',
        co2FactorKg: 2.314,
        ch4FactorKg: 0.005,
        n2oFactorKg: 0.004,
        co2eTotalKgPerUnit: 2.323,
        standard: 'IPCC_AR6',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_diesel_fleet',
        activityCategory: 'mobile_fleet',
        fuelOrFuelSource: 'diesel_van_bus',
        unit: 'liters',
        co2FactorKg: 2.687,
        ch4FactorKg: 0.002,
        n2oFactorKg: 0.005,
        co2eTotalKgPerUnit: 2.694,
        standard: 'IPCC_AR6',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },

      // ─── Scope 2: Purchased Electricity (Location & Market) ───
      {
        factorId: 'ef_grid_electricity_location_us',
        activityCategory: 'electricity_location',
        fuelOrFuelSource: 'grid_mix_location',
        unit: 'kWh',
        co2FactorKg: 0.375,
        ch4FactorKg: 0.001,
        n2oFactorKg: 0.001,
        co2eTotalKgPerUnit: 0.377,
        standard: 'EPA_EGRID',
        region: 'US_AVERAGE',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_grid_electricity_location_eu',
        activityCategory: 'electricity_location',
        fuelOrFuelSource: 'grid_mix_location',
        unit: 'kWh',
        co2FactorKg: 0.230,
        ch4FactorKg: 0.0005,
        n2oFactorKg: 0.0005,
        co2eTotalKgPerUnit: 0.231,
        standard: 'DEFRA',
        region: 'EU_AVERAGE',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_grid_electricity_market_green',
        activityCategory: 'electricity_market',
        fuelOrFuelSource: 'green_tariff_ppa',
        unit: 'kWh',
        co2FactorKg: 0.015,
        ch4FactorKg: 0.0,
        n2oFactorKg: 0.0,
        co2eTotalKgPerUnit: 0.015,
        standard: 'GHG_PROTOCOL',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },

      // ─── Scope 3: Commute, Waste, Travel ───
      {
        factorId: 'ef_commute_passenger_car',
        activityCategory: 'commute',
        fuelOrFuelSource: 'passenger_car_ice',
        unit: 'km',
        co2FactorKg: 0.170,
        co2eTotalKgPerUnit: 0.171,
        standard: 'DEFRA',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_commute_public_transit',
        activityCategory: 'commute',
        fuelOrFuelSource: 'electric_metro_bus',
        unit: 'passenger_km',
        co2FactorKg: 0.045,
        co2eTotalKgPerUnit: 0.045,
        standard: 'DEFRA',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_campus_waste_landfill',
        activityCategory: 'waste',
        fuelOrFuelSource: 'municipal_solid_waste',
        unit: 'kg',
        co2FactorKg: 0.420,
        ch4FactorKg: 0.035,
        co2eTotalKgPerUnit: 0.455,
        standard: 'IPCC_AR6',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
      {
        factorId: 'ef_business_flight_short',
        activityCategory: 'business_travel',
        fuelOrFuelSource: 'commercial_aviation_short_haul',
        unit: 'passenger_km',
        co2FactorKg: 0.155,
        co2eTotalKgPerUnit: 0.158,
        standard: 'DEFRA',
        region: 'GLOBAL',
        effectiveYear: 2026,
      },
    ];

    for (const factor of defaultFactors) {
      this.factors.set(factor.factorId, factor);
    }
  }

  public registerFactor(factor: EmissionFactor): void {
    this.factors.set(factor.factorId, factor);
  }

  public getFactor(factorId: string): EmissionFactor | undefined {
    return this.factors.get(factorId);
  }

  public findFactor(category: CarbonCategory, fuelOrSource: string, region: string = 'GLOBAL'): EmissionFactor | undefined {
    const list = Array.from(this.factors.values());
    // Direct exact match
    const exact = list.find(
      (f) =>
        f.activityCategory === category &&
        f.fuelOrFuelSource.toLowerCase() === fuelOrSource.toLowerCase() &&
        (f.region === region || f.region === 'GLOBAL')
    );
    if (exact) return exact;

    // Fallback match on category
    return list.find((f) => f.activityCategory === category);
  }

  public listFactors(category?: CarbonCategory): EmissionFactor[] {
    const list = Array.from(this.factors.values());
    if (category) {
      return list.filter((f) => f.activityCategory === category);
    }
    return list;
  }
}
