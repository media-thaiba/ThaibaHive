/**
 * Chaos Experiment Runner Component
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ChaosScenario, ChaosExecutionRecord } from '@/lib/security/chaos/chaos-types';

interface ChaosExperimentRunnerProps {
  scenarios: ChaosScenario[];
  executions: ChaosExecutionRecord[];
  isRunning: boolean;
  loading?: boolean;
  onRunScenario: (scenarioId: string) => void;
  onOpenKillSwitch: () => void;
}

export function ChaosExperimentRunner({
  scenarios,
  executions,
  isRunning,
  loading,
  onRunScenario,
  onOpenKillSwitch,
}: ChaosExperimentRunnerProps) {
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Automated Chaos Mesh Runner</h2>
          <p className="text-sm text-muted-foreground">
            Controlled resilience simulation and fault injection harness with automated safety guardrails
          </p>
        </div>
        <Button onClick={onOpenKillSwitch} variant="destructive" size="sm">
          Emergency Kill-Switch
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((scenario) => (
          <Card key={scenario.scenarioId} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{scenario.faultType.replace(/_/g, ' ')}</Badge>
                <span className="text-xs text-muted-foreground">Duration: {scenario.durationSeconds}s</span>
              </div>
              <CardTitle className="text-base font-semibold mt-1">{scenario.name}</CardTitle>
              <CardDescription className="text-xs">{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Blast Radius: {scenario.target.blastRadiusPercentage}% on {scenario.target.targetIdentifier}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isRunning}
                onClick={() => onRunScenario(scenario.scenarioId)}
              >
                {isRunning ? 'Injecting...' : 'Launch Experiment'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Chaos Execution History</CardTitle>
          <CardDescription className="text-xs">
            Telemetry and recovery metrics from continuous chaos runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No recent chaos executions recorded.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>P99 Latency</TableHead>
                  <TableHead>Error Rate</TableHead>
                  <TableHead>Recovery Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((exec) => (
                  <TableRow key={exec.executionId}>
                    <TableCell className="font-medium text-xs">{exec.scenarioId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          exec.state === 'COMPLETED'
                            ? 'success'
                            : exec.state === 'ABORTED'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {exec.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{exec.observedMetrics.p99LatencyMs}ms</TableCell>
                    <TableCell className="text-xs">{exec.observedMetrics.errorRate.toFixed(2)}%</TableCell>
                    <TableCell className="text-xs">{exec.recoveryTimeMs}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
