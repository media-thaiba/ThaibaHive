"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RouteMetricSummary } from "@/lib/observability/sliding-window-aggregator";

interface LatencyTrendChartProps {
  routes: RouteMetricSummary[];
  isLoading: boolean;
}

export function LatencyTrendChart({ routes, isLoading }: LatencyTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Pick top 8 most active endpoints for charting
  const chartData = (routes || [])
    .slice(0, 8)
    .map((r) => ({
      name: `${r.method} ${r.route.replace("/api/", "")}`,
      p50: r.latency.p50,
      p90: r.latency.p90,
      p95: r.latency.p95,
      p99: r.latency.p99,
      requests: r.totalRequests,
    }))
    .reverse();

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-semibold">Latency Distribution by Top Endpoints</CardTitle>
        <p className="text-xs text-muted-foreground">
          Percentile response times (ms) across active API endpoints in the selected window.
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No telemetry data recorded in current window.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  angle={-20}
                  textAnchor="end"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  height={50}
                />
                <YAxis
                  unit="ms"
                  tick={{ fontSize: 11 }}
                  width={50}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} ms`]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "0.75rem" }} />
                <Line
                  type="monotone"
                  dataKey="p50"
                  name="p50 (Median)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  name="p95 (Tail)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="p99"
                  name="p99 (Peak)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
