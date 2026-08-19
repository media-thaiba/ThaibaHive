"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, AlertTriangle, ArrowUpRight, Gauge } from "lucide-react";
import type { ClusterMetricsSnapshot } from "@/lib/observability/sliding-window-aggregator";

interface LatencySummaryCardsProps {
  snapshot: ClusterMetricsSnapshot | null;
  isLoading: boolean;
}

export function LatencySummaryCards({ snapshot, isLoading }: LatencySummaryCardsProps) {
  if (isLoading || !snapshot) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  const p50 = snapshot.globalLatency.p50;
  const p95 = snapshot.globalLatency.p95;
  const p99 = snapshot.globalLatency.p99;
  const errorRate = snapshot.errorRate;

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. p50 Median Latency */}
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

      {/* 2. p95 Tail Latency */}
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

      {/* 3. p99 Peak Spike */}
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

      {/* 4. Throughput */}
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

      {/* 5. Error Rate */}
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
  );
}
