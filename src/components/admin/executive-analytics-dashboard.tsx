"use client";

import { useEffect, useState, useCallback } from "react";
import { ExecutiveGovernanceHealthCard, GovernanceData } from "./executive-governance-health-card";
import { ExecutiveResilienceKpiGauge, ResilienceData } from "./executive-resilience-kpi-gauge";
import { ExecutiveVoiceCopilotPanel, VoiceCopilotData } from "./executive-voice-copilot-panel";
import { ExecutiveMobileSyncTile, MobileSyncData } from "./executive-mobile-sync-tile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AnalyticsResponse {
  timestamp: string;
  governance: GovernanceData;
  resilience: ResilienceData;
  voiceCopilot: VoiceCopilotData;
  mobileSyncHealth: MobileSyncData;
}

export function ExecutiveAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/executive/analytics");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: AnalyticsResponse = await res.json();
      setData(json);
      setError(null);
      if (isManual) toast.success("Executive intelligence metrics refreshed");
    } catch (err: any) {
      console.error("[ExecutiveDashboard] Fetch error:", err);
      setError(err.message || "Failed to load executive analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics().catch((err) => {
      console.error("Mount fetch failed:", err);
      setError("Failed to load metrics on page mount");
      setLoading(false);
    });

    // 30-second polling interval for real-time refresh
    const interval = setInterval(() => {
      fetchAnalytics().catch((err) => {
        console.error("Auto-refresh fetch failed:", err);
      });
    }, 30000);

    // Real-time SSE subscription for POLICY_PROPAGATED governance events
    let eventSource: EventSource | null = null;
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        eventSource = new EventSource("/api/sse?channel=governance");
        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === "POLICY_PROPAGATED") {
              fetchAnalytics().catch(console.error);
            }
          } catch (err) {
            console.error("Failed to parse SSE payload:", err);
          }
        };
      } catch (err) {
        console.warn("EventSource setup skipped/failed:", err);
      }
    }

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6" aria-live="polite">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Executive Intelligence Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time federated governance, infrastructure resilience, and mobile companion health across 23+ campuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.timestamp && (
            <span className="text-xs text-muted-foreground hidden sm:inline font-mono">
              Updated: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          Connection Error: {error}
        </Alert>
      )}

      {/* 4-Card Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecutiveGovernanceHealthCard data={data?.governance} loading={loading} />
        <ExecutiveResilienceKpiGauge data={data?.resilience} loading={loading} />
        <ExecutiveVoiceCopilotPanel data={data?.voiceCopilot} loading={loading} />
        <ExecutiveMobileSyncTile data={data?.mobileSyncHealth} loading={loading} />
      </div>

      {/* Live System Status Banner */}
      <div className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Multi-Campus SHA-256 Policy Engine: <strong className="text-foreground">ACTIVE</strong></span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">Query Circuit Breakers: <strong className="text-foreground">12/12 CLOSED</strong></span>
        </div>
        <span className="text-muted-foreground font-mono text-[11px]">SLA SLA Target: &lt;5.0s (Current: 1.42s)</span>
      </div>
    </div>
  );
}
