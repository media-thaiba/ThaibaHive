"use client";

import { Badge } from "@/components/ui/badge";

export interface BenchmarkMatrixRow {
  institutionId: string;
  name: string;
  metricDomain: string;
  rawScore: number;
  normalizedScore: number;
  percentileRank: number;
  rankPosition: number;
}

export interface BenchmarkComparisonMatrixProps {
  rows: BenchmarkMatrixRow[];
  metricDomain: string;
}

export function BenchmarkComparisonMatrix({ rows, metricDomain }: BenchmarkComparisonMatrixProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Cross-Institution Comparative Matrix ({metricDomain.toUpperCase()})
          </h3>
          <p className="text-xs text-slate-500">Z-score normalized rankings and percentile distributions across regional campuses</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Rank #</th>
              <th className="px-4 py-3">Campus / Institution</th>
              <th className="px-4 py-3">Raw Performance Score</th>
              <th className="px-4 py-3">Z-Score (Normalized)</th>
              <th className="px-4 py-3">Percentile Rank</th>
              <th className="px-4 py-3 text-right">Performance Band</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => {
              const isTop = r.rankPosition === 1;
              const isBottom = r.percentileRank < 30;
              return (
                <tr key={r.institutionId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">#{r.rankPosition}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 font-semibold">{r.rawScore}</td>
                  <td className="px-4 py-3 font-mono font-medium">
                    {r.normalizedScore >= 0 ? `+${r.normalizedScore}` : r.normalizedScore}
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.percentileRank}%</td>
                  <td className="px-4 py-3 text-right">
                    {isTop ? (
                      <Badge variant="success">Top Tier (P1)</Badge>
                    ) : isBottom ? (
                      <Badge variant="destructive">Improvement Needed</Badge>
                    ) : (
                      <Badge variant="secondary">Standard</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
