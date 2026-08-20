'use client';

import { useState, useEffect, useCallback } from 'react';

export function useCloudSustainability(campusId = 'campus_main') {
  const [cloudData, setCloudData] = useState<{ resources: any[]; recommendations: any[]; totalEstimatedSavingsDollars: number }>({
    resources: [],
    recommendations: [],
    totalEstimatedSavingsDollars: 0,
  });
  const [carbonData, setCarbonData] = useState<{ esgReport: any; emissions: any; initiatives: any[] }>({
    esgReport: null,
    emissions: null,
    initiatives: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/operations/cloud/cost').then((r) => r.json()),
      fetch(`/api/admin/operations/sustainability/carbon?campusId=${encodeURIComponent(campusId)}`).then((r) => r.json()),
    ])
      .then(([cloudRes, carbonRes]) => {
        setCloudData(cloudRes);
        setCarbonData(carbonRes);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching sustainability data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [campusId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    cloudData,
    carbonData,
    isLoading,
    error,
    refresh: fetchData,
  };
}
