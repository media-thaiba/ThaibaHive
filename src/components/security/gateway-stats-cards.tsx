/**
 * Gateway Statistics Cards Component
 * Sprint-038 / AGS-013
 */

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GatewayStats } from "@/lib/hooks/use-gateway-radar";

export function GatewayStatsCards({ stats }: { stats: GatewayStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests Tracked</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRequestsTracked.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Multi-tenant edge aggregate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rate Limit Throttles (429)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{stats.throttledRequestsTotal.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Sliding-window quota exceeded</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active IP Quarantines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{stats.activeQuarantinesCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Banned via reputation triggers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Edge Latency (p95)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{stats.health.p95LatencyMs.toFixed(1)}ms</span>
            <Badge variant={stats.health.healthy ? "success" : "destructive"}>
              {stats.health.healthy ? "Healthy" : "Degraded"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Canary error rate: {(stats.health.errorRate * 100).toFixed(2)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
