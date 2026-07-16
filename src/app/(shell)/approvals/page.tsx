"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ApprovalItem = {
  id: string;
  type: "leave" | "expense" | "purchase" | "booking";
  title: string;
  submittedBy: string;
  submittedAt: string;
  amount: number | null;
  status: string;
  link: string;
  actionUrl: string;
};

type Tab = "all" | "leave" | "expense" | "purchase" | "booking";

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "leave", label: "Leave" },
  { key: "expense", label: "Expense" },
  { key: "purchase", label: "Purchase" },
  { key: "booking", label: "Booking" },
];

const typeColors: Record<string, "info" | "warning" | "default" | "secondary"> = {
  leave: "info",
  expense: "warning",
  purchase: "default",
  booking: "secondary",
};

const statusStyles: Record<string, "warning" | "success" | "destructive"> = {
  pending: "warning",
  pending_hod: "warning",
  pending_accounts: "warning",
  pending_purchase: "warning",
  approved: "success",
  rejected: "destructive",
};

function formatAmount(n: number | null): string {
  if (n == null) return "";
  return `₹${n.toLocaleString("en-IN")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [dialog, setDialog] = useState<{
    item: ApprovalItem;
    action: "approve" | "reject";
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/approvals")
      .then((r) => r.json())
      .then((data) => setApprovals(data.approvals || []))
      .catch(() => toast.error("Failed to load approvals"))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    tab === "all"
      ? approvals
      : approvals.filter((a) => a.type === tab);

  const pendingCount = approvals.length;

  async function handleAction() {
    if (!dialog) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: dialog.item.type,
          id: dialog.item.id,
          action: dialog.action,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        toast.success(
          `${dialog.item.type.charAt(0).toUpperCase() + dialog.item.type.slice(1)} ${dialog.action === "approve" ? "approved" : "rejected"}`
        );
        setApprovals((prev) =>
          prev.filter((a) => !(a.id === dialog.item.id && a.type === dialog.item.type))
        );
        setDialog(null);
        setNotes("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          {tabs.map((t) => (
            <div key={t.key} className="h-8 w-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Center</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link
          href="/approvals/delegations"
          className="text-sm text-primary font-medium hover:underline"
        >
          Manage Delegations
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            className="font-medium"
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({approvals.filter((a) => a.type === t.key).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 text-green-500"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-lg font-medium">No pending approvals</p>
          <p className="text-sm mt-1">
            {tab === "all"
              ?               "All caught up! Everything's been reviewed."
              : `No pending ${tab} approvals.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={typeColors[item.type] || "outline"}
                        className="capitalize"
                      >
                        {item.type}
                      </Badge>
                      {item.amount != null && (
                        <span className="text-sm font-semibold">
                          {formatAmount(item.amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{item.submittedBy}</span>
                      <span>{timeAgo(item.submittedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={statusStyles[item.status] || "outline"}
                      className="capitalize"
                    >
                      {item.status === "pending_hod"
                        ? "Pending (HOD)"
                        : item.status === "pending_accounts"
                          ? "Pending (Accounts)"
                          : item.status === "pending_purchase"
                            ? "Pending (Purchase)"
                            : item.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          setDialog({ item, action: "approve" })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setDialog({ item, action: "reject" })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) { setDialog(null); setNotes(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {dialog?.action === "approve" ? "Approve" : "Reject"}{" "}
              {dialog?.item.type}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {dialog?.item.title} &mdash; {dialog?.item.submittedBy}
          </p>
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialog(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={
                dialog?.action === "approve" ? "default" : "destructive"
              }
              disabled={submitting}
              onClick={handleAction}
            >
              {submitting
                ? "Processing..."
                : dialog?.action === "approve"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
