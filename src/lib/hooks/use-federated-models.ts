'use client';

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export interface FederatedModel {
  id: string;
  modelId: string;
  name: string;
  domain: string;
  version: string;
  architecture: string;
  inputDimensions: number;
  outputDimensions: number;
  currentRound: number;
  status: string;
}

export function useFederatedModels() {
  const [models, setModels] = useState<FederatedModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(() => {
    setIsLoading(true);
    fetch('/api/operations/federated/models')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch models');
        return res.json();
      })
      .then((data) => {
        setModels(ensureArray(data.models));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setModels([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, isLoading, error, refetch: fetchModels };
}
