'use client';

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export interface DriftMetric {
  id: string;
  modelId: string;
  overallPsi: number;
  maxFeatureKs: number;
  driftedFeatureCount: number;
  hasSignificantDrift: boolean;
  recordedAt: string;
}

export function useModelDrift(modelId?: string) {
  const [driftReports, setDriftReports] = useState<DriftMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(() => {
    setIsLoading(true);
    const url = modelId ? `/api/operations/federated/drift/report?modelId=${modelId}` : '/api/operations/federated/drift/report';
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch drift reports');
        return res.json();
      })
      .then((data) => {
        setDriftReports(ensureArray(data.reports));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setDriftReports([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [modelId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { driftReports, isLoading, error, refetch: fetchReports };
}
