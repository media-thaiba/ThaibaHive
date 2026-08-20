'use client';

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export interface FederatedNode {
  id: string;
  nodeId: string;
  campusId: string;
  campusName: string;
  status: string;
  computeTier: string;
  sampleCount: number;
  availableMemoryMb: number;
  networkLatencyMs: number;
  reputationScore: number;
  lastHeartbeat: string;
}

export function useFederatedNodes() {
  const [nodes, setNodes] = useState<FederatedNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(() => {
    setIsLoading(true);
    fetch('/api/operations/federated/nodes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch nodes');
        return res.json();
      })
      .then((data) => {
        setNodes(ensureArray(data.nodes));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setNodes([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return { nodes, isLoading, error, refetch: fetchNodes };
}
