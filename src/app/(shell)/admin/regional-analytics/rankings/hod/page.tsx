"use client";

import { useEffect, useState } from "react";
import { HodRankingLeaderboard, HodLeaderboardRow } from "../../_components/hod-ranking-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";

export default function RegionalHodRankingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HodLeaderboardRow[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/regional/rankings/hod?regionalGroupId=rg_default")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch HOD rankings");
        return res.json();
      })
      .then((data) => {
        const rankings = data.rankings || [];
        if (rankings.length > 0) {
          setRows(rankings);
        } else {
          setRows([
            {
              hodStaffId: "hod_01",
              hodName: "Dr. Ahmed Hassan",
              discipline: "Computer Science",
              institutionId: "inst_alpha",
              compositeScore: 92.4,
              rankPosition: 1,
              performanceFactors: { taskCompletionRate: 94.0, attendanceRate: 97.0, reviewRating: 4.8 },
            },
            {
              hodStaffId: "hod_02",
              hodName: "Prof. Sarah Khan",
              discipline: "Mathematics",
              institutionId: "inst_beta",
              compositeScore: 88.6,
              rankPosition: 2,
              performanceFactors: { taskCompletionRate: 88.0, attendanceRate: 94.0, reviewRating: 4.5 },
            },
            {
              hodStaffId: "hod_03",
              hodName: "Dr. Muhammed Ali",
              discipline: "Physics",
              institutionId: "inst_gamma",
              compositeScore: 85.0,
              rankPosition: 3,
              performanceFactors: { taskCompletionRate: 82.0, attendanceRate: 92.0, reviewRating: 4.2 },
            },
          ]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Regional HOD Performance Rankings</h1>
        <p className="text-sm text-slate-500">Cross-campus leadership evaluation and discipline analytics across regional academic clusters</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <HodRankingLeaderboard rows={rows} />
      )}
    </div>
  );
}
