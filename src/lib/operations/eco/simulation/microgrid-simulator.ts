/**
 * Microgrid & Net-Zero ESG End-to-End Simulation Engine
 */

import { RenewableForecaster } from '../ml/renewable-forecaster';
import { TariffArbitrageOptimizer } from '../ml/tariff-arbitrage-optimizer';
import { CarbonAccountingEngine } from '../carbon/carbon-accounting-engine';
import { V2GFleetDispatcher } from '../ev/v2g-fleet-dispatcher';
import { CarbonMerkleAnchor } from '../security/carbon-merkle-anchor';
import { EcoMetrics } from '../telemetry/eco-metrics';

export interface MicrogridSimulationReport {
  simulationId: string;
  durationHours: number;
  totalSolarEnergyGeneratedKwh: number;
  totalFacilityEnergyConsumedKwh: number;
  cleanEnergySelfSufficiencyPercent: number;
  baselineEnergyCostDollars: number;
  optimizedEnergyCostDollars: number;
  totalCostSavingsDollars: number;
  savingsPercentage: number;
  peakDemandShavedKw: number;
  totalGrossCarbonEmissionsKg: number;
  totalNetCarbonEmissionsKg: number;
  carbonAvoidedTons: number;
  merkleProofRoot: string;
  isCompliant: boolean;
}

export class MicrogridSimulator {
  /**
   * Run 24-hour end-to-end autonomous microgrid simulation
   */
  public static async run24hSimulation(institutionId: string = 'inst_sim_01'): Promise<MicrogridSimulationReport> {
    const simulationId = `sim_eco_${Date.now()}`;
    const forecaster = new RenewableForecaster();
    const anchor = CarbonMerkleAnchor.getInstance();
    const metrics = EcoMetrics.getInstance();

    // 1. Forecast 24h Solar generation
    const solarConfig = {
      solarArrays: [
        { sourceId: 'pv_north_01', name: 'North Rooftop PV', spec: { peakCapacityKw: 300, tiltAngleDeg: 15, azimuthAngleDeg: 180 } },
        { sourceId: 'pv_south_02', name: 'South Field PV', spec: { peakCapacityKw: 200, tiltAngleDeg: 15, azimuthAngleDeg: 180 } },
      ],
      latitude: 28.6139,
      longitude: 77.2090,
    };

    const startTime = new Date('2026-08-21T00:00:00.000Z');
    const forecastRes = await forecaster.forecast(solarConfig, 24, startTime);
    const hourlySolarKw = forecastRes.points.map((p) => p.forecastedGenerationKw);

    // 2. Synthesize typical 24-hour campus building load
    const hourlyLoadKw = [
      60, 55, 52, 50, 55, 80, 140, 220, 310, 380, 420, 440, 430, 410, 430, 440, 410, 360, 280, 210, 140, 100, 75, 65,
    ];

    // 3. Optimize BESS Battery Arbitrage & Peak Shaving
    const optRes = TariffArbitrageOptimizer.optimize({
      hourlyLoadKw,
      hourlySolarGenKw: hourlySolarKw,
      bessCapacityKwh: 1000,
      bessMaxPowerKw: 500,
      bessInitialSoCPercent: 60,
    });

    // 4. Dispatch V2G Fleet during peak hours (14:00 - 18:00)
    const fleet = [
      {
        vehicleId: 'bus_01',
        vehicleType: 'bus' as const,
        batteryCapacityKwh: 250,
        maxV2GDischargeKw: 60,
        maxChargeKw: 70,
        currentSoCPercent: 85,
        scheduledDepartureTime: '2026-08-21T18:30:00.000Z',
        requiredTripEnergyKwh: 80,
        targetDepartureSoCPercent: 85,
        isV2GApproved: true,
      },
      {
        vehicleId: 'van_01',
        vehicleType: 'maintenance_van' as const,
        batteryCapacityKwh: 100,
        maxV2GDischargeKw: 30,
        maxChargeKw: 40,
        currentSoCPercent: 90,
        scheduledDepartureTime: '2026-08-21T19:00:00.000Z',
        requiredTripEnergyKwh: 30,
        targetDepartureSoCPercent: 80,
        isV2GApproved: true,
      },
    ];

    const v2gRes = V2GFleetDispatcher.dispatchFleet(fleet, 90, 0.32, new Date('2026-08-21T15:00:00.000Z'));

    // 5. Calculate 24h Carbon Accounting Ledger
    const carbonEngine = new CarbonAccountingEngine();
    const carbonRes = carbonEngine.calculateBatchEmissions(
      [
        { facilityId: 'fac_eng', scope: 'scope_1', category: 'stationary_combustion', fuelOrSource: 'natural_gas', quantity: 200, unit: 'm3', activityDate: '2026-08-21' },
        { facilityId: 'fac_eng', scope: 'scope_2', category: 'electricity_location', fuelOrSource: 'grid_electricity', quantity: 3500, unit: 'kWh', activityDate: '2026-08-21' },
        { facilityId: 'fac_eng', scope: 'scope_3', category: 'commute', fuelOrSource: 'diesel_bus', quantity: 800, unit: 'passenger_km', activityDate: '2026-08-21' },
      ],
      1000,
      'GLOBAL'
    );

    // 6. Anchor Merkle Audit Block
    const auditBlock = anchor.recordAuditBlock(
      'simulation_cycle_completed',
      'microgrid_simulator',
      {
        simulationId,
        totalSolarKwh: forecastRes.totalForecastKwh,
        costSavingsDollars: optRes.totalCostSavingsDollars + v2gRes.totalCostSavingsDollars,
        netCarbonKg: carbonRes.breakdown.totalNetKg,
      },
      institutionId
    );

    const totalFacilityKwh = hourlyLoadKw.reduce((a, b) => a + b, 0);
    const selfSufficiency = Math.min(100, Number(((forecastRes.totalForecastKwh / totalFacilityKwh) * 100).toFixed(1)));
    const totalSavings = Number((optRes.totalCostSavingsDollars + v2gRes.totalCostSavingsDollars).toFixed(2));
    const savingsPct = Number(((totalSavings / optRes.baselineCostWithoutBess) * 100).toFixed(1));
    const carbonAvoidedTons = Number(((forecastRes.totalForecastKwh * 0.45) / 1000).toFixed(2));

    // Record Prometheus gauges
    metrics.setSolarGenerationKw(institutionId, 'fac_eng', forecastRes.peakGenerationKw);
    metrics.incrementCarbonSavedTons(institutionId, carbonAvoidedTons);
    metrics.incrementTariffCostSavings(institutionId, totalSavings);

    return {
      simulationId,
      durationHours: 24,
      totalSolarEnergyGeneratedKwh: forecastRes.totalForecastKwh,
      totalFacilityEnergyConsumedKwh: totalFacilityKwh,
      cleanEnergySelfSufficiencyPercent: selfSufficiency,
      baselineEnergyCostDollars: optRes.baselineCostWithoutBess,
      optimizedEnergyCostDollars: Number((optRes.optimizedCostWithBess - v2gRes.totalCostSavingsDollars).toFixed(2)),
      totalCostSavingsDollars: totalSavings,
      savingsPercentage: savingsPct,
      peakDemandShavedKw: optRes.peakDemandShavedKw + v2gRes.totalDischargePowerKw,
      totalGrossCarbonEmissionsKg: carbonRes.breakdown.totalGrossKg,
      totalNetCarbonEmissionsKg: carbonRes.breakdown.totalNetKg,
      carbonAvoidedTons,
      merkleProofRoot: auditBlock.merkleLeaf,
      isCompliant: true,
    };
  }
}
