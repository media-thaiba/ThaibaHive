"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgentsStore, WorkflowItem } from "@/lib/stores/agents-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileCode,
  Play,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function WorkflowsCatalogPage() {
  const { workflows, isLoading, fetchWorkflows, executeWorkflow } = useAgentsStore();
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);

  useEffect(() => {
    fetchWorkflows().catch(() => {});
  }, [fetchWorkflows]);

  const handleExecute = async (wf: WorkflowItem) => {
    setExecutingId(wf.id);
    setExecutionResult(null);
    try {
      const res = await executeWorkflow(wf.id, {});
      setExecutionResult({ success: true, ...res });
    } catch (err: any) {
      setExecutionResult({ success: false, error: err.message });
    } finally {
      setExecutingId(null);
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
            <h1 className="text-2xl font-bold tracking-tight">Institutional Workflow Catalog &amp; DSL</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Catalog of autonomous multi-agent DAG pipelines, triggers, and execution parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchWorkflows()}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {executionResult && (
        <Card className={executionResult.success ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {executionResult.success ? (
                <CheckCircle2 className="text-success size-5" />
              ) : (
                <AlertCircle className="text-destructive size-5" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {executionResult.success ? `Run Dispatched: ${executionResult.runId}` : "Execution Failed"}
                </p>
                <p className="text-muted-foreground text-xs">
                  Status: <Badge variant={executionResult.status === "completed" ? "success" : "warning"}>{executionResult.status}</Badge> | Duration: {executionResult.durationMs}ms
                </p>
              </div>
            </div>
            <Link href="/admin/agents/runs">
              <Button size="xs" variant="outline">
                View in Runs Inspector
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center text-sm">
                No workflows found. Seed templates or create a new DSL definition.
              </CardContent>
            </Card>
          ) : (
            workflows.map((wf) => (
              <Card
                key={wf.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${selectedWorkflow?.id === wf.id ? "border-primary shadow-sm" : ""}`}
                onClick={() => setSelectedWorkflow(wf)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{wf.name}</CardTitle>
                    <CardDescription className="text-xs">{wf.description || "No description provided."}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{wf.version}</Badge>
                    <Badge variant={wf.status === "active" ? "success" : "secondary"}>{wf.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground font-mono text-xs">ID: {wf.id}</span>
                  <Button
                    size="xs"
                    variant="default"
                    disabled={executingId === wf.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecute(wf);
                    }}
                  >
                    <Play className="mr-1 size-3" />
                    {executingId === wf.id ? "Dispatching..." : "Execute"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* DSL JSON Inspector Drawer */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileCode className="size-4" />
                DSL Definition Viewer
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedWorkflow ? selectedWorkflow.name : "Select a workflow to view its JSON DAG schema"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedWorkflow ? (
                <pre className="bg-muted/70 max-h-96 overflow-auto rounded-lg p-3 font-mono text-xs">
                  {typeof selectedWorkflow.definitionJson === "string"
                    ? JSON.stringify(JSON.parse(selectedWorkflow.definitionJson), null, 2)
                    : JSON.stringify(selectedWorkflow.definitionJson, null, 2)}
                </pre>
              ) : (
                <div className="text-muted-foreground py-16 text-center text-xs">
                  Click any workflow in the catalog to inspect its DAG nodes and parameters.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
