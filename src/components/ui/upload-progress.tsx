"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, CheckCircle2, AlertTriangle, FileIcon } from "lucide-react";

export type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
};

interface UploadProgressProps {
  items: UploadItem[];
  onCancelItem?: (id: string) => void;
  onRetryItem?: (id: string) => void;
  onClearCompleted?: () => void;
  onCancelAll?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function UploadProgress({
  items,
  onCancelItem,
  onRetryItem,
  onClearCompleted,
  onCancelAll,
}: UploadProgressProps) {
  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.status === "completed").length;
  const overallPercentage = Math.round(
    items.reduce((acc, item) => acc + item.progress, 0) / items.length
  );

  return (
    <div className="bg-card border rounded-xl shadow-lg p-4 space-y-4 max-w-md w-full">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">
            Uploading Files ({completedCount}/{items.length})
          </h4>
          <p className="text-xs text-muted-foreground">{overallPercentage}% overall complete</p>
        </div>
        <div className="flex gap-1">
          {completedCount === items.length && onClearCompleted && (
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>
              Clear
            </Button>
          )}
          {completedCount < items.length && onCancelAll && (
            <Button variant="ghost" size="sm" onClick={onCancelAll} className="text-destructive">
              Cancel All
            </Button>
          )}
        </div>
      </div>

      <Progress value={overallPercentage} className="h-2" />

      <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs bg-muted/40 p-2 rounded-lg">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{item.file.name}</p>
                <p className="text-muted-foreground text-[10px]">
                  {formatBytes(item.file.size)} • {item.status}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.status === "uploading" && (
                <span className="font-mono text-[11px] text-primary">{item.progress}%</span>
              )}
              {item.status === "completed" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              {item.status === "failed" && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  {onRetryItem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRetryItem(item.id)}
                      title="Retry Upload"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
              {item.status !== "completed" && onCancelItem && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onCancelItem(item.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
