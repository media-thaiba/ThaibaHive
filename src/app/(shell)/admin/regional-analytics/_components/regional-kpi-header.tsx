"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RegionalKpiProps {
  totalCampuses: number;
  averageAttendance: number;
  averageFeeRealization: number;
  criticalAnomalies: number;
  lastEtlRunAt?: string;
}

export function RegionalKpiHeader({
  totalCampuses,
  averageAttendance,
  averageFeeRealization,
  criticalAnomalies,
  lastEtlRunAt,
}: RegionalKpiProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-blue-600 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Regional Campuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{totalCampuses}</span>
            <Badge variant="secondary">Active Network</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-600 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Network Attendance Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{averageAttendance}%</span>
            <Badge variant={averageAttendance >= 90 ? "success" : "warning"}>
              {averageAttendance >= 90 ? "Optimal" : "Needs Review"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-600 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fee Realization Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{averageFeeRealization}%</span>
            <Badge variant={averageFeeRealization >= 85 ? "success" : "warning"}>
              {averageFeeRealization >= 85 ? "On Track" : "Lagging"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-rose-600 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active AI Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{criticalAnomalies}</span>
            <Badge variant={criticalAnomalies === 0 ? "success" : "destructive"}>
              {criticalAnomalies === 0 ? "Clear" : "Attention Required"}
            </Badge>
          </div>
          {lastEtlRunAt && (
            <p className="text-xs text-slate-400 mt-2">
              Last ETL: {new Date(lastEtlRunAt).toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
