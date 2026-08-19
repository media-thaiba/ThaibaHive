"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

export interface SystemHealthData {
  totalAnomaliesDetected: number;
  autoRemediatedCount: number;
  autoRemediatedPercentage: number;
  manualHoursSaved: number;
  circuitBreakerStatus: "HEALTHY" | "DEGRADED" | "PAUSED";
  activeWorkflowCount: number;
}

export function SelfHealingMetricsCards({ health }: { health: SystemHealthData | null }) {
  if (!health) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Auto-Resolved Rate
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-3xl font-bold text-emerald-400">
            {health.autoRemediatedPercentage}%
          </span>
          <Badge variant="success">Self-Healing Active</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {health.autoRemediatedCount} of {health.totalAnomaliesDetected} anomalies resolved automatically
        </p>
      </div>

      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Manual Time Saved
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-3xl font-bold text-sky-400">
            {health.manualHoursSaved} hrs
          </span>
          <Badge variant="secondary">Operational Gain</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Estimated administrative overhead eliminated
        </p>
      </div>

      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Circuit Breaker Status
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-xl font-bold text-white">
            {health.circuitBreakerStatus}
          </span>
          <Badge
            variant={
              health.circuitBreakerStatus === "HEALTHY"
                ? "success"
                : health.circuitBreakerStatus === "DEGRADED"
                ? "warning"
                : "destructive"
            }
          >
            {health.circuitBreakerStatus}
          </Badge>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Rate limits and safety bounds active
        </p>
      </div>

      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Active Remediation Workflows
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-3xl font-bold text-indigo-400">
            {health.activeWorkflowCount}
          </span>
          <Badge variant="info">Rules Engine</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Event-driven closed-loop pipelines
        </p>
      </div>
    </div>
  );
}
