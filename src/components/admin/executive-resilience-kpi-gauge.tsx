"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export interface ResilienceData {
  circuitBreakers: {
    closed: number;
    open: number;
    halfOpen: number;
  };
  dlqDepth: number;
  indexRecommendationsCount: number;
  avgQueryLatencyMs: number;
}

export function ExecutiveResilienceKpiGauge({ data, loading }: { data?: ResilienceData; loading?: boolean }) {
  if (loading || !data) {
    return (
      <Card role="region" aria-label="Self-Healing Infrastructure loading skeleton">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isDegraded = data.circuitBreakers.open > 0 || data.dlqDepth > 10;

  return (
    <Card
      role="region"
      aria-label={`Self-Healing Infrastructure: Average latency ${data.avgQueryLatencyMs}ms, ${data.circuitBreakers.closed} circuit breakers closed, DLQ depth ${data.dlqDepth}`}
      tabIndex={0}
      className="border-border/60 bg-card hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Self-Healing Infrastructure</span>
        </CardTitle>
        <Badge variant={isDegraded ? "warning" : "success"}>
          {isDegraded ? "Degraded" : "Optimal (99.99%)"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{data.avgQueryLatencyMs} ms</div>
          <p className="text-xs text-muted-foreground mt-0.5">Average Database Query Latency SLA</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/40 p-2 rounded-md text-center">
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">Circuit Breakers</span>
            <span className="font-bold text-foreground text-sm">{data.circuitBreakers.closed} Closed</span>
          </div>
          <div className="bg-muted/40 p-2 rounded-md text-center">
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">DLQ Depth</span>
            <span className="font-bold text-foreground text-sm">{data.dlqDepth} Jobs</span>
          </div>
          <div className="bg-muted/40 p-2 rounded-md text-center">
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">Index Recs</span>
            <span className="font-bold text-foreground text-sm">{data.indexRecommendationsCount} Active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
