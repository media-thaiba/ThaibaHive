/**
 * React Hook for Live Threat Intelligence Graph
 * Sprint-042 (ARES) — ARES-021
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';
import { ThreatGraphNode, ThreatGraphEdge, AttackPathResult } from '../security/graph/graph-types';

export function useThreatGraph() {
  const [nodes, setNodes] = useState<ThreatGraphNode[]>([]);
  const [edges, setEdges] = useState<ThreatGraphEdge[]>([]);
  const [overview, setOverview] = useState<any>({ totalNodes: 0, totalEdges: 0, nodeTypeCounts: {} });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/graph')
        .then((r) => r.json())
        .catch(() => ({ nodes: [], edges: [], overview: {} }));

      setNodes(ensureArray(res.nodes));
      setEdges(ensureArray(res.edges));
      if (res.overview) setOverview(res.overview);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch threat graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const findAttackPaths = async (sourceId: string, targetId: string): Promise<AttackPathResult | null> => {
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/graph/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find attack paths');
      return data.pathResult;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    nodes,
    edges,
    overview,
    loading,
    error,
    refresh: fetchGraph,
    findAttackPaths,
  };
}
