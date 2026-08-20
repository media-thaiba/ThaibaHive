'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseCampusEnergyOptions {
  campusId?: string;
  pollingIntervalMs?: number;
}

export function useCampusEnergy(options: UseCampusEnergyOptions = {}) {
  const { campusId = 'campus_main', pollingIntervalMs = 15000 } = options;
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalSavedKwh: 0, totalCostSavedDollars: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnergyData = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/admin/operations/energy/hvac?campusId=${encodeURIComponent(campusId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch energy optimization metrics');
        return res.json();
      })
      .then((data) => {
        setOptimizations(data.optimizations || []);
        setSummary(data.summary || { totalSavedKwh: 0, totalCostSavedDollars: 0 });
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching energy metrics');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [campusId]);

  useEffect(() => {
    fetchEnergyData();
    const timer = setInterval(fetchEnergyData, pollingIntervalMs);
    return () => clearInterval(timer);
  }, [fetchEnergyData, pollingIntervalMs]);

  const triggerOptimization = async (params: { buildingId: string; zoneId: string; currentTempCelsius: number }) => {
    try {
      const res = await fetch('/api/admin/operations/energy/hvac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusId,
          ...params,
        }),
      });
      if (!res.ok) throw new Error('Optimization request failed');
      const data = await res.json();
      fetchEnergyData();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    optimizations,
    summary,
    isLoading,
    error,
    refresh: fetchEnergyData,
    triggerOptimization,
  };
}
