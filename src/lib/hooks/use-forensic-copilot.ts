/**
 * React Hook for Forensic Copilot State Management
 * Sprint-041 (ZASM)
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export function useForensicCopilot() {
  const [reports, setReports] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/zero-trust/forensics')
        .then((r) => r.json())
        .catch(() => ({ reports: [] }));
      setReports(ensureArray(res.reports));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forensic reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const runAnalysis = async (signals: any[]) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/admin/security/zero-trust/forensics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signals }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute forensic analysis');
      await fetchReports();
      return data;
    } catch (err: any) {
      throw err;
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    reports,
    analyzing,
    loading,
    error,
    refresh: fetchReports,
    runAnalysis,
  };
}
