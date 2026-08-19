"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, GitCompare, HardDrive } from "lucide-react";

interface SnapshotItem {
  id: string;
  tenantId: string;
  snapshotType: string;
  storageUri: string;
  checksumSha256: string;
  retentionTier: string;
  createdAt: string;
}

interface SnapshotTimelineCardProps {
  snapshots: SnapshotItem[];
  onCaptureSnapshot?: () => Promise<void>;
  onOpenDiffModal?: () => void;
  loading?: boolean;
}

export function SnapshotTimelineCard({
  snapshots,
  onCaptureSnapshot,
  onOpenDiffModal,
  loading,
}: SnapshotTimelineCardProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-sky-500" />
          Forensic State Snapshots
        </CardTitle>
        <div className="flex gap-2">
          {onOpenDiffModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDiffModal}
              disabled={snapshots.length < 2 || loading}
            >
              <GitCompare className="h-3.5 w-3.5 mr-1" />
              Diff
            </Button>
          )}
          {onCaptureSnapshot && (
            <Button
              size="sm"
              onClick={onCaptureSnapshot}
              disabled={loading}
            >
              <Camera className="h-3.5 w-3.5 mr-1" />
              Capture
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No forensic snapshots recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.slice(0, 4).map((snap) => (
              <div
                key={snap.id}
                className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50 text-xs"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="font-mono font-medium truncate">{snap.id}</div>
                  <div className="text-muted-foreground truncate">
                    {new Date(snap.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {snap.snapshotType}
                  </Badge>
                  <Badge
                    variant={snap.retentionTier === "HOT" ? "info" : "secondary"}
                    className="text-[10px]"
                  >
                    {snap.retentionTier}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
