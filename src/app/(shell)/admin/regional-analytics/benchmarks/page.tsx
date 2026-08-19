"use client";

import { useEffect, useState } from "react";
import { BenchmarkComparisonMatrix, BenchmarkMatrixRow } from "../_components/benchmark-comparison-matrix";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

export default function RegionalBenchmarksPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricDomain, setMetricDomain] = useState<"all" | "attendance" | "fees" | "academic" | "ai_risk">("all");
  const [rows, setRows] = useState<BenchmarkMatrixRow[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/regional/benchmarks?regionalGroupId=rg_default&metricDomain=${metricDomain}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch benchmarking data");
        return res.json();
      })
      .then((data) => {
        const benchmarks = data.benchmarks || [];
        if (benchmarks.length > 0) {
          setRows(
            benchmarks.map((b: any) => ({
              institutionId: b.institutionId,
              name: `Campus ${b.institutionId.replace("inst_", "").toUpperCase()}`,
              metricDomain: b.metricDomain,
              rawScore: b.rawScore,
              normalizedScore: b.normalizedScore,
              percentileRank: b.percentileRank,
              rankPosition: b.rankPosition,
            }))
          );
        } else {
          // Default demonstration benchmarking matrix
          setRows([
            {
              institutionId: "inst_alpha",
              name: "Thaiba Academy - Main Campus",
              metricDomain,
              rawScore: 93.2,
              normalizedScore: 1.25,
              percentileRank: 100,
              rankPosition: 1,
            },
            {
              institutionId: "inst_gamma",
              name: "Thaiba South - Women's Campus",
              metricDomain,
              rawScore: 91.0,
              normalizedScore: 0.45,
              percentileRank: 50,
              rankPosition: 2,
            },
            {
              institutionId: "inst_beta",
              name: "Thaiba North - Higher Secondary",
              metricDomain,
              rawScore: 86.2,
              normalizedScore: -1.70,
              percentileRank: 0,
              rankPosition: 3,
            },
          ]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [metricDomain]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cross-Institution Performance Benchmarks</h1>
          <p className="text-sm text-slate-500">Comparative z-score analysis and percentile rankings across regional campuses</p>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          {(["all", "attendance", "fees", "academic", "ai_risk"] as const).map((domain) => (
            <Button
              key={domain}
              size="sm"
              variant={metricDomain === domain ? "default" : "ghost"}
              onClick={() => setMetricDomain(domain)}
              className={metricDomain === domain ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}
            >
              {domain.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <BenchmarkComparisonMatrix rows={rows} metricDomain={metricDomain} />
      )}
    </div>
  );
}
