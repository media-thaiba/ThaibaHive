"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SeasonalDecompositionChart } from "@/components/copilot/seasonal-decomposition-chart";
import { TimeSeriesAnomalyTable } from "@/components/copilot/time-series-anomaly-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancialDecompositionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDecomposition = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/copilots/time-series?campusId=inst_101&granularity=monthly");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Catch fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecomposition();
  }, [fetchDecomposition]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageHeader
        title="Time-Series Financial Decomposition Center"
        description="Additive STL trend extraction, seasonal pattern isolation, and 3-sigma statistical residual anomaly detection."
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full bg-slate-800" />
          <Skeleton className="h-48 w-full bg-slate-800" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <SeasonalDecompositionChart
            observed={data.components.observed}
            trend={data.components.trend}
            seasonal={data.components.seasonal}
            residual={data.components.residual}
          />
          <TimeSeriesAnomalyTable anomalies={data.anomalies} />
        </div>
      ) : (
        <p className="text-sm text-slate-400">Failed to load time-series financial decomposition data.</p>
      )}
    </div>
  );
}
