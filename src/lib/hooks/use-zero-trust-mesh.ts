/**
 * React Hook for Zero-Trust Mesh & Device Posture State Management
 * Sprint-041 (ZASM)
 */

import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export function useZeroTrustMesh() {
  const [devices, setDevices] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalMtlsHandshakes: 0,
    totalRotations: 0,
    totalVulnerabilities: 0,
    avgForensicDurationSec: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const [devRes, polRes, certRes, metRes] = await Promise.all([
        fetch('/api/admin/security/zero-trust/devices').then((r) => r.json()).catch(() => ({ devices: [] })),
        fetch('/api/admin/security/zero-trust/policies').then((r) => r.json()).catch(() => ({ policies: [] })),
        fetch('/api/admin/security/zero-trust/certificates').then((r) => r.json()).catch(() => ({ certificates: [] })),
        fetch('/api/admin/security/zero-trust/metrics').then((r) => r.json()).catch(() => ({ summary: {} })),
      ]);

      setDevices(ensureArray(devRes.devices));
      setPolicies(ensureArray(polRes.policies));
      setCertificates(ensureArray(certRes.certificates));
      if (metRes.summary) {
        setMetrics(metRes.summary);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch zero-trust mesh state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const overrideDeviceTrust = async (deviceId: string, forcedScore: number, reason: string) => {
    try {
      const res = await fetch(`/api/admin/security/zero-trust/devices/${deviceId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcedScore, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply trust override');
      await fetchState();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const rotateCertificate = async (serviceName: string) => {
    try {
      const res = await fetch(`/api/admin/security/zero-trust/certificates/${serviceName}/rotate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rotate certificate');
      await fetchState();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const revokeCertificate = async (serialNumber: string, reason: string) => {
    try {
      const res = await fetch('/api/admin/security/zero-trust/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke certificate');
      await fetchState();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    devices,
    policies,
    certificates,
    metrics,
    loading,
    error,
    refresh: fetchState,
    overrideDeviceTrust,
    rotateCertificate,
    revokeCertificate,
  };
}
