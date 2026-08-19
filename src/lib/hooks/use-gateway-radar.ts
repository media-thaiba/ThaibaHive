/**
 * Gateway Threat Radar Custom React Hook
 * Sprint-038 / AGS-013
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { QuarantineRecord } from "@/lib/security/quarantine-store";

export interface GatewayStats {
  totalRequestsTracked: number;
  throttledRequestsTotal: number;
  activeQuarantinesCount: number;
  circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN";
  health: {
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorRate: number;
    healthy: boolean;
  };
  recentQuarantines: QuarantineRecord[];
  timestamp: string;
}

export function useGatewayRadar() {
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [quarantines, setQuarantines] = useState<QuarantineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGatewayData = useCallback(() => {
    Promise.all([
      fetch("/api/admin/security/gateway/stats").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetch("/api/admin/security/gateway/quarantines").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([statsData, quarantinesData]) => {
        setStats(statsData);
        setQuarantines(quarantinesData.quarantines || []);
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load gateway radar data");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchGatewayData();
    const interval = setInterval(fetchGatewayData, 10_000);
    return () => clearInterval(interval);
  }, [fetchGatewayData]);

  const unbanIp = async (ipOrId: string) => {
    try {
      const res = await fetch(`/api/admin/security/gateway/quarantines?id=${encodeURIComponent(ipOrId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unban");
      fetchGatewayData();
      return true;
    } catch {
      return false;
    }
  };

  const createQuarantine = async (data: { ipAddress: string; cidrMask?: string; reason: string; durationMinutes?: number }) => {
    try {
      const res = await fetch("/api/admin/security/gateway/quarantines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create quarantine");
      fetchGatewayData();
      return true;
    } catch {
      return false;
    }
  };

  const overrideCircuitBreaker = async (action: "TRIP" | "RESET", reason?: string) => {
    try {
      const res = await fetch("/api/admin/security/gateway/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Failed to override circuit breaker");
      fetchGatewayData();
      return true;
    } catch {
      return false;
    }
  };

  return {
    stats,
    quarantines,
    loading,
    error,
    refresh: fetchGatewayData,
    unbanIp,
    createQuarantine,
    overrideCircuitBreaker,
  };
}
