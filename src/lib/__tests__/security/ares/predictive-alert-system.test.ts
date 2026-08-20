/**
 * Unit tests for PredictiveAlertSystem & ConfidenceThresholdEngine (ARES-003)
 */

import { PredictiveAlertSystem } from '@/lib/security/ares/predictive-alert-system';
import { ConfidenceThresholdEngine } from '@/lib/security/ares/confidence-threshold';
import { PredictiveThreatForecast } from '@/lib/security/ares/ares-types';

describe('ARES-003: PredictiveAlertSystem', () => {
  beforeEach(() => {
    ConfidenceThresholdEngine.resetInstance();
    PredictiveAlertSystem.resetInstance();
  });

  it('should suppress alert when threat probability is in MONITOR range', () => {
    const system = PredictiveAlertSystem.getInstance();
    const forecast: PredictiveThreatForecast = {
      forecastId: 'fc-test-1',
      threatCategory: 'CREDENTIAL_STUFFING',
      posteriorProbability: 0.15,
      confidenceScore: 40,
      severityTier: 'MONITOR',
      projectedExploitWindowDays: 14,
      keyIndicators: [],
      affectedAssetIds: ['asset-1'],
      recommendedMitigations: ['Monitor logs'],
      calculatedAt: new Date().toISOString(),
    };

    const alert = system.evaluateAndAlert(forecast);
    expect(alert).toBeNull();
  });

  it('should trigger CRITICAL_FORECAST alert when probability and confidence exceed thresholds', () => {
    const system = PredictiveAlertSystem.getInstance();
    const forecast: PredictiveThreatForecast = {
      forecastId: 'fc-test-2',
      threatCategory: 'ZERO_DAY_EXPLOIT',
      posteriorProbability: 0.85,
      confidenceScore: 88,
      severityTier: 'CRITICAL_FORECAST',
      projectedExploitWindowDays: 7,
      keyIndicators: ['CVE-2026-9999'],
      affectedAssetIds: ['gateway-cluster'],
      recommendedMitigations: ['Isolate VLAN 30', 'Proactively rotate certs'],
      calculatedAt: new Date().toISOString(),
    };

    let listenerTriggered = false;
    system.onAlert((a) => {
      if (a.forecastId === 'fc-test-2') listenerTriggered = true;
    });

    const alert = system.evaluateAndAlert(forecast);
    expect(alert).not.toBeNull();
    expect(alert?.severityTier).toBe('CRITICAL_FORECAST');
    expect(alert?.recommendedActions.length).toBe(2);
    expect(listenerTriggered).toBe(true);

    // Acknowledge alert
    if (alert) {
      const acked = system.acknowledgeAlert(alert.alertId, 'admin-user-1');
      expect(acked).toBe(true);
      expect(system.getAlerts()[0].acknowledged).toBe(true);
    }
  });
});
