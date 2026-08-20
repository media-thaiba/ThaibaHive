import { useState, useEffect, useCallback } from 'react';

export function useCampusBenchmarking() {
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBenchmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operations/federated/benchmark');
      if (!res.ok) throw new Error('Failed to fetch cross-campus benchmarks');
      const data = await res.json();
      setBenchmarks(data.benchmarks || []);
    } catch (err: any) {
      setError(err.message || 'Error loading benchmarks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBenchmarks().catch(() => {});
  }, [fetchBenchmarks]);

  return {
    benchmarks,
    isLoading,
    error,
    refetch: fetchBenchmarks,
  };
}
