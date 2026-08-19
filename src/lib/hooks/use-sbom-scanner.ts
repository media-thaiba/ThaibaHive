/**
 * React Hook for SBOM Supply Chain & Vulnerability Scanner
 * Sprint-041 (ZASM)
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export function useSbomScanner() {
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVulnerabilities = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/zero-trust/sbom')
        .then((r) => r.json())
        .catch(() => ({ vulnerabilities: [] }));
      setVulnerabilities(ensureArray(res.vulnerabilities));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vulnerabilities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVulnerabilities();
  }, [fetchVulnerabilities]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/admin/security/zero-trust/sbom/scan', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute SBOM scan');
      setLastScanResult(data);
      await fetchVulnerabilities();
      return data;
    } catch (err: any) {
      throw err;
    } finally {
      setScanning(false);
    }
  };

  return {
    vulnerabilities,
    scanning,
    lastScanResult,
    loading,
    error,
    refresh: fetchVulnerabilities,
    triggerScan,
  };
}
