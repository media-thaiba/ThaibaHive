"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { GitCompare, CheckCircle } from "lucide-react";

interface SnapshotItem {
  id: string;
  storageUri: string;
  createdAt: string;
}

interface SnapshotDiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshots: SnapshotItem[];
  onComputeDiff?: (baseUri: string, targetUri: string) => Promise<any>;
}

export function SnapshotDiffModal({
  open,
  onOpenChange,
  snapshots,
  onComputeDiff,
}: SnapshotDiffModalProps) {
  const [baseUri, setBaseUri] = useState<string>(snapshots[1]?.storageUri || snapshots[0]?.storageUri || "");
  const [targetUri, setTargetUri] = useState<string>(snapshots[0]?.storageUri || "");
  const [loading, setLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<any | null>(null);

  const handleCompare = async () => {
    if (!onComputeDiff || !baseUri || !targetUri) return;
    try {
      setLoading(true);
      const res = await onComputeDiff(baseUri, targetUri);
      setDiffResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-5 w-5 text-sky-500" />
            Forensic Snapshot Differential Comparison
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Base Snapshot (Earlier)</label>
              <Select
                value={baseUri}
                onChange={(e) => setBaseUri(e.target.value)}
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.storageUri}>
                    {s.id} ({new Date(s.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Target Snapshot (Later)</label>
              <Select
                value={targetUri}
                onChange={(e) => setTargetUri(e.target.value)}
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.storageUri}>
                    {s.id} ({new Date(s.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleCompare}
            disabled={loading || !baseUri || !targetUri}
          >
            {loading ? "Comparing..." : "Run State Diff Analysis"}
          </Button>

          {diffResult && (
            <div className="p-3 bg-muted/40 rounded border border-border text-xs space-y-2 max-h-60 overflow-auto">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {diffResult.diff?.summary || "Comparison Complete"}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-1.5 rounded bg-background">
                  <div className="text-[11px] text-muted-foreground">Added Users</div>
                  <div className="text-sm font-semibold text-emerald-600">
                    {diffResult.diff?.addedEntities?.users?.length ?? 0}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-background">
                  <div className="text-[11px] text-muted-foreground">Modified Users</div>
                  <div className="text-sm font-semibold text-blue-600">
                    {diffResult.diff?.modifiedEntities?.users?.length ?? 0}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-background">
                  <div className="text-[11px] text-muted-foreground">Deleted Users</div>
                  <div className="text-sm font-semibold text-rose-600">
                    {diffResult.diff?.deletedEntities?.users?.length ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
