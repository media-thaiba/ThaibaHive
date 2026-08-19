"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TelemetrySummary } from "@/lib/compliance/types";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface ComplianceRadarCardProps {
  telemetry?: TelemetrySummary | null;
  loading?: boolean;
}

export function ComplianceRadarCard({ telemetry, loading }: ComplianceRadarCardProps) {
  if (loading || !telemetry) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Compliance Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-28 flex items-center justify-center text-muted-foreground text-sm">
            Evaluating compliance telemetry...
          </div>
        </CardContent>
      </Card>
    );
  }

  const badgeVariant =
    telemetry.status === "HEALTHY" ? "success" : telemetry.status === "DEGRADED" ? "warning" : "destructive";

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {telemetry.status === "HEALTHY" ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          )}
          Compliance Health Radar
        </CardTitle>
        <Badge variant={badgeVariant}>{telemetry.status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between mb-4">
          <div className="text-3xl font-bold tracking-tight">
            {telemetry.overallScore}
            <span className="text-sm font-normal text-muted-foreground"> / 100</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {telemetry.activeRulesCount} active telemetry rules
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border text-center">
          <div className="p-2 rounded bg-muted/40">
            <div className="text-xs text-muted-foreground font-medium">Critical</div>
            <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              {telemetry.violationsBySeverity.CRITICAL}
            </div>
          </div>
          <div className="p-2 rounded bg-muted/40">
            <div className="text-xs text-muted-foreground font-medium">High</div>
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {telemetry.violationsBySeverity.HIGH}
            </div>
          </div>
          <div className="p-2 rounded bg-muted/40">
            <div className="text-xs text-muted-foreground font-medium">Medium</div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {telemetry.violationsBySeverity.MEDIUM}
            </div>
          </div>
          <div className="p-2 rounded bg-muted/40">
            <div className="text-xs text-muted-foreground font-medium">Low</div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {telemetry.violationsBySeverity.LOW}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
