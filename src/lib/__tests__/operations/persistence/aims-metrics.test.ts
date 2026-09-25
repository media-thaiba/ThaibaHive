import { AimsMetricsTracker } from '@/lib/operations/persistence/aims-metrics';
import { GET as getMetrics } from '@/app/api/metrics/route';

describe('AIMS-020 — AimsMetricsTracker', () => {
  beforeEach(() => {
    AimsMetricsTracker.resetInstance();
  });

  it('should export valid Prometheus OpenMetrics exposition string', () => {
    const tracker = AimsMetricsTracker.getInstance();

    tracker.recordEnergySaved('campus_main', 'bld_engineering', 125.5);
    tracker.setHvacComfortPpd('zone_101', 0.08);
    tracker.setFleetFuelEfficiency('shuttle_1', 13.8);
    tracker.setActiveDispatches('ACTIVE', 4);
    tracker.recordBiometricVerificationDuration(0.045);
    tracker.recordCloudCostSavings('AWS', 450);
    tracker.recordCarbonEmissions('Scope1', 'Fleet', 120.0);
    tracker.setMarlCoordinationScore('hvac_energy', 0.94);

    const metricsText = tracker.exportOpenMetrics();

    expect(metricsText).toContain('aims_energy_saved_kwh_total');
    expect(metricsText).toContain('aims_hvac_comfort_ppd_ratio');
    expect(metricsText).toContain('aims_fleet_fuel_efficiency_km_per_liter');
    expect(metricsText).toContain('aims_biometric_verification_duration_seconds_bucket');
    expect(metricsText).toContain('aims_cloud_cost_reduction_dollars_total');
    expect(metricsText).toContain('aims_carbon_emissions_kg_co2e_total');
    expect(metricsText).toContain('aims_marl_agent_coordination_score');
  });

  it('should include AIMS metrics in global /api/metrics scrape response', async () => {
    const tracker = AimsMetricsTracker.getInstance();
    tracker.recordEnergySaved('campus_north', 'bld_it', 250.0);

    const previousMetricsSecret = process.env.METRICS_SECRET;
    process.env.METRICS_SECRET = 'metrics-secret-0123456789abcdef';

    const res = await getMetrics(
      new Request('http://localhost/api/metrics', {
        headers: { 'x-metrics-secret': 'metrics-secret-0123456789abcdef' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.text();

    expect(body).toContain('# --- AIMS Smart Campus Operations Telemetry ---');
    expect(body).toContain('aims_energy_saved_kwh_total');

    process.env.METRICS_SECRET = previousMetricsSecret;
  });
});
