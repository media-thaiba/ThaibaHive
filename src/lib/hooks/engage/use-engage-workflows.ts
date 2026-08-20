import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export function useEngageWorkflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(() => {
    setLoading(true);
    fetch('/api/engage/workflows')
      .then((res) => res.json())
      .then((data) => {
        if (data.workflows) {
          setWorkflows(ensureArray(data.workflows));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch workflows');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const createWorkflow = async (payload: any) => {
    try {
      const res = await fetch('/api/engage/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      fetchWorkflows();
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create workflow');
    }
  };

  return {
    workflows,
    loading,
    error,
    refetch: fetchWorkflows,
    createWorkflow,
  };
}
