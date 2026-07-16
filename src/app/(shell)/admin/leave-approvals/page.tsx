"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Calendar, Check, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type LeaveRequest = {
  id: string;
  staffId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: string;
  appliedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  staffName: string | null;
  staffLastName: string | null;
  employeeId: string | null;
  leaveTypeName: string | null;
  leaveTypeCode: string | null;
};

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  cancelled: "secondary",
};

type Tab = "pending" | "all";

export default function LeaveApprovalsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    leave: LeaveRequest | null;
    action: "approved" | "rejected";
  }>({ open: false, leave: null, action: "approved" });
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => { fetchLeaves(); }, []);

  useEffect(() => { fetchLeaves(); }, [activeTab, dateFrom, dateTo]);

  async function fetchLeaves() {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTab === "pending") params.set("status", "pending");
    if (dateFrom) params.set("startDate", dateFrom);
    if (dateTo) params.set("endDate", dateTo);
    const qs = params.toString();
    const res = await fetch(`/api/leaves/admin${qs ? `?${qs}` : ""}`);
    const data = await res.json();
    setLeaves(data.leaves || []);
    setLoading(false);
  }

  function openAction(leave: LeaveRequest, action: "approved" | "rejected") {
    setActionDialog({ open: true, leave, action });
    setReviewNotes("");
  }

  async function handleAction() {
    if (!actionDialog.leave) return;
    setSubmitting(true);
    const res = await fetch(`/api/leaves/${actionDialog.leave.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: actionDialog.action,
        reviewNotes: reviewNotes || null,
      }),
    });
    if (res.ok) {
      toast.success(`Leave ${actionDialog.action}`);
      setActionDialog({ open: false, leave: null, action: "approved" });
      fetchLeaves();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update");
    }
    setSubmitting(false);
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: leaves.filter((l) => l.status === "pending").length },
    { key: "all", label: "All Requests", count: leaves.length },
  ];

  const displayLeaves = activeTab === "pending"
    ? leaves.filter((l) => l.status === "pending")
    : leaves;

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-bold">Leave Approvals</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto max-w-[160px]" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto max-w-[160px]" />
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : displayLeaves.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title={activeTab === "pending" ? "No pending requests" : "No leave requests"}
          description={activeTab === "pending" ? "All caught up!" : "No leave requests match your filters."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Dates</th>
                  <th className="px-4 py-3 text-left font-medium">Days</th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  {activeTab === "pending" && (
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayLeaves.map((leave) => (
                  <tr key={leave.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{[leave.staffName, leave.staffLastName].filter(Boolean).join(" ")}</div>
                      <div className="text-xs text-muted-foreground">{leave.employeeId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{leave.leaveTypeCode || leave.leaveTypeName}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                    </td>
                    <td className="px-4 py-3">{leave.daysCount}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{leave.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[leave.status] || "secondary"} className="capitalize text-[10px]">
                        {leave.status}
                      </Badge>
                    </td>
                    {activeTab === "pending" && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => openAction(leave, "approved")}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => openAction(leave, "rejected")}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approved" ? "Approve Leave" : "Reject Leave"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionDialog.leave && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p><span className="font-medium">Employee:</span> {[actionDialog.leave.staffName, actionDialog.leave.staffLastName].filter(Boolean).join(" ")}</p>
                <p><span className="font-medium">Type:</span> {actionDialog.leave.leaveTypeName}</p>
                <p><span className="font-medium">Dates:</span> {formatDate(actionDialog.leave.startDate)} — {formatDate(actionDialog.leave.endDate)} ({actionDialog.leave.daysCount} days)</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add review notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant={actionDialog.action === "rejected" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={submitting}
            >
              {submitting ? "Processing..." : actionDialog.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
