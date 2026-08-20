'use client';

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';
import { ConfidentialCampusPercentileRank } from '@/lib/operations/analytics/analytics-types';

export function useCampusBenchmarks() {
  const [benchmarks, setBenchmarks] = useState<ConfidentialCampusPercentileRank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBenchmarks = useCallback(() => {
    setIsLoading(true);
    fetch('/api/operations/federated/benchmarks')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch campus benchmarks');
        return res.json();
      })
      .then((data) => {
        setBenchmarks(ensureArray(data.benchmarks));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBenchmarks([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  return { benchmarks, isLoading, error, refetch: fetchBenchmarks };
}
