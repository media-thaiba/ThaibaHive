"use client";

import { useEffect, useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDPoP } from "@/lib/hooks/use-dpop";
import { fetchWithDPoP } from "@/lib/api-client";
import { LegacyTokenMigrationCard, DeprecationStats } from "@/components/security/legacy-token-migration-card";

interface IdentityMetrics {
  sessionDistribution: { dpop: number; legacy: number; total: number };
  deviceTrustScores: { high: number; medium: number; low: number };
  recentRiskEvents: Array<{ type: string; userId: string; score: number | null; timestamp: string; reason?: string }>;
  revocationVelocity: { perMinute: number; last24h: number };
  migrationProgress: { migrated: number; legacy: number; percentage: number };
  revocationStats: { revokedCount: number; bloomSizeBytes: number };
}

export default function IdentityRadarPage() {
  const [metrics, setMetrics] = useState<IdentityMetrics | null>(null);
  const [deprecationStats, setDeprecationStats] = useState<DeprecationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { attachDPoP } = useDPoP();

  const fetchMetrics = useCallback(() => {
    Promise.all([
      fetchWithDPoP("/api/admin/security/identity/metrics", {}, attachDPoP).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<IdentityMetrics>;
      }),
      fetchWithDPoP("/api/admin/security/identity/deprecation-stats", {}, attachDPoP)
        .then((r) => (r.ok ? (r.json() as Promise<DeprecationStats>) : null))
        .catch(() => null),
    ])
      .then(([metricsData, deprecationData]) => {
        setMetrics(metricsData);
        if (deprecationData) {
          setDeprecationStats(deprecationData);
        } else if (metricsData) {
          // Fallback constructed stats
          setDeprecationStats({
            mode: "WARN",
            sunsetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
            daysUntilSunset: 30,
            totalSessions: metricsData.sessionDistribution.total,
            dpopSessions: metricsData.sessionDistribution.dpop,
            legacySessions: metricsData.sessionDistribution.legacy,
            dpopAdoptionPercentage: metricsData.migrationProgress.percentage,
            clientDistribution: [],
          });
        }
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
        setLoading(false);
      });
  }, [attachDPoP]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleModeChange = async (newMode: "WARN" | "SOFT_ENFORCE" | "STRICT") => {
    try {
      await fetchWithDPoP(
        "/api/admin/security/identity/deprecation-stats",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: newMode }),
        },
        attachDPoP
      );
      fetchMetrics();
    } catch {
      // Non-blocking
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Identity Security Radar</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Identity Security Radar</h1>
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Identity Security Radar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top Feature: Legacy Token Sunset & Migration Radar (TIF-009) */}
        {deprecationStats && (
          <LegacyTokenMigrationCard
            stats={deprecationStats}
            onModeChange={handleModeChange}
          />
        )}

        {/* A — Session Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">DPoP-bound</span>
              <Badge variant="success">{metrics.sessionDistribution.dpop}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Legacy JWT</span>
              <Badge variant="secondary">{metrics.sessionDistribution.legacy}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total tracked</span>
              <Badge variant="info">{metrics.sessionDistribution.total}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* B — Device Trust Score Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Trust Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">High (80-100)</span>
              <Badge variant="success">{metrics.deviceTrustScores.high}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Medium (50-79)</span>
              <Badge variant="warning">{metrics.deviceTrustScores.medium}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Low (&lt;50)</span>
              <Badge variant="destructive">{metrics.deviceTrustScores.low}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* C — Risk Event Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Event Stream</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recentRiskEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent events</p>
            ) : (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {metrics.recentRiskEvents.slice(-5).reverse().map((ev, i) => (
                  <li key={i} className="flex justify-between items-center text-xs">
                    <span className="truncate max-w-[120px]">{ev.userId}</span>
                    <Badge variant="destructive" className="text-xs">{ev.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* D — Revocation Velocity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revocation Velocity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Per minute</span>
              <Badge variant={metrics.revocationVelocity.perMinute > 5 ? "destructive" : "success"}>
                {metrics.revocationVelocity.perMinute}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last 24h</span>
              <Badge variant="secondary">{metrics.revocationVelocity.last24h}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bloom size</span>
              <span className="text-xs text-muted-foreground">{metrics.revocationStats.bloomSizeBytes}B</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
