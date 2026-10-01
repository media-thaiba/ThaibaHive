"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAgentsStore } from "@/lib/stores/agents-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

export default function WorkflowRunsPage() {
  const {
    runs,
    selectedRunId,
    selectedRunSteps,
    isLoading,
    fetchRuns,
    selectRun,
  } = useAgentsStore();

  useEffect(() => {
    fetchRuns().catch(() => {});
  }, [fetchRuns]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success"><CheckCircle2 className="mr-1 size-3" />Completed</Badge>;
      case "running":
        return <Badge variant="info"><Clock className="mr-1 size-3 animate-spin" />Running</Badge>;
      case "awaiting_approval":
        return <Badge variant="warning"><AlertTriangle className="mr-1 size-3" />Awaiting Approval</Badge>;
      case "rolled_back":
      case "cancelled":
        return <Badge variant="secondary"><RotateCcw className="mr-1 size-3" />Rolled Back</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="mr-1 size-3" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/agents">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Workflow Execution Inspector</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Step-level timeline, saga compensation traces, and live execution outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchRuns()}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Runs History List */}
        <div className="space-y-3 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Workflow Runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {isLoading && runs.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-xs">No workflow runs recorded yet.</div>
              ) : (
                runs.map((r) => (
                  <div
                    key={r.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-all hover:bg-muted/50 ${selectedRunId === r.id ? "border-primary bg-muted/40" : ""}`}
                    onClick={() => selectRun(r.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate max-w-[150px]">{r.workflowId}</span>
                      {getStatusBadge(r.status)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                      <span>{r.id.slice(0, 14)}...</span>
                      <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Run Step-Level DAG Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" />
                Step Execution Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedRunId ? `Run Details: ${selectedRunId}` : "Select a workflow run from the left panel to inspect step execution trace."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRunId ? (
                selectedRunSteps.length === 0 ? (
                  <div className="text-muted-foreground py-10 text-center text-xs">
                    No steps recorded for this execution or still pending initialization.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedRunSteps.map((step, idx) => (
                      <div key={step.id || idx} className="relative flex items-start gap-4 pl-2">
                        <div className="bg-primary/20 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="bg-muted/40 flex-1 rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs">{step.stepKey}</span>
                            <Badge variant={step.status === "completed" ? "success" : step.status === "failed" ? "destructive" : "warning"}>
                              {step.status}
                            </Badge>
                          </div>
                          <div className="mt-1 text-muted-foreground text-xs font-mono">
                            Tool: {step.toolName || "system"} | Agent: {step.agentId || "orchestrator"}
                          </div>
                          {step.outputJson && (
                            <pre className="bg-background/80 mt-2 max-h-32 overflow-auto rounded p-2 text-[11px] font-mono">
                              {step.outputJson}
                            </pre>
                          )}
                          {step.error && (
                            <p className="text-destructive mt-1 text-xs">Error: {step.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-muted-foreground py-16 text-center text-xs">
                  Click a run on the left to inspect its detailed step execution log and saga compensation trace.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
