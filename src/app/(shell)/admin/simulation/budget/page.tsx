"use client";

import React, { useState, useEffect } from "react";
import { BudgetSimulatorWorkspace } from "@/components/simulation/budget-simulator-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { SimulationResult } from "@/lib/simulation/budget-scenario-simulator";

export default function BudgetSimulationPage() {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulation = (params: {
    scenarioName: string;
    staffCostDelta: number;
    tuitionFeeDelta: number;
    facilityBudgetDelta: number;
    scholarshipAllocationDelta: number;
  }) => {
    setLoading(true);
    fetch("/api/admin/simulation/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to execute simulation");
        return res.json();
      })
      .then((data: SimulationResult) => {
        setSimulationResult(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to run simulation");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSimulation({
      scenarioName: "Baseline Campus Allocation",
      staffCostDelta: 0,
      tuitionFeeDelta: 0,
      facilityBudgetDelta: 0,
      scholarshipAllocationDelta: 0,
    });
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interactive &quot;What-If&quot; Budget Scenario Simulator</h1>
        <p className="text-muted-foreground mt-1">
          Simulate multi-campus resource reallocations, staff adjustments, and operational margin impacts under 100ms SLA.
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <div>
            <div className="font-semibold">Simulation Error</div>
            <div>{error}</div>
          </div>
        </Alert>
      )}

      {loading && !simulationResult ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        simulationResult && (
          <BudgetSimulatorWorkspace
            initialResult={simulationResult}
            onRunSimulation={fetchSimulation}
            loading={loading}
          />
        )
      )}
    </div>
  );
}
