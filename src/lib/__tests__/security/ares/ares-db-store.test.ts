/**
 * Unit tests for AresDbStore (ARES-017)
 */

import { AresDbStore } from '@/lib/security/ares/ares-db-store';
import { PredictiveThreatForecast } from '@/lib/security/ares/ares-types';

describe('ARES-017: AresDbStore', () => {
  it('should save and list predictive threats gracefully', async () => {
    const store = AresDbStore.getInstance();
    const mockForecast: PredictiveThreatForecast = {
      forecastId: `fc-db-${Date.now()}`,
      threatCategory: 'CREDENTIAL_STUFFING',
      posteriorProbability: 0.85,
      confidenceScore: 90,
      severityTier: 'CRITICAL_FORECAST',
      projectedExploitWindowDays: 7,
      keyIndicators: ['sig-1'],
      affectedAssetIds: ['auth-cluster'],
      recommendedMitigations: ['Enforce WebAuthn'],
      calculatedAt: new Date().toISOString(),
    };

    await store.savePredictiveThreat(mockForecast);
    const list = await store.listPredictiveThreats(10);

    expect(Array.isArray(list)).toBe(true);
    expect(list.some((item) => item.id === mockForecast.forecastId)).toBe(true);
  });
});
