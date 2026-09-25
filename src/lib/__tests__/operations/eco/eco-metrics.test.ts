import { EcoMetrics } from '../../../operations/eco/telemetry/eco-metrics';

describe('EcoMetrics Prometheus OpenMetrics Unit Tests', () => {
  let metrics: EcoMetrics;

  beforeEach(() => {
    metrics = EcoMetrics.getInstance();
  });

  it('should record gauges and counters and export valid OpenMetrics text format', () => {
    metrics.setSolarGenerationKw('inst_alpha', 'fac_eng', 185.5);
    metrics.setGridPowerImportKw('inst_alpha', 65.2);
    metrics.setBessSoCPercent('inst_alpha', 'bat_01', 78.4);
    metrics.setRealtimeCarbonIntensity('inst_alpha', 210.0);
    metrics.setEvChargingPowerKw('inst_alpha', 'evs_01', 45.0);
    metrics.setV2gDischargePowerKw('inst_alpha', 'bus_01', 30.0);
    metrics.incrementCarbonSavedTons('inst_alpha', 12.5);
    metrics.incrementTariffCostSavings('inst_alpha', 345.50);

    const metricList = metrics.getMetrics();
    expect(metricList).toHaveLength(8);

    const text = metrics.toPrometheusText();
    expect(text).toContain('# HELP eco_solar_generation_kw');
    expect(text).toContain('# TYPE eco_solar_generation_kw gauge');
    expect(text).toContain('eco_solar_generation_kw{tenantId="inst_alpha",facilityId="fac_eng"} 185.5');
    expect(text).toContain('eco_bess_state_of_charge_percent{tenantId="inst_alpha",batteryId="bat_01"} 78.4');
    expect(text).toContain('eco_cumulative_carbon_saved_tons_total{tenantId="inst_alpha"}');
  });
});
