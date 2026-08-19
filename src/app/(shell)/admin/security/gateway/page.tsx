/**
 * Admin Threat Shield Radar Dashboard
 * Sprint-038 / AGS-013
 */

"use client";

import { useGatewayRadar } from "@/lib/hooks/use-gateway-radar";
import { GatewayStatsCards } from "@/components/security/gateway-stats-cards";
import { CircuitBreakerToggle } from "@/components/security/circuit-breaker-toggle";
import { ManualQuarantineDialog } from "@/components/security/manual-quarantine-dialog";
import { QuarantineTable } from "@/components/security/quarantine-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

export default function AdminGatewayRadarPage() {
  const {
    stats,
    quarantines,
    loading,
    error,
    refresh,
    unbanIp,
    createQuarantine,
    overrideCircuitBreaker,
  } = useGatewayRadar();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Gateway Security Shield & Threat Radar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-dimensional rate limiting, automated IP reputation, and edge threat mitigation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            Refresh Telemetry
          </Button>
          <ManualQuarantineDialog onQuarantine={createQuarantine} />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <span className="font-semibold block mb-1">Telemetry Fetch Warning</span>
          <span>{error}</span>
        </Alert>
      )}

      {/* Core Metric Cards */}
      {stats && <GatewayStatsCards stats={stats} />}

      {/* Circuit Breaker Control & Status */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CircuitBreakerToggle
              state={stats.circuitBreakerState}
              onOverride={overrideCircuitBreaker}
            />
          </div>
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Synthetic Canary Telemetry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">p50 Latency</span>
                  <span className="font-mono font-medium">{stats.health.p50LatencyMs.toFixed(1)} ms</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">p99 Latency</span>
                  <span className="font-mono font-medium">{stats.health.p99LatencyMs.toFixed(1)} ms</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Sampling Interval</span>
                  <span className="font-medium">10s Sliding Window</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Active IP Quarantines Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-semibold">Active IP Quarantines & Edge Bans</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Temporarily isolated addresses blocked across edge mesh and synchronized with upstream WAF.
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <QuarantineTable quarantines={quarantines} onUnban={unbanIp} />
        </CardContent>
      </Card>
    </div>
  );
}
