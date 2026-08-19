"use client";

import React, { useState, useEffect } from "react";
import { RetentionDashboard } from "@/components/predictive/retention-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { RetentionPredictionResult } from "@/lib/predictive/student-retention-predictor";

export default function PredictiveRetentionPage() {
  const [predictions, setPredictions] = useState<RetentionPredictionResult[]>([]);
  const [highRiskCount, setHighRiskCount] = useState<number>(0);
  const [moderateRiskCount, setModerateRiskCount] = useState<number>(0);
  const [lowRiskCount, setLowRiskCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/predictive/retention?campusId=inst-001")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load retention predictions");
        return res.json();
      })
      .then((data) => {
        setPredictions(data.predictions || []);
        setHighRiskCount(data.highRiskCount || 0);
        setModerateRiskCount(data.moderateRiskCount || 0);
        setLowRiskCount(data.lowRiskCount || 0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch predictive retention data");
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Predictive Student Retention Center</h1>
        <p className="text-muted-foreground mt-1">
          Machine-learned retention risk scoring and automated early intervention recommendations across multi-campus networks.
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <div>
            <div className="font-semibold">Error Loading Predictions</div>
            <div>{error}</div>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <RetentionDashboard
          predictions={predictions}
          highRiskCount={highRiskCount}
          moderateRiskCount={moderateRiskCount}
          lowRiskCount={lowRiskCount}
        />
      )}
    </div>
  );
}
