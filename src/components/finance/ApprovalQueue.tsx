"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/lib/utils";
import { Clock, CheckCircle2, XCircle, ArrowRight, ShieldAlert } from "lucide-react";

export interface QueueItem {
  id: string;
  type: "expense" | "purchase";
  title: string;
  submittedBy: string;
  submittedAt: string;
  amount: number | null;
  status: string;
  institutionId?: string;
  isEmergency?: boolean;
}

interface ApprovalQueueProps {
  items: QueueItem[];
  isLoading: boolean;
  onSelectItem: (item: QueueItem) => void;
  statusFilter: string;
}

export function ApprovalQueue({
  items,
  isLoading,
  onSelectItem,
  statusFilter,
}: ApprovalQueueProps) {
  const safeItems = ensureArray<QueueItem>(items);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (safeItems.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="font-medium text-sm">No approval requests found</p>
        <p className="text-xs">There are no items matching status &quot;{statusFilter}&quot;.</p>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "pending_hod":
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending HOD</Badge>;
      case "pending_accounts":
        return <Badge variant="info"><Clock className="w-3 h-3 mr-1" /> Pending Accounts</Badge>;
      case "pending_principal":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending Principal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {safeItems.map((item) => (
        <Card
          key={`${item.type}-${item.id}`}
          className="p-4 hover:border-primary/50 transition-colors flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={item.type === "expense" ? "outline" : "secondary"}>
                {item.type.toUpperCase()}
              </Badge>
              {item.isEmergency && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> EMERGENCY
                </Badge>
              )}
              <span className="font-semibold text-sm">{item.title}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span>Submitted by: {item.submittedBy}</span>
              <span>•</span>
              <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
              {item.amount !== null && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-foreground">
                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge(item.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectItem(item)}
              className="flex items-center gap-1"
            >
              Review <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
