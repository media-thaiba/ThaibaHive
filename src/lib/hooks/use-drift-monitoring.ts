import { useState, useEffect, useCallback } from 'react';

export function useDriftMonitoring(modelId?: string) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrift = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = modelId
        ? `/api/operations/federated/drift?modelId=${encodeURIComponent(modelId)}`
        : '/api/operations/federated/drift';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch drift metrics');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Error loading drift metrics');
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    fetchDrift().catch(() => {});
  }, [fetchDrift]);

  return {
    reports,
    isLoading,
    error,
    refetch: fetchDrift,
  };
}
