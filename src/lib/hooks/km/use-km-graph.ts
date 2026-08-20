import { useState, useCallback } from 'react';
import { GraphTraversalPath, KmNode } from '@/lib/operations/km/km-types';

export function useKmGraph() {
  const [loading, setLoading] = useState(false);
  const [startNode, setStartNode] = useState<KmNode | null>(null);
  const [paths, setPaths] = useState<GraphTraversalPath[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphPaths = useCallback(async (startNodeId: string, maxHops = 3) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/km/graph/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNodeId, maxHops }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStartNode(data.startNode || null);
        setPaths(data.paths || []);
      } else {
        setError(data.error || 'Graph traversal failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, startNode, paths, error, fetchGraphPaths };
}
