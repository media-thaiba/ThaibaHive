"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {  } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureArray } from "@/lib/utils";
import { ApprovalQueue, QueueItem } from "./ApprovalQueue";
import { ApprovalModal } from "./ApprovalModal";
import { Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export function FinanceDashboard() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  const fetchQueueData = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/approvals?status=${statusFilter}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch approvals");
        return res.json();
      })
      .then((data) => {
        const rawList = data?.approvals || data?.items || [];
        setItems(ensureArray<QueueItem>(rawList));
      })
      .catch((err) => {
        console.error("Failed to load finance queue:", err);
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  const pendingCount = items.filter((i) => i.status.startsWith("pending")).length;
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const rejectedCount = items.filter((i) => i.status === "rejected").length;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance Approvals Engine</h1>
          <p className="text-sm text-muted-foreground">
            Multi-stage workflow queue management for expense claims and purchase requests.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQueueData} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Pending Requests</div>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Approved</div>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-lg">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Rejected</div>
            <div className="text-2xl font-bold">{rejectedCount}</div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          variant={statusFilter === "pending" ? "default" : "ghost"}
          size="sm"
          onClick={() => setStatusFilter("pending")}
        >
          Pending Queue
        </Button>
        <Button
          variant={statusFilter === "approved" ? "default" : "ghost"}
          size="sm"
          onClick={() => setStatusFilter("approved")}
        >
          Approved History
        </Button>
        <Button
          variant={statusFilter === "rejected" ? "default" : "ghost"}
          size="sm"
          onClick={() => setStatusFilter("rejected")}
        >
          Rejected
        </Button>
      </div>

      <ApprovalQueue
        items={items}
        isLoading={isLoading}
        onSelectItem={(item) => setSelectedItem(item)}
        statusFilter={statusFilter}
      />

      {selectedItem && (
        <ApprovalModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => {
            setSelectedItem(null);
            fetchQueueData();
          }}
        />
      )}
    </div>
  );
}
