"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CampusHealthRecord {
  institutionId: string;
  name: string;
  code: string;
  attendanceRate: number;
  feeRealizationRate: number;
  academicPassRate: number;
  aiRiskCount: number;
}

export interface CampusHealthTableProps {
  campuses: CampusHealthRecord[];
  onTriggerEtl?: () => void;
  isTriggeringEtl?: boolean;
}

export function CampusHealthTable({ campuses, onTriggerEtl, isTriggeringEtl }: CampusHealthTableProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Multi-Campus Operational Radar</h3>
          <p className="text-xs text-slate-500">Live operational snapshot across regional cluster institutions</p>
        </div>
        {onTriggerEtl && (
          <Button
            size="sm"
            onClick={onTriggerEtl}
            disabled={isTriggeringEtl}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isTriggeringEtl ? "Processing ETL..." : "Trigger ETL Pipeline"}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Campus Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Attendance %</th>
              <th className="px-4 py-3">Fee Realization %</th>
              <th className="px-4 py-3">Academic Pass %</th>
              <th className="px-4 py-3">AI Risk Alerts</th>
              <th className="px-4 py-3 text-right">Health Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {campuses.map((c) => {
              const isHealthy = c.attendanceRate >= 90 && c.feeRealizationRate >= 80 && c.aiRiskCount === 0;
              return (
                <tr key={c.institutionId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{c.code}</td>
                  <td className="px-4 py-3 font-semibold">{c.attendanceRate}%</td>
                  <td className="px-4 py-3 font-semibold">{c.feeRealizationRate}%</td>
                  <td className="px-4 py-3 font-semibold">{c.academicPassRate}%</td>
                  <td className="px-4 py-3">
                    {c.aiRiskCount > 0 ? (
                      <Badge variant="destructive">{c.aiRiskCount} High Risk</Badge>
                    ) : (
                      <Badge variant="secondary">0</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={isHealthy ? "success" : "warning"}>
                      {isHealthy ? "Healthy" : "Watchlist"}
                    </Badge>
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
