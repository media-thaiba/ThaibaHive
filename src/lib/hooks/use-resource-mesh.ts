'use client';

import { useState, useEffect, useCallback } from 'react';

export function useResourceMesh(campusId = 'campus_main') {
  const [resources, setResources] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/admin/operations/mesh/resources?campusId=${encodeURIComponent(campusId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch resource mesh data');
        return res.json();
      })
      .then((data) => {
        setResources(data.resources || []);
        setRecommendations(data.crossCampusRecommendations || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching cross-campus resources');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [campusId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const bookResource = async (params: {
    resourceId: string;
    hostCampusId: string;
    startTimeIso: string;
    endTimeIso: string;
    unitsReserved: number;
  }) => {
    try {
      const res = await fetch('/api/admin/operations/mesh/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestingCampusId: campusId,
          ...params,
        }),
      });
      if (!res.ok) throw new Error('Failed to book resource');
      const data = await res.json();
      fetchResources();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    resources,
    recommendations,
    isLoading,
    error,
    refresh: fetchResources,
    bookResource,
  };
}
