/**
 * React Hook for Predictive Threats & Early Warnings
 * Sprint-042 (ARES) — ARES-021
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';
import { PredictiveThreatForecast, EarlyWarningAlert } from '../security/ares/ares-types';

export function usePredictiveThreats() {
  const [threats, setThreats] = useState<PredictiveThreatForecast[]>([]);
  const [alerts, setAlerts] = useState<EarlyWarningAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/threats')
        .then((r) => r.json())
        .catch(() => ({ threats: [], alerts: [] }));

      setThreats(ensureArray(res.threats));
      setAlerts(ensureArray(res.alerts));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load predictive threat forecasts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  const triggerForecast = async (
    category: string,
    evidenceSignals: any[] = [],
    affectedAssetIds: string[] = ['primary-cluster']
  ) => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/threats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, evidenceSignals, affectedAssetIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger forecast');
      await fetchThreats();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    threats,
    alerts,
    loading,
    error,
    refresh: fetchThreats,
    triggerForecast,
  };
}
