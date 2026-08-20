/**
 * React Hook for System Resilience Benchmarks & Recommendations
 * Sprint-042 (ARES) — ARES-021
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';
import { SystemResilienceSnapshot, ResilienceTrendReport, RemediationRecommendation } from '../security/resilience/resilience-types';

export function useResilienceScore() {
  const [snapshot, setSnapshot] = useState<SystemResilienceSnapshot | null>(null);
  const [trends, setTrends] = useState<ResilienceTrendReport | null>(null);
  const [recommendations, setRecommendations] = useState<RemediationRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/resilience')
        .then((r) => r.json())
        .catch(() => ({ snapshot: null, trends: null, recommendations: [] }));

      if (res.snapshot) setSnapshot(res.snapshot);
      if (res.trends) setTrends(res.trends);
      setRecommendations(ensureArray(res.recommendations));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch resilience score');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return {
    snapshot,
    trends,
    recommendations,
    loading,
    error,
    refresh: fetchScore,
  };
}
