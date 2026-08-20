/**
 * AIMS Prometheus OpenMetrics Telemetry Tracker
 * Sprint-043 (AIMS / AutoOps) — AIMS-020
 */

export class AimsMetricsTracker {
  private static instance: AimsMetricsTracker;

  private energySavedKwh = new Map<string, number>();
  private hvacComfortPpd = new Map<string, number>();
  private fleetFuelEfficiency = new Map<string, number>();
  private fleetActiveDispatches = new Map<string, number>();
  private biometricDurations: number[] = [];
  private cloudCostSavingsDollars = new Map<string, number>();
  private carbonEmissionsKg = new Map<string, number>();
  private marlCoordinationScores = new Map<string, number>();

  private readonly HISTOGRAM_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0];

  private constructor() {}

  public static getInstance(): AimsMetricsTracker {
    if (!AimsMetricsTracker.instance) {
      AimsMetricsTracker.instance = new AimsMetricsTracker();
    }
    return AimsMetricsTracker.instance;
  }

  public static resetInstance(): void {
    AimsMetricsTracker.instance = new AimsMetricsTracker();
  }

  public recordEnergySaved(campus: string, building: string, kwh: number): void {
    const key = `campus="${campus}",building="${building}"`;
    this.energySavedKwh.set(key, (this.energySavedKwh.get(key) || 0) + kwh);
  }

  public setHvacComfortPpd(zone: string, ppdRatio: number): void {
    const key = `zone="${zone}"`;
    this.hvacComfortPpd.set(key, ppdRatio);
  }

  public setFleetFuelEfficiency(vehicleId: string, kmPerLiter: number): void {
    const key = `vehicle_id="${vehicleId}"`;
    this.fleetFuelEfficiency.set(key, kmPerLiter);
  }

  public setActiveDispatches(status: string, count: number): void {
    const key = `status="${status}"`;
    this.fleetActiveDispatches.set(key, count);
  }

  public recordBiometricVerificationDuration(durationSeconds: number): void {
    this.biometricDurations.push(durationSeconds);
    if (this.biometricDurations.length > 500) {
      this.biometricDurations.shift();
    }
  }

  public recordCloudCostSavings(provider: string, dollars: number): void {
    const key = `provider="${provider}"`;
    this.cloudCostSavingsDollars.set(key, (this.cloudCostSavingsDollars.get(key) || 0) + dollars);
  }

  public recordCarbonEmissions(scope: string, domain: string, kgCo2e: number): void {
    const key = `scope="${scope}",domain="${domain}"`;
    this.carbonEmissionsKg.set(key, (this.carbonEmissionsKg.get(key) || 0) + kgCo2e);
  }

  public setMarlCoordinationScore(domain: string, score: number): void {
    const key = `domain="${domain}"`;
    this.marlCoordinationScores.set(key, score);
  }

  public exportOpenMetrics(): string {
    const lines: string[] = [];

    // 1. Energy Saved
    lines.push('# HELP aims_energy_saved_kwh_total Total electrical energy saved in kWh via autonomous HVAC optimization');
    lines.push('# TYPE aims_energy_saved_kwh_total counter');
    for (const [labels, val] of this.energySavedKwh.entries()) {
      lines.push(`aims_energy_saved_kwh_total{${labels}} ${val}`);
    }

    // 2. HVAC Comfort PPD
    lines.push('# HELP aims_hvac_comfort_ppd_ratio Predicted Percentage of Dissatisfied (PPD) ratio per zone');
    lines.push('# TYPE aims_hvac_comfort_ppd_ratio gauge');
    for (const [labels, val] of this.hvacComfortPpd.entries()) {
      lines.push(`aims_hvac_comfort_ppd_ratio{${labels}} ${val}`);
    }

    // 3. Fleet Efficiency
    lines.push('# HELP aims_fleet_fuel_efficiency_km_per_liter Fuel or battery efficiency in km per liter equivalent');
    lines.push('# TYPE aims_fleet_fuel_efficiency_km_per_liter gauge');
    for (const [labels, val] of this.fleetFuelEfficiency.entries()) {
      lines.push(`aims_fleet_fuel_efficiency_km_per_liter{${labels}} ${val}`);
    }

    // 4. Active Dispatches
    lines.push('# HELP aims_fleet_active_dispatches Active fleet route dispatches by status');
    lines.push('# TYPE aims_fleet_active_dispatches gauge');
    for (const [labels, val] of this.fleetActiveDispatches.entries()) {
      lines.push(`aims_fleet_active_dispatches{${labels}} ${val}`);
    }

    // 5. Biometric Duration Histogram
    lines.push('# HELP aims_biometric_verification_duration_seconds Latency of edge biometric match & ZKP verification');
    lines.push('# TYPE aims_biometric_verification_duration_seconds histogram');
    const count = this.biometricDurations.length;
    const sum = this.biometricDurations.reduce((acc, v) => acc + v, 0);
    for (const bucket of this.HISTOGRAM_BUCKETS) {
      const bCount = this.biometricDurations.filter((d) => d <= bucket).length;
      lines.push(`aims_biometric_verification_duration_seconds_bucket{le="${bucket}"} ${bCount}`);
    }
    lines.push(`aims_biometric_verification_duration_seconds_bucket{le="+Inf"} ${count}`);
    lines.push(`aims_biometric_verification_duration_seconds_sum ${sum}`);
    lines.push(`aims_biometric_verification_duration_seconds_count ${count}`);

    // 6. Cloud Cost Savings
    lines.push('# HELP aims_cloud_cost_reduction_dollars_total Cumulative cloud cost reduction in USD');
    lines.push('# TYPE aims_cloud_cost_reduction_dollars_total counter');
    for (const [labels, val] of this.cloudCostSavingsDollars.entries()) {
      lines.push(`aims_cloud_cost_reduction_dollars_total{${labels}} ${val}`);
    }

    // 7. Carbon Emissions
    lines.push('# HELP aims_carbon_emissions_kg_co2e_total Carbon footprint emissions tracking in kg CO2e');
    lines.push('# TYPE aims_carbon_emissions_kg_co2e_total counter');
    for (const [labels, val] of this.carbonEmissionsKg.entries()) {
      lines.push(`aims_carbon_emissions_kg_co2e_total{${labels}} ${val}`);
    }

    // 8. MARL Coordination Score
    lines.push('# HELP aims_marl_agent_coordination_score MARL multi-agent coordination convergence score (0-1)');
    lines.push('# TYPE aims_marl_agent_coordination_score gauge');
    for (const [labels, val] of this.marlCoordinationScores.entries()) {
      lines.push(`aims_marl_agent_coordination_score{${labels}} ${val}`);
    }

    return lines.join('\n') + '\n';
  }
}
