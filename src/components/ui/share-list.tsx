"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Eye, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

export type ShareItem = {
  id: string;
  token: string;
  downloadCount: number;
  expiresAt?: string | null;
  createdAt: string;
  hasPassword?: boolean;
};

interface ShareListProps {
  shares: ShareItem[];
  onRevoke?: (token: string) => void;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ShareList({ shares, onRevoke }: ShareListProps) {
  if (shares.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        No active share links
      </div>
    );
  }

  const handleRevoke = async (token: string) => {
    const { ok, error } = await api.delete(`/api/media/share-links/${token}`);
    if (ok) {
      toast.success("Share link revoked successfully");
      onRevoke?.(token);
    } else {
      toast.error(error || "Failed to revoke share link");
    }
  };

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-semibold text-muted-foreground">Active Share Links</h5>
      <div className="space-y-2">
        {shares.map((share) => {
          const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();
          return (
            <div
              key={share.id || share.token}
              className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] truncate max-w-[120px]">
                    ...{share.token.slice(-8)}
                  </span>
                  {share.hasPassword && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                      <Lock className="w-2.5 h-2.5" /> Protected
                    </span>
                  )}
                  {isExpired && (
                    <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">
                      Expired
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Expires: {formatDate(share.expiresAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Views: {share.downloadCount}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleRevoke(share.token)}
                title="Revoke Share Link"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
