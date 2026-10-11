"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";
import { ensureArray } from "@/lib/utils";

export type StudioVersion = {
  id: string;
  version: number;
  graphName: string;
  description: string | null;
  dslHash: string;
  status: string;
  changeKind: "create" | "auto_save" | "publish" | "restore";
  restoredFromVersion: number | null;
  createdAt: string;
};

export type RestoredGraph = {
  id: string;
  graphName: string;
  description?: string | null;
  canvasStateJson: string;
  dslPayloadJson?: string | null;
  dslHash?: string | null;
  workflowId?: string | null;
  graphVersion: number;
  status: string;
  updatedAt?: string;
};

type VersionHistoryPanelProps = {
  graphId: string | null;
  currentVersion: number | null;
  disabled?: boolean;
  onRestored: (graph: RestoredGraph) => void;
};

const CHANGE_KIND_VARIANT: Record<StudioVersion["changeKind"], "success" | "info" | "secondary" | "warning"> = {
  create: "secondary",
  auto_save: "info",
  publish: "success",
  restore: "warning",
};

export function VersionHistoryPanel({ graphId, currentVersion, disabled, onRestored }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<StudioVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<StudioVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!graphId) {
      setVersions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/workflow-studio/graphs/${graphId}/versions`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setVersions(ensureArray(data.versions));
      } else if (res.status === 403) {
        setVersions([]);
      } else {
        toast.error(data.error || "Failed to load version history");
      }
    } catch {
      toast.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [graphId]);

  useEffect(() => {
    loadVersions().catch(() => {});
  }, [loadVersions]);

  const handleRestore = useCallback(
    async (version: number) => {
      if (!graphId) return;
      setRestoring(true);
      try {
        const res = await fetch(`/api/workflow-studio/graphs/${graphId}/versions/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const details: string[] = ensureArray(data.details);
          toast.error(details[0] || data.error || "Restore failed");
          return;
        }
        toast.success(`Restored v${version}; re-publish to push it to the execution engine`);
        onRestored(data.graph);
        await loadVersions();
      } catch {
        toast.error("Network error while restoring version");
      } finally {
        setRestoring(false);
        setRestoreTarget(null);
      }
    },
    [graphId, loadVersions, onRestored]
  );

  return (
    <>
      <Card aria-label="Version history">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <History aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
              Version history
            </CardTitle>
            {currentVersion !== null && (
              <Badge variant="outline" className="text-[10px]">
                current v{currentVersion}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!graphId ? (
            <p className="text-xs text-muted-foreground italic">
              Save a workflow to start tracking versions.
            </p>
          ) : loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" aria-label="Loading version history" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <ol className="max-h-[300px] overflow-y-auto space-y-1" aria-label="Saved versions">
              {versions.map((v) => (
                <li key={v.id} className="rounded-md px-2 py-1.5 text-xs hover:bg-accent">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium">v{v.version}</span>
                      <Badge variant={CHANGE_KIND_VARIANT[v.changeKind] || "secondary"} className="text-[10px]">
                        {v.changeKind.replace("_", " ")}
                      </Badge>
                      {currentVersion === v.version && (
                        <Badge variant="default" className="text-[10px]">current</Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0"
                      disabled={disabled || restoring || currentVersion === v.version}
                      onClick={() => setRestoreTarget(v)}
                      aria-label={`Restore workflow version ${v.version}`}
                    >
                      <RotateCcw aria-hidden className="mr-1 h-3 w-3" />
                      Restore
                    </Button>
                  </div>
                  <p className="truncate text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                    {v.dslHash ? ` · ${v.dslHash.slice(0, 8)}` : ""}
                    {v.restoredFromVersion ? ` · from v${v.restoredFromVersion}` : ""}
                  </p>
                </li>
              ))}
              {versions.length === 0 && (
                <li className="text-xs text-muted-foreground italic px-1 py-2">
                  No versions recorded yet.
                </li>
              )}
            </ol>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        title={restoreTarget ? `Restore version v${restoreTarget.version}?` : "Restore version?"}
        description="The canvas, name and compiled DSL roll back to this snapshot. The rollback is recorded as a new version and the workflow is marked draft until you publish again."
        confirmText="Restore version"
        variant="default"
        onConfirm={async () => {
          if (restoreTarget) await handleRestore(restoreTarget.version);
        }}
      />
    </>
  );
}
