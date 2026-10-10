"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { Plus, Save, Rocket, Trash2, Workflow } from "lucide-react";
import { ensureArray } from "@/lib/utils";
import type { StudioCanvasState } from "@/lib/workflow-studio/graph-compiler";

const WorkflowStudioCanvas = dynamic(
  () => import("@/components/workflow-studio/workflow-studio-canvas"),
  { ssr: false }
);

type StudioGraph = {
  id: string;
  graphName: string;
  description: string | null;
  canvasStateJson: string;
  dslPayloadJson: string | null;
  dslHash: string | null;
  workflowId: string | null;
  graphVersion: number;
  status: string;
  updatedAt: string;
};

const EMPTY_CANVAS: StudioCanvasState = { nodes: [], edges: [] };

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "workflow"
  );
}

export default function WorkflowStudioPage() {
  const [graphs, setGraphs] = useState<StudioGraph[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graphName, setGraphName] = useState("Untitled Workflow");
  const [canvasState, setCanvasState] = useState<StudioCanvasState>(EMPTY_CANVAS);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const selectedGraph = useMemo(
    () => graphs.find((g) => g.id === selectedId) || null,
    [graphs, selectedId]
  );

  const loadGraphs = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow-studio/graphs");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGraphs(ensureArray(data.graphs));
      } else if (res.status === 403) {
        toast.error(data.error || "Workflow Studio is disabled or you lack access");
      } else {
        toast.error(data.error || "Failed to load workflow graphs");
      }
    } catch {
      toast.error("Failed to load workflow graphs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphs().catch(() => {});
  }, [loadGraphs]);

  const selectGraph = useCallback((graph: StudioGraph | null) => {
    setErrors([]);
    if (!graph) {
      setSelectedId(null);
      setGraphName("Untitled Workflow");
      setCanvasState(EMPTY_CANVAS);
      return;
    }
    setSelectedId(graph.id);
    setGraphName(graph.graphName);
    try {
      setCanvasState(JSON.parse(graph.canvasStateJson) as StudioCanvasState);
    } catch {
      setCanvasState(EMPTY_CANVAS);
      toast.error("Stored canvas state is corrupt; starting blank");
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setErrors([]);
    try {
      const payload = { graphName, canvasState };
      const res = selectedId
        ? await fetch(`/api/workflow-studio/graphs/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/workflow-studio/graphs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, key: slugify(graphName) }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details: string[] = ensureArray(data.details);
        setErrors(details.length > 0 ? details : [data.error || "Save failed"]);
        toast.error(data.error || "Failed to save workflow");
        return;
      }
      toast.success(selectedId ? "Workflow updated" : "Workflow saved as draft");
      await loadGraphs();
      if (!selectedId && data.graph?.id) {
        setSelectedId(data.graph.id);
      }
    } catch {
      setErrors(["Network error while saving"]);
      toast.error("Network error while saving");
    } finally {
      setSaving(false);
    }
  }, [graphName, canvasState, selectedId, loadGraphs]);

  const handlePublish = useCallback(async () => {
    if (!selectedId) {
      toast.error("Save the workflow before publishing");
      return;
    }
    setPublishing(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/workflow-studio/graphs/${selectedId}/publish`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details: string[] = ensureArray(data.details);
        setErrors(details.length > 0 ? details : [data.error || "Publish failed"]);
        toast.error(data.error || "Failed to publish workflow");
        return;
      }
      toast.success(`Published as workflow ${data.workflowId || selectedId}`);
      await loadGraphs();
    } catch {
      setErrors(["Network error while publishing"]);
      toast.error("Network error while publishing");
    } finally {
      setPublishing(false);
    }
  }, [selectedId, loadGraphs]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/workflow-studio/graphs/${selectedId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete workflow");
        return;
      }
      toast.success("Workflow deleted");
      selectGraph(null);
      await loadGraphs();
    } catch {
      toast.error("Network error while deleting");
    }
  }, [selectedId, loadGraphs, selectGraph]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Workflow Studio"
        description="Design agentic workflows visually and publish them to the execution engine"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Graph list */}
        <Card aria-label="Saved workflows">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Workflows</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => selectGraph(null)}
                aria-label="Start a new blank workflow"
              >
                <Plus aria-hidden className="mr-1 h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" aria-label="Loading workflows" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <ul className="space-y-1" aria-label="Workflow list">
                  {graphs.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => selectGraph(g)}
                        className={`w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-accent ${
                          g.id === selectedId ? "bg-accent font-medium" : ""
                        }`}
                        aria-current={g.id === selectedId ? "true" : undefined}
                        aria-label={`Open workflow ${g.graphName} (${g.status})`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate flex items-center gap-1.5">
                            <Workflow aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground" />
                            {g.graphName}
                          </span>
                          <Badge variant={g.status === "published" ? "success" : "secondary"} className="text-[10px] shrink-0">
                            {g.status}
                          </Badge>
                        </span>
                      </button>
                    </li>
                  ))}
                  {graphs.length === 0 && (
                    <li className="text-xs text-muted-foreground italic px-1 py-2">
                      No workflows yet — start a new one.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <label htmlFor="wf-name" className="text-xs font-medium text-muted-foreground">
                Workflow name
              </label>
              <Input
                id="wf-name"
                value={graphName}
                onChange={(e) => setGraphName(e.target.value)}
                placeholder="e.g. Fee Default Escalation"
                maxLength={120}
              />
            </div>
            <Button type="button" onClick={handleSave} disabled={saving || publishing} aria-label="Save workflow draft">
              <Save aria-hidden className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handlePublish}
              disabled={publishing || saving || !selectedId}
              aria-label="Publish workflow to execution engine"
            >
              <Rocket aria-hidden className="mr-1.5 h-4 w-4" />
              {publishing ? "Publishing…" : "Publish"}
            </Button>
            {selectedId && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={saving || publishing}
                aria-label={`Delete workflow ${graphName}`}
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            )}
            {selectedGraph && (
              <Badge variant="outline" className="text-[10px]">
                v{selectedGraph.graphVersion} · {selectedGraph.status}
                {selectedGraph.dslHash ? ` · ${selectedGraph.dslHash.slice(0, 8)}` : ""}
              </Badge>
            )}
          </div>

          {errors.length > 0 && (
            <Alert variant="error" role="alert" aria-label="Workflow validation errors">
              <p className="font-semibold text-sm mb-1">Compilation problems</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-xs">
                    {e}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <WorkflowStudioCanvas
            key={selectedId || "new"}
            initialCanvas={canvasState}
            onCanvasChange={setCanvasState}
          />
        </div>
      </div>
    </div>
  );
}
