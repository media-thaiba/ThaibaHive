"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LatencySummaryCards } from "./_components/latency-summary-cards";
import { RouteLatencyTable } from "./_components/route-latency-table";
import { LatencyTrendChart } from "./_components/latency-trend-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { RefreshCw, Play, Pause, Radio } from "lucide-react";
import type { ClusterMetricsSnapshot, WindowPeriod } from "@/lib/observability/sliding-window-aggregator";

export default function AdminObservabilityPage() {
  const [windowPeriod, setWindowPeriod] = useState<WindowPeriod>("5m");
  const [snapshot, setSnapshot] = useState<ClusterMetricsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async (period: WindowPeriod) => {
    try {
      setError(null);
      const res = await fetch(`/api/system/metrics?window=${period}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch metrics: HTTP ${res.status}`);
      }
      const data: ClusterMetricsSnapshot = await res.json();
      setSnapshot(data);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err?.message || "Error fetching system metrics telemetry");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial and window change fetch
  useEffect(() => {
    setIsLoading(true);
    fetchMetrics(windowPeriod).catch((err) => {
      setError(err?.message || "Initialization error");
      setIsLoading(false);
    });
  }, [windowPeriod, fetchMetrics]);

  // 10-second polling interval
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      fetchMetrics(windowPeriod).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [isPolling, windowPeriod, fetchMetrics]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    fetchMetrics(windowPeriod).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Production Latency Observability</h1>
            <Badge variant="secondary" className="flex items-center gap-1.5 text-xs py-0.5">
              <Radio className={`h-3 w-3 ${isPolling ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
              {isPolling ? "Live (10s)" : "Paused"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time APM telemetry, route-level latency percentiles, and SLA threshold monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Window Selector */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
            {(["1m", "5m", "15m", "1h"] as WindowPeriod[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setWindowPeriod(period)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  windowPeriod === period
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Pause / Resume Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            className="text-xs"
          >
            {isPolling ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1 text-amber-500" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Resume
              </>
            )}
          </Button>

          {/* Manual Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <div className="font-semibold">Telemetry Connection Error</div>
          <div className="text-xs mt-0.5">{error}</div>
        </Alert>
      )}

      {/* KPI Cards */}
      <LatencySummaryCards snapshot={snapshot} isLoading={isLoading} />

      {/* Trend Charts */}
      <LatencyTrendChart routes={snapshot?.routes || []} isLoading={isLoading} />

      {/* Route Latency Breakdown Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">API Route Performance Breakdown</h2>
          {lastFetched && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>
        <RouteLatencyTable routes={snapshot?.routes || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
