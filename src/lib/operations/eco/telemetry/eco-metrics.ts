/**
 * Prometheus OpenMetrics Sustainability & Grid Telemetry Series
 */

export interface PrometheusMetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  values: Array<{
    labels: Record<string, string>;
    value: number;
  }>;
}

export class EcoMetrics {
  private static instance: EcoMetrics;

  private solarGenerationKw: Map<string, number> = new Map(); // key: tenantId:facilityId
  private gridPowerImportKw: Map<string, number> = new Map(); // key: tenantId
  private bessStateOfChargePercent: Map<string, number> = new Map(); // key: tenantId:batteryId
  private realtimeCarbonIntensityGrams: Map<string, number> = new Map(); // key: tenantId
  private evChargingPowerKw: Map<string, number> = new Map(); // key: tenantId:stationId
  private v2gDischargePowerKw: Map<string, number> = new Map(); // key: tenantId:vehicleId
  private cumulativeCarbonSavedTons: Map<string, number> = new Map(); // key: tenantId
  private tariffCostSavingsDollars: Map<string, number> = new Map(); // key: tenantId

  public static getInstance(): EcoMetrics {
    if (!EcoMetrics.instance) {
      EcoMetrics.instance = new EcoMetrics();
    }
    return EcoMetrics.instance;
  }

  public setSolarGenerationKw(tenantId: string, facilityId: string, kw: number): void {
    this.solarGenerationKw.set(`${tenantId}:${facilityId}`, kw);
  }

  public setGridPowerImportKw(tenantId: string, kw: number): void {
    this.gridPowerImportKw.set(tenantId, kw);
  }

  public setBessSoCPercent(tenantId: string, batteryId: string, soc: number): void {
    this.bessStateOfChargePercent.set(`${tenantId}:${batteryId}`, soc);
  }

  public setRealtimeCarbonIntensity(tenantId: string, gramsPerKwh: number): void {
    this.realtimeCarbonIntensityGrams.set(tenantId, gramsPerKwh);
  }

  public setEvChargingPowerKw(tenantId: string, stationId: string, kw: number): void {
    this.evChargingPowerKw.set(`${tenantId}:${stationId}`, kw);
  }

  public setV2gDischargePowerKw(tenantId: string, vehicleId: string, kw: number): void {
    this.v2gDischargePowerKw.set(`${tenantId}:${vehicleId}`, kw);
  }

  public incrementCarbonSavedTons(tenantId: string, tons: number): void {
    const curr = this.cumulativeCarbonSavedTons.get(tenantId) || 0;
    this.cumulativeCarbonSavedTons.set(tenantId, curr + tons);
  }

  public incrementTariffCostSavings(tenantId: string, dollars: number): void {
    const curr = this.tariffCostSavingsDollars.get(tenantId) || 0;
    this.tariffCostSavingsDollars.set(tenantId, curr + dollars);
  }

  public getMetrics(): PrometheusMetricEntry[] {
    const metrics: PrometheusMetricEntry[] = [
      {
        name: 'eco_solar_generation_kw',
        type: 'gauge',
        help: 'Current active solar photovoltaic generation in kilowatts',
        values: Array.from(this.solarGenerationKw.entries()).map(([k, val]) => {
          const [tenantId, facilityId] = k.split(':');
          return { labels: { tenantId, facilityId }, value: val };
        }),
      },
      {
        name: 'eco_grid_power_import_kw',
        type: 'gauge',
        help: 'Active grid power import demand in kilowatts',
        values: Array.from(this.gridPowerImportKw.entries()).map(([tenantId, val]) => ({
          labels: { tenantId },
          value: val,
        })),
      },
      {
        name: 'eco_bess_state_of_charge_percent',
        type: 'gauge',
        help: 'Battery Energy Storage System state of charge percentage (0-100%)',
        values: Array.from(this.bessStateOfChargePercent.entries()).map(([k, val]) => {
          const [tenantId, batteryId] = k.split(':');
          return { labels: { tenantId, batteryId }, value: val };
        }),
      },
      {
        name: 'eco_realtime_carbon_intensity_grams_per_kwh',
        type: 'gauge',
        help: 'Real-time grid marginal carbon intensity in grams CO2e per kWh',
        values: Array.from(this.realtimeCarbonIntensityGrams.entries()).map(([tenantId, val]) => ({
          labels: { tenantId },
          value: val,
        })),
      },
      {
        name: 'eco_ev_charging_power_kw',
        type: 'gauge',
        help: 'Active EV charging park demand in kilowatts',
        values: Array.from(this.evChargingPowerKw.entries()).map(([k, val]) => {
          const [tenantId, stationId] = k.split(':');
          return { labels: { tenantId, stationId }, value: val };
        }),
      },
      {
        name: 'eco_v2g_discharge_power_kw',
        type: 'gauge',
        help: 'Active Vehicle-to-Grid fleet discharge power into microgrid in kilowatts',
        values: Array.from(this.v2gDischargePowerKw.entries()).map(([k, val]) => {
          const [tenantId, vehicleId] = k.split(':');
          return { labels: { tenantId, vehicleId }, value: val };
        }),
      },
      {
        name: 'eco_cumulative_carbon_saved_tons_total',
        type: 'counter',
        help: 'Cumulative metric tons of CO2e emissions avoided through renewables and storage',
        values: Array.from(this.cumulativeCarbonSavedTons.entries()).map(([tenantId, val]) => ({
          labels: { tenantId },
          value: val,
        })),
      },
      {
        name: 'eco_tariff_cost_savings_dollars_total',
        type: 'counter',
        help: 'Cumulative dollar cost savings realized from tariff arbitrage and peak shaving',
        values: Array.from(this.tariffCostSavingsDollars.entries()).map(([tenantId, val]) => ({
          labels: { tenantId },
          value: val,
        })),
      },
    ];

    return metrics;
  }

  public toPrometheusText(): string {
    const lines: string[] = [];
    for (const metric of this.getMetrics()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      for (const entry of metric.values) {
        const labelPairs = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelStr = labelPairs.length > 0 ? `{${labelPairs}}` : '';
        lines.push(`${metric.name}${labelStr} ${entry.value}`);
      }
    }
    return lines.join('\n') + '\n';
  }
}
