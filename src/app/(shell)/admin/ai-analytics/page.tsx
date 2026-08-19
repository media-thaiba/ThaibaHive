"use client";

import React, { useEffect, useState, useCallback } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InsightsOverviewCard } from "./_components/insights-overview-card";
import { PredictionChart } from "./_components/prediction-chart";
import { ExecutiveSummaryBanner } from "./_components/executive-summary-banner";
import { ensureArray } from "@/lib/utils";
import Link from "next/link";


interface BriefingData {
  executiveSummary: string;
  generatedAt: string;
  metrics: {
    projectedAttendanceRate: number;
    projectedFeeRealizationRate: number;
    atRiskStudentCount: number;
    criticalRiskCount: number;
    activeAnomaliesCount: number;
  };
  recommendedActions: string[];
}

export default function AiAnalyticsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  const fetchBriefing = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/ai/insights/summary")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load AI analytics briefing");
        return res.json();
      })
      .then((data) => {
        if (data.briefing) {
          setBriefing(data.briefing);
        } else {
          setError("No briefing data returned");
        }
      })
      .catch((err) => {
        console.error("[AI Analytics Dashboard Error]", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Executive AI Analytics & Insights" description="Loading predictive models and operational analytics..." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Executive AI Analytics & Insights" description="Predictive intelligence workspace" />
        <Alert variant="error">
          <div className="space-y-1">
            <h4 className="font-semibold">Error Loading AI Analytics</h4>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
        <Button onClick={fetchBriefing}>Retry</Button>
      </div>
    );
  }


  const metrics = briefing?.metrics || {
    projectedAttendanceRate: 92,
    projectedFeeRealizationRate: 94,
    atRiskStudentCount: 0,
    criticalRiskCount: 0,
    activeAnomaliesCount: 0,
  };

  const chartData = [
    { label: "Projected 30-Day Attendance Rate", value: metrics.projectedAttendanceRate },
    { label: "Projected Fee Realization Target", value: metrics.projectedFeeRealizationRate },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Executive AI Analytics & Insights"
          description="Predictive forecasts, early warning signals, and operational anomaly detection"
        />
        <div className="flex items-center gap-2">
          <Link href="/admin/ai-analytics/early-warning">
            <Button variant="outline">Early Warning Center</Button>
          </Link>
          <Button onClick={fetchBriefing} variant="default">Refresh AI Models</Button>
        </div>
      </div>

      {briefing && (
        <ExecutiveSummaryBanner
          summary={briefing.executiveSummary}
          generatedAt={briefing.generatedAt}
          recommendedActions={ensureArray(briefing.recommendedActions)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightsOverviewCard
          title="Projected Attendance"
          value={`${metrics.projectedAttendanceRate}%`}
          subtitle="30-Day Forecast"
          badgeText="Predictive"
          badgeVariant="info"
        />
        <InsightsOverviewCard
          title="Fee Realization"
          value={`${metrics.projectedFeeRealizationRate}%`}
          subtitle="Target Realization Rate"
          badgeText="Financial"
          badgeVariant="success"
        />
        <InsightsOverviewCard
          title="At-Risk Students"
          value={metrics.atRiskStudentCount}
          subtitle={`${metrics.criticalRiskCount} Critical Interventions`}
          badgeText={metrics.atRiskStudentCount > 0 ? "Action Required" : "Nominal"}
          badgeVariant={metrics.atRiskStudentCount > 0 ? "warning" : "success"}
        />
        <InsightsOverviewCard
          title="Operational Anomalies"
          value={metrics.activeAnomaliesCount}
          subtitle="Detected Spikes & Surges"
          badgeText={metrics.activeAnomaliesCount > 0 ? "Investigate" : "Nominal"}
          badgeVariant={metrics.activeAnomaliesCount > 0 ? "warning" : "secondary"}
        />

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PredictionChart title="Campus Realization Projections" data={chartData} />
        <div className="p-5 border rounded-lg bg-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-2">Early Warning Intervention Hub</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Review flagged students showing signs of chronic absenteeism, declining academic trajectories, or fee payment delinquency.
            </p>
          </div>
          <Link href="/admin/ai-analytics/early-warning">
            <Button className="w-full">View At-Risk Roster & Assign Counselors</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
