'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PrivacyBudget {
  tenantId: string;
  totalBudgetEpsilon: number;
  consumedEpsilon: number;
  remainingEpsilon: number;
  totalBudgetDelta: number;
  isExhausted: boolean;
}

export function usePrivacyBudget(tenantId: string = 'global') {
  const [budget, setBudget] = useState<PrivacyBudget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/operations/federated/privacy/budget?tenantId=${tenantId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch privacy budget');
        return res.json();
      })
      .then((data) => {
        setBudget(data.budget || null);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBudget(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tenantId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  return { budget, isLoading, error, refetch: fetchBudget };
}
