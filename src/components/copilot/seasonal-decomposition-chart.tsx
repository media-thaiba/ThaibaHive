"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SeasonalDecompositionChartProps {
  observed: number[];
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export function SeasonalDecompositionChart({
  observed,
  trend,
  seasonal,
  residual,
}: SeasonalDecompositionChartProps) {
  const maxObserved = Math.max(...observed, 1);

  return (
    <Card className="border border-slate-700 bg-slate-900 text-slate-100 shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-white">
          Additive STL Time-Series Components (24-Month Horizon)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-emerald-400">Observed Revenue ($)</div>
          <div className="flex h-16 items-end space-x-1 rounded bg-slate-950 p-2">
            {observed.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-emerald-500 hover:bg-emerald-400"
                style={{ height: `${(val / maxObserved) * 100}%` }}
                title={`Month ${i + 1}: $${val.toLocaleString()}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-blue-400">Extracted Trend Component ($)</div>
          <div className="flex h-16 items-end space-x-1 rounded bg-slate-950 p-2">
            {trend.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-blue-500 hover:bg-blue-400"
                style={{ height: `${(val / maxObserved) * 100}%` }}
                title={`Trend Month ${i + 1}: $${val.toLocaleString()}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-purple-400">Periodic Seasonal Cycle</div>
          <div className="flex h-16 items-center space-x-1 rounded bg-slate-950 p-2">
            {seasonal.map((val, i) => (
              <div
                key={i}
                className={`flex-1 rounded ${val >= 0 ? "bg-purple-500" : "bg-purple-800"}`}
                style={{ height: `${Math.min(100, Math.abs(val) / 500)}%` }}
                title={`Seasonal Month ${i + 1}: ${val.toFixed(0)}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-rose-400">Residual Residual Noise</div>
          <div className="flex h-16 items-center space-x-1 rounded bg-slate-950 p-2">
            {residual.map((val, i) => (
              <div
                key={i}
                className={`flex-1 rounded ${Math.abs(val) > 10000 ? "bg-rose-500 font-bold" : "bg-slate-700"}`}
                style={{ height: `${Math.min(100, (Math.abs(val) / maxObserved) * 300)}%` }}
                title={`Residual Month ${i + 1}: ${val.toFixed(0)}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
