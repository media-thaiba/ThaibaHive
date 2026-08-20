'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFleetLogistics(campusId = 'campus_main', pollingIntervalMs = 10000) {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFleetData = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/admin/operations/fleet/dispatches?campusId=${encodeURIComponent(campusId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch fleet dispatches');
        return res.json();
      })
      .then((data) => {
        setDispatches(data.dispatches || []);
        setActiveCount(data.activeCount || 0);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching fleet data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [campusId]);

  useEffect(() => {
    fetchFleetData();
    const timer = setInterval(fetchFleetData, pollingIntervalMs);
    return () => clearInterval(timer);
  }, [fetchFleetData, pollingIntervalMs]);

  const dispatchRoute = async (vehicleId: string, stops: any[]) => {
    try {
      const res = await fetch('/api/admin/operations/fleet/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, campusId, stops }),
      });
      if (!res.ok) throw new Error('Failed to dispatch fleet route');
      const data = await res.json();
      fetchFleetData();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    dispatches,
    activeCount,
    isLoading,
    error,
    refresh: fetchFleetData,
    dispatchRoute,
  };
}
