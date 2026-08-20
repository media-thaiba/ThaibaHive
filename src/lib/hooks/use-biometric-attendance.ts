'use client';

import { useState, useEffect, useCallback } from 'react';

export function useBiometricAttendance(userId?: string) {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    setIsLoading(true);
    const url = userId
      ? `/api/admin/operations/biometrics/attendance?userId=${encodeURIComponent(userId)}`
      : '/api/admin/operations/biometrics/attendance';

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch biometric logs');
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs || []);
        setTotalCount(data.totalCount || 0);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching biometric attendance');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const verifyAttendance = async (campusId: string, locationName: string, sessionId: string, queryEmbedding: number[]) => {
    try {
      const res = await fetch('/api/admin/operations/biometrics/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campusId, locationName, sessionId, queryEmbedding }),
      });
      if (!res.ok) throw new Error('Biometric verification request failed');
      const data = await res.json();
      fetchLogs();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    logs,
    totalCount,
    isLoading,
    error,
    refresh: fetchLogs,
    verifyAttendance,
  };
}
