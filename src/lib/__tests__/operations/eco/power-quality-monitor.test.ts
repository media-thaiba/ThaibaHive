import { PowerQualityMonitor } from '../../../operations/eco/telemetry/power-quality-monitor';
import { GridAnomalyDetector } from '../../../operations/eco/telemetry/grid-anomaly-detector';

describe('PowerQualityMonitor & GridAnomalyDetector Unit Tests', () => {
  it('should detect voltage sag when voltage drops below 90% nominal', () => {
    const issues = PowerQualityMonitor.analyzeReading({
      assetId: 'trans_01',
      nominalVoltage: 400,
      voltageV: 340, // 340V is 15% drop
      nominalFrequency: 50,
      frequencyHz: 50.0,
      powerFactor: 0.98,
      timestamp: new Date().toISOString(),
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe('voltage_sag');
    expect(issues[0].severity).toBe('high');
    expect(issues[0].measuredValue).toBe(340);
  });

  it('should detect voltage swell when voltage exceeds 110% nominal', () => {
    const issues = PowerQualityMonitor.analyzeReading({
      assetId: 'trans_01',
      nominalVoltage: 400,
      voltageV: 450, // 450V is 12.5% increase
      nominalFrequency: 50,
      frequencyHz: 50.0,
      powerFactor: 0.98,
      timestamp: new Date().toISOString(),
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe('voltage_swell');
    expect(issues[0].severity).toBe('high');
  });

  it('should detect frequency excursion, low power factor, and 3-phase imbalance', () => {
    const issues = PowerQualityMonitor.analyzeReading({
      assetId: 'substation_01',
      nominalVoltage: 400,
      voltageV: 400,
      nominalFrequency: 50,
      frequencyHz: 49.3, // 0.7 Hz drop
      powerFactor: 0.72, // low PF
      currentPhaseA: 100,
      currentPhaseB: 60,
      currentPhaseC: 110, // severe imbalance
      thdPercent: 7.5, // high THD
      timestamp: new Date().toISOString(),
    });

    expect(issues.some((i) => i.issueType === 'frequency_deviation')).toBe(true);
    expect(issues.some((i) => i.issueType === 'low_power_factor')).toBe(true);
    expect(issues.some((i) => i.issueType === 'phase_imbalance')).toBe(true);
    expect(issues.some((i) => i.issueType === 'high_thd')).toBe(true);
  });

  it('should detect peak demand surge anomalies', () => {
    const surge = GridAnomalyDetector.detectDemandSurge(
      'meter_main',
      450, // 450 kW current
      400, // 400 kW contracted max
      200,
      'inst_alpha'
    );

    expect(surge).not.toBeNull();
    expect(surge?.anomalyType).toBe('peak_demand_surge');
    expect(surge?.severity).toBe('critical');
  });

  it('should detect night-time phantom loads', () => {
    const phantom = GridAnomalyDetector.detectPhantomNightLoad(
      'meter_science',
      85, // 85 kW draw
      35, // 35 kW expected night baseline
      2, // 02:00 AM
      'inst_alpha'
    );

    expect(phantom).not.toBeNull();
    expect(phantom?.anomalyType).toBe('phantom_night_load');
    expect(phantom?.severity).toBe('medium');
  });

  it('should detect solar underperformance during clear midday hours', () => {
    const solarFault = GridAnomalyDetector.detectSolarUnderperformance(
      'gen_solar_01',
      20, // 20 kW actual
      180, // 180 kW expected clear sky
      5, // 5% clouds (clear sky)
      12, // 12:00 PM
      'inst_alpha'
    );

    expect(solarFault).not.toBeNull();
    expect(solarFault?.anomalyType).toBe('solar_underperformance');
  });
});
