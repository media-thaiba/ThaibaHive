"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";
import { toast } from "sonner";

type DailyReportTask = {
  taskId: string | null;
  description: string;
  hoursSpent: number;
  status: string;
};

type DailyReport = {
  id: string;
  staffId: string;
  date: string;
  summary: string | null;
  status: string;
  reviewerComment: string | null;
  firstName?: string;
  lastName?: string;
};

const statusStyles: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  submitted: "warning",
  reviewed: "success",
  rejected: "destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting Review",
  reviewed: "Reviewed",
  rejected: "Rejected",
};

type Props = {
  report: DailyReport | null;
  isHodOrAdmin: boolean;
  currentStaffId?: string;
  onClose: () => void;
  onReviewed: () => void;
};

export function ReportDetailDialog({ report, isHodOrAdmin, currentStaffId, onClose, onReviewed }: Props) {
  const [tasks, setTasks] = useState<DailyReportTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (!report) return;
    setTasks([]);
    setLoading(true);
    fetch(`/api/reports/${report.id}`)
      .then((r) => r.ok ? r.json() : { tasks: [] })
      .then((data) => setTasks(ensureArray(data.tasks)))
      .catch(() => toast.error("Failed to load report details"))
      .finally(() => setLoading(false));
  }, [report]);

  const handleReviewAction = async (status: "reviewed" | "rejected") => {
    if (!report) return;
    if (status === "rejected" && !reviewNotes.trim()) {
      toast.error("A comment is required when rejecting daily reports.");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewerComment: reviewNotes.trim() || undefined }),
      });
      if (res.ok) {
        toast.success(`Report marked as ${status === "reviewed" ? "reviewed" : "rejected"}`);
        onClose();
        setReviewNotes("");
        onReviewed();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit review");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setReviewSubmitting(false); }
  };

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daily Activity Log Details</DialogTitle>
        </DialogHeader>
        {report && (
          <div className="space-y-5">
            <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Log for {formatDate(report.date)}</h3>
                  {report.firstName && (
                    <p className="text-xs text-muted-foreground mt-0.5">Submitted by: {report.firstName} {report.lastName}</p>
                  )}
                </div>
                <Badge variant={statusStyles[report.status] || "secondary"} className="capitalize">
                  {statusLabels[report.status] || report.status}
                </Badge>
              </div>
              <div className="text-xs border-t pt-2.5">
                <span className="text-muted-foreground block mb-1">Daily Summary:</span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{report.summary || "No summary provided."}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks Breakdown</h4>
              {loading ? (
                <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-2 bg-muted/10 rounded-lg">
                  No individual task logs linked to this report.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t, idx) => (
                    <div key={idx} className="rounded-lg border p-3 text-xs bg-muted/5 space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground">{t.description}</span>
                        <span className="text-primary shrink-0">{t.hoursSpent} hr{t.hoursSpent !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Task Link: {t.taskId ? "Yes" : "General Work"}</span>
                        <span className="capitalize font-medium">Status: {t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {report.reviewerComment && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs border border-border/40">
                <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="h-3.5 w-3.5" /> Review Comment
                </span>
                <p className="leading-relaxed">{report.reviewerComment}</p>
              </div>
            )}

            {isHodOrAdmin && report.status === "submitted" && report.staffId !== currentStaffId && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add HOD Review Comments</h4>
                <Textarea
                  placeholder="Enter review comments (required for rejection)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={reviewSubmitting}>Cancel</Button>
                  <Button type="button" variant="destructive" onClick={() => handleReviewAction("rejected")} disabled={reviewSubmitting}>
                    Reject Log
                  </Button>
                  <Button type="button" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleReviewAction("reviewed")} disabled={reviewSubmitting}>
                    Mark Reviewed
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
