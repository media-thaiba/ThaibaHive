"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Archive, X,  } from "lucide-react";

interface DownloadProgressProps {
  isDownloading: boolean;
  itemCount: number;
  progress?: number;
  onCancel?: () => void;
}

export function DownloadProgress({
  isDownloading,
  itemCount,
  progress = 50,
  onCancel,
}: DownloadProgressProps) {
  if (!isDownloading) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-card border shadow-2xl rounded-2xl p-4 max-w-sm w-full space-y-3 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Archive className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-semibold">Creating ZIP Archive</h4>
            <p className="text-[11px] text-muted-foreground">
              Packaging {itemCount} selected file{itemCount > 1 ? "s" : ""}...
            </p>
          </div>
        </div>

        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Progress value={progress} className="h-1.5" />
    </div>
  );
}
