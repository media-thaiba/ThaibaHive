/**
 * React Hook for Chaos Mesh & Experiment State Management
 * Sprint-042 (ARES) — ARES-021
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';
import { ChaosScenario, ChaosExecutionRecord } from '../security/chaos/chaos-types';

export function useChaosMesh() {
  const [scenarios, setScenarios] = useState<ChaosScenario[]>([]);
  const [executions, setExecutions] = useState<ChaosExecutionRecord[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/chaos/experiments')
        .then((r) => r.json())
        .catch(() => ({ scenarios: [], executions: [] }));

      setScenarios(ensureArray(res.scenarios));
      setExecutions(ensureArray(res.executions));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch chaos mesh state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const runExperiment = async (scenarioId: string) => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/chaos/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run chaos experiment');
      await fetchState();
      return data.execution;
    } catch (err: any) {
      throw err;
    } finally {
      setIsRunning(false);
    }
  };

  const emergencyAbort = async (reason: string = 'Administrative emergency kill-switch') => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/chaos/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trip kill-switch');
      await fetchState();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    scenarios,
    executions,
    isRunning,
    loading,
    error,
    refresh: fetchState,
    runExperiment,
    emergencyAbort,
  };
}
