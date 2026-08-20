import { useState, useEffect, useCallback } from 'react';

export function useEngageAnalytics() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    fetch('/api/engage/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.overview) {
          setOverview(data.overview);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch analytics');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    overview,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
