"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

export interface ForecastItem {
  campusId: string;
  horizonDays: number;
  targetBudgetAmount: number;
  forecastP10: number;
  forecastP50: number;
  forecastP90: number;
  realizationDeficitPercent: number;
  riskLevel: string;
}

export function FinancialTrajectoryChart({ forecasts }: { forecasts: ForecastItem[] }) {
  if (forecasts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {forecasts.map((f) => (
        <div key={f.campusId} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-indigo-300 font-semibold">{f.campusId}</span>
            <Badge
              variant={
                f.riskLevel === "critical_deficit"
                  ? "destructive"
                  : f.riskLevel === "moderate_risk"
                  ? "warning"
                  : "success"
              }
            >
              {f.riskLevel}
            </Badge>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Target Budget:</span>
              <span className="font-semibold text-slate-200">${f.targetBudgetAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>P50 Expected Realization:</span>
              <span className="font-semibold text-emerald-400">${f.forecastP50.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>P10–P90 Range:</span>
              <span className="text-slate-300">
                ${f.forecastP10.toLocaleString()} – ${f.forecastP90.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Realization Deficit:</span>
              <span
                className={`font-bold ${
                  f.realizationDeficitPercent > 15 ? "text-rose-400" : "text-slate-300"
                }`}
              >
                {f.realizationDeficitPercent}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
