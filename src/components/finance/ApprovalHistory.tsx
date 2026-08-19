"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ensureArray } from "@/lib/utils";
import { CheckCircle2, XCircle, RotateCcw, Clock, User } from "lucide-react";

export interface ApprovalHistoryItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  newStatus: string;
  notes?: string;
  timestamp: string;
}

interface ApprovalHistoryProps {
  history: ApprovalHistoryItem[];
}

export function ApprovalHistory({ history }: ApprovalHistoryProps) {
  const safeHistory = ensureArray<ApprovalHistoryItem>(history);

  if (safeHistory.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-2 text-center">
        No approval history recorded yet.
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "approve":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "reject":
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case "return":
        return <RotateCcw className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative border-l pl-4 space-y-4 my-2">
      {safeHistory.map((item) => (
        <div key={item.id} className="relative space-y-1 text-xs">
          <div className="absolute -left-[21px] top-0 bg-background p-0.5 rounded-full">
            {getActionIcon(item.action)}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground" />
              {item.actorName} ({item.actorRole.toUpperCase()})
            </span>
            <span className="text-muted-foreground">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{item.action.toUpperCase()}</Badge>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium text-foreground">{item.newStatus}</span>
          </div>
          {item.notes && (
            <p className="text-muted-foreground bg-muted/40 p-2 rounded text-xs mt-1 border border-dashed">
              &quot;{item.notes}&quot;
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
