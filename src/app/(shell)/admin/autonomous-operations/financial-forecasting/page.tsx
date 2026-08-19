"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FinancialTrajectoryChart, ForecastItem } from "@/components/autonomous/financial-trajectory-chart";

export default function FinancialForecastingPage() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/autonomous/financial-forecast?horizonDays=90");
      if (!res.ok) throw new Error("Failed to fetch financial realization forecast");
      const data = await res.json();
      setForecasts(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading financial forecast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast().catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Predictive Budgeting & Financial Realization Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multi-campus revenue realization trajectory forecasting with P10/P50/P90 confidence bounds
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchForecast()}>
            Refresh Forecast
          </Button>
          <Button variant="default" size="sm">
            Export Briefing (PDF)
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-xl bg-slate-800/60" />
      ) : (
        <FinancialTrajectoryChart forecasts={forecasts} />
      )}
    </div>
  );
}
