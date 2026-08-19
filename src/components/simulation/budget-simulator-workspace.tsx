"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimulationResult } from "@/lib/simulation/budget-scenario-simulator";

interface BudgetSimulatorWorkspaceProps {
  initialResult: SimulationResult;
  onRunSimulation: (params: {
    scenarioName: string;
    staffCostDelta: number;
    tuitionFeeDelta: number;
    facilityBudgetDelta: number;
    scholarshipAllocationDelta: number;
  }) => void;
  loading: boolean;
}

export function BudgetSimulatorWorkspace({
  initialResult,
  onRunSimulation,
  loading,
}: BudgetSimulatorWorkspaceProps) {
  const [scenarioName, setScenarioName] = useState<string>("Q4 Resource Allocation Shift");
  const [staffCostDelta, setStaffCostDelta] = useState<number>(25000);
  const [tuitionFeeDelta, setTuitionFeeDelta] = useState<number>(0);
  const [facilityBudgetDelta, setFacilityBudgetDelta] = useState<number>(10000);
  const [scholarshipAllocationDelta, setScholarshipAllocationDelta] = useState<number>(5000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation({
      scenarioName,
      staffCostDelta,
      tuitionFeeDelta,
      facilityBudgetDelta,
      scholarshipAllocationDelta,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scenario Configuration Controls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Adjust financial reallocation parameters to project real-time multi-campus margin shifts.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 col-span-1 md:col-span-3">
              <Label htmlFor="scenarioName">Scenario Name</Label>
              <Input
                id="scenarioName"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Faculty Salary Adjustment & Expansion"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffCost">Staff Cost Adjustment (₹)</Label>
              <Input
                id="staffCost"
                type="number"
                value={staffCostDelta}
                onChange={(e) => setStaffCostDelta(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tuitionFee">Tuition Fee Shift / Student (₹)</Label>
              <Input
                id="tuitionFee"
                type="number"
                value={tuitionFeeDelta}
                onChange={(e) => setTuitionFeeDelta(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityBudget">Facility Budget Shift (₹)</Label>
              <Input
                id="facilityBudget"
                type="number"
                value={facilityBudgetDelta}
                onChange={(e) => setFacilityBudgetDelta(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scholarship">Scholarship Allocation Shift (₹)</Label>
              <Input
                id="scholarship"
                type="number"
                value={scholarshipAllocationDelta}
                onChange={(e) => setScholarshipAllocationDelta(Number(e.target.value))}
              />
            </div>

            <div className="flex items-end col-span-1 md:col-span-2">
              <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                {loading ? "Calculating Simulation..." : "Execute Simulation Analysis"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Baseline Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">
              ₹{initialResult.baselineTotalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Simulated Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-primary">
              ₹{initialResult.simulatedTotalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Simulated Operating Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">
              ₹{initialResult.simulatedOperatingMargin.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Margin Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-xl font-bold font-mono">
                {initialResult.variancePercentage >= 0 ? "+" : ""}
                {initialResult.variancePercentage}%
              </div>
              <Badge variant={initialResult.variancePercentage >= 0 ? "success" : "destructive"}>
                {initialResult.variancePercentage >= 0 ? "Favorable" : "Deficit"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Execution SLA: {initialResult.executionTimeMs}ms
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campus Level Reallocation Impact Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Multi-campus revenue, expense, and operating margin variance matrix.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campus Name</TableHead>
                <TableHead>Baseline Revenue</TableHead>
                <TableHead>Baseline Expenses</TableHead>
                <TableHead>Simulated Revenue</TableHead>
                <TableHead>Simulated Expenses</TableHead>
                <TableHead>Simulated Margin</TableHead>
                <TableHead className="text-right">Variance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialResult.campusBreakdowns.map((cb) => (
                <TableRow key={cb.campusId}>
                  <TableCell className="font-medium">{cb.campusName}</TableCell>
                  <TableCell className="font-mono">₹{cb.baselineRevenue.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">₹{cb.baselineExpenses.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">₹{cb.simulatedRevenue.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">₹{cb.simulatedExpenses.toLocaleString()}</TableCell>
                  <TableCell className="font-mono font-semibold">₹{cb.simulatedMargin.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    <Badge variant={cb.variancePercentage >= 0 ? "success" : "destructive"}>
                      {cb.variancePercentage >= 0 ? "+" : ""}
                      {cb.variancePercentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
