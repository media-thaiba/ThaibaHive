/**
 * Unit tests for ThreatForecaster (ARES-002)
 */

import { ThreatForecaster } from '@/lib/security/ares/threat-forecaster';
import { ThreatSignalEvidence } from '@/lib/security/ares/ares-types';

describe('ARES-002: ThreatForecaster', () => {
  beforeEach(() => {
    ThreatForecaster.resetInstance();
  });

  it('should generate low-severity forecast when signals are sparse', () => {
    const forecaster = ThreatForecaster.getInstance();
    const forecast = forecaster.generateForecast('CREDENTIAL_STUFFING', []);

    expect(forecast.threatCategory).toBe('CREDENTIAL_STUFFING');
    expect(forecast.posteriorProbability).toBeLessThan(0.35);
    expect(forecast.severityTier).toBe('MONITOR');
    expect(forecast.projectedExploitWindowDays).toBe(14);
  });

  it('should generate CRITICAL_FORECAST with 7-day exploit window when multiple high-intensity signals present', () => {
    const forecaster = ThreatForecaster.getInstance();
    const strongSignals: ThreatSignalEvidence[] = [
      {
        signalId: 's-1',
        source: 'honeypot',
        signalType: 'FAILED_AUTH_SPIKE',
        weight: 0.95,
        observedValue: 0.95,
        timestamp: new Date().toISOString(),
      },
      {
        signalId: 's-2',
        source: 'intel_feed',
        signalType: 'IMPOSSIBLE_TRAVEL',
        weight: 0.90,
        observedValue: 0.88,
        timestamp: new Date().toISOString(),
      },
      {
        signalId: 's-3',
        source: 'firewall',
        signalType: 'ANOMALOUS_PORT_SCAN',
        weight: 0.85,
        observedValue: 0.85,
        timestamp: new Date().toISOString(),
      },
    ];

    const forecast = forecaster.generateForecast('CREDENTIAL_STUFFING', strongSignals);

    expect(forecast.posteriorProbability).toBeGreaterThan(0.70);
    expect(forecast.projectedExploitWindowDays).toBe(7);
    expect(forecast.recommendedMitigations.length).toBeGreaterThan(0);
  });
});
