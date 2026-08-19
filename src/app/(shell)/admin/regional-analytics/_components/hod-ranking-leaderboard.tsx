"use client";

import { Badge } from "@/components/ui/badge";

export interface HodLeaderboardRow {
  hodStaffId: string;
  hodName: string;
  discipline: string;
  institutionId: string;
  compositeScore: number;
  rankPosition: number;
  performanceFactors: {
    taskCompletionRate: number;
    attendanceRate: number;
    reviewRating: number;
  };
}

export interface HodRankingLeaderboardProps {
  rows: HodLeaderboardRow[];
}

export function HodRankingLeaderboard({ rows }: HodRankingLeaderboardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-base font-semibold text-slate-900">Regional HOD Leadership Leaderboard</h3>
        <p className="text-xs text-slate-500">Cross-campus Head of Department ranking evaluated on operational execution, attendance, and review scores</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">HOD Name</th>
              <th className="px-4 py-3">Discipline / Dept</th>
              <th className="px-4 py-3">Composite Score</th>
              <th className="px-4 py-3">Task Completion %</th>
              <th className="px-4 py-3">Attendance %</th>
              <th className="px-4 py-3 text-right">Rating Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => {
              const isTop3 = r.rankPosition <= 3;
              return (
                <tr key={r.hodStaffId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      r.rankPosition === 1 ? "bg-amber-100 text-amber-800" :
                      r.rankPosition === 2 ? "bg-slate-200 text-slate-700" :
                      r.rankPosition === 3 ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      #{r.rankPosition}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.hodName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.discipline}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{r.compositeScore} / 100</td>
                  <td className="px-4 py-3 font-medium">{r.performanceFactors.taskCompletionRate}%</td>
                  <td className="px-4 py-3 font-medium">{r.performanceFactors.attendanceRate}%</td>
                  <td className="px-4 py-3 text-right">
                    {isTop3 ? (
                      <Badge variant="success">Discipline Leader</Badge>
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
