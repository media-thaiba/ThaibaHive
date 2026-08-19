"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, AlertTriangle, ArrowUpRight, Gauge, Smartphone, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ClusterMetricsSnapshot } from "@/lib/observability/sliding-window-aggregator";
import type { MobileSyncTelemetrySummary } from "@/lib/observability/mobile-sync-telemetry-aggregator";

interface EnrichedClusterSnapshot extends ClusterMetricsSnapshot {
  mobileSync?: MobileSyncTelemetrySummary;
}

interface LatencySummaryCardsProps {
  snapshot: EnrichedClusterSnapshot | null;
  isLoading: boolean;
}

export function LatencySummaryCards({ snapshot, isLoading }: LatencySummaryCardsProps) {
  if (isLoading || !snapshot) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const p50 = snapshot.globalLatency.p50;
  const p95 = snapshot.globalLatency.p95;
  const p99 = snapshot.globalLatency.p99;
  const errorRate = snapshot.errorRate;
  const mobile = snapshot.mobileSync;

  const getP50Badge = (val: number) => {
    if (val === 0) return <Badge variant="secondary">No Traffic</Badge>;
    if (val < 100) return <Badge variant="success">Fast &lt;100ms</Badge>;
    if (val < 250) return <Badge variant="warning">Moderate</Badge>;
    return <Badge variant="destructive">Slow &gt;250ms</Badge>;
  };

  const getP95Badge = (val: number) => {
    if (val === 0) return <Badge variant="secondary">No Traffic</Badge>;
    if (val < 500) return <Badge variant="success">SLA Met (&lt;500ms)</Badge>;
    return <Badge variant="destructive">SLA Breach</Badge>;
  };

  const getErrorBadge = (rate: number) => {
    if (rate === 0) return <Badge variant="success">0.00% Errors</Badge>;
    if (rate < 2) return <Badge variant="warning">Low (&lt;2%)</Badge>;
    return <Badge variant="destructive">High Error Rate</Badge>;
  };

  const getMobileSyncBadge = (p95Val: number) => {
    if (p95Val === 0) return <Badge variant="secondary">Idle</Badge>;
    if (p95Val < 1500) return <Badge variant="success">SLA Met (&lt;1.5s)</Badge>;
    return <Badge variant="destructive">Degraded (&gt;1.5s)</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* 1. Core API Latency KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* p50 Median Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              p50 Median
            </CardTitle>
            <Zap className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{p50} <span className="text-xs font-normal text-muted-foreground">ms</span></div>
            <div>{getP50Badge(p50)}</div>
          </CardContent>
        </Card>

        {/* p95 Tail Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              p95 Tail Latency
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{p95} <span className="text-xs font-normal text-muted-foreground">ms</span></div>
            <div>{getP95Badge(p95)}</div>
          </CardContent>
        </Card>

        {/* p99 Peak Spike */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              p99 Peak Spike
            </CardTitle>
            <Gauge className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{p99} <span className="text-xs font-normal text-muted-foreground">ms</span></div>
            <div className="text-xs text-muted-foreground">Max: {snapshot.globalLatency.max} ms</div>
          </CardContent>
        </Card>

        {/* Throughput */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Throughput
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{snapshot.requestsPerMinute} <span className="text-xs font-normal text-muted-foreground">req/min</span></div>
            <div className="text-xs text-muted-foreground">{snapshot.totalRequests} total requests</div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Error Rate
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{errorRate}%</div>
            <div>{getErrorBadge(errorRate)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Mobile Sync Telemetry Bridge KPIs (Sprint-033 / TD-007) */}
      {mobile && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold tracking-tight">Mobile Sync Telemetry (Client-Side Bridge)</h3>
            </div>
            {mobile.lastReportedAt && (
              <span className="text-xs text-muted-foreground">
                Last sync event: {new Date(mobile.lastReportedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Mobile Sync Success Rate */}
            <div className="p-3 bg-background border rounded-md space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sync Success Rate</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold">{mobile.successRate}%</div>
              <div className="text-xs text-muted-foreground">{mobile.totalBatches} batches ({mobile.totalMutations} mutations)</div>
            </div>

            {/* Mobile Sync p95 Latency */}
            <div className="p-3 bg-background border rounded-md space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Mobile Sync p95</span>
                <Activity className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-bold">{mobile.latency.p95} <span className="text-xs font-normal text-muted-foreground">ms</span></div>
              <div>{getMobileSyncBadge(mobile.latency.p95)}</div>
            </div>

            {/* Mobile Sync Conflict Rate */}
            <div className="p-3 bg-background border rounded-md space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Conflict Resolution Rate</span>
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold">{mobile.conflictRate}%</div>
              <div className="text-xs text-muted-foreground">{mobile.totalConflicts} total LWW conflicts</div>
            </div>

            {/* Mobile Network Breakdown */}
            <div className="p-3 bg-background border rounded-md space-y-1">
              <div className="text-xs text-muted-foreground">Network Distribution</div>
              <div className="text-xs space-y-0.5 pt-1">
                <div className="flex justify-between"><span>WiFi:</span> <span className="font-semibold">{mobile.networkDistribution.wifi}</span></div>
                <div className="flex justify-between"><span>Cellular:</span> <span className="font-semibold">{mobile.networkDistribution.cellular}</span></div>
                <div className="flex justify-between"><span>Offline/Other:</span> <span className="font-semibold">{mobile.networkDistribution.offline + mobile.networkDistribution.unknown}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
