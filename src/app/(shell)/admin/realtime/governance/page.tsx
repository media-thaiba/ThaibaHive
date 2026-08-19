"use client";

import React, { useState, useEffect } from "react";
import { RealTimeStreamWorkspace, ClusterMetricsUI } from "@/components/realtime/realtime-stream-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

export default function RealTimeGovernancePage() {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [metrics, setMetrics] = useState<ClusterMetricsUI | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/realtime/health")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load real-time governance metrics");
        return res.json();
      })
      .then((data) => {
        setActiveCount(data.activeConnectionsCount || 0);
        setMetrics(data.clusterMetrics);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load cluster health data");
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Real-Time Event Stream & Redis Cluster Governance</h1>
        <p className="text-muted-foreground mt-1">
          Monitor WebSocket/SSE streaming session topography, live copilot event feeds, and multi-region Redis Cluster node sharding.
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <div>
            <div className="font-semibold">Governance Monitoring Error</div>
            <div>{error}</div>
          </div>
        </Alert>
      )}

      {loading || !metrics ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <RealTimeStreamWorkspace activeConnectionsCount={activeCount} metrics={metrics} />
      )}
    </div>
  );
}
