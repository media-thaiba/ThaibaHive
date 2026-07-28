"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, FileText, Image as ImageIcon, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type ExpenseClaim = {
  id: string; staffId: string; amount: number; category: string; description: string;
  receiptUrl: string | null; status: string; reviewNotes: string | null;
  reviewedById: string | null; reviewedAt: string | null;
  createdAt: string; updatedAt: string; staffName?: string;
};

type Props = {
  claim: ExpenseClaim | null;
  onClose: () => void;
  onReviewed: () => void;
};

const statusConfig: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" | "info"; icon: React.ReactNode }> = {
  pending: { label: "Pending HOD", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  pending_hod: { label: "Pending HOD", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  pending_finance: { label: "Pending Finance", variant: "info", icon: <AlertTriangle className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export function ExpenseReviewDialog({ claim, onClose, onReviewed }: Props) {
  const { staff } = useAuth();
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const currentStatus = claim?.status || "pending";
  const statusInfo = statusConfig[currentStatus] || { label: currentStatus, variant: "secondary", icon: <Clock className="h-3 w-3" /> };

  const isHodOrAdmin = staff ? ["super_admin", "admin", "hod"].includes(staff.role) : false;
  const isFinanceOrAdmin = staff ? ["super_admin", "admin", "accounts"].includes(staff.role) : false;

  // Determine allowed actions based on role and current status
  const canHodApprove = isHodOrAdmin && ["pending", "pending_hod"].includes(currentStatus);
  const canFinanceApprove = isFinanceOrAdmin && currentStatus === "pending_finance";
  const canReject = (isHodOrAdmin || isFinanceOrAdmin) && ["pending", "pending_hod", "pending_finance"].includes(currentStatus);

  const handleReviewAction = async (newStatus: "approved" | "rejected" | "pending_finance") => {
    if (!claim) return;
    if (newStatus === "rejected" && !reviewNotes.trim()) { toast.error("A review note is required when rejecting claims."); return; }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/expense-claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reviewNotes: reviewNotes.trim() || undefined }),
      });
      if (res.ok) {
        toast.success(`Expense claim ${newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "forwarded to Finance"}`);
        onClose(); setReviewNotes(""); onReviewed();
      } else { const data = await res.json(); toast.error(data.error || "Review action failed"); }
    } catch { toast.error("Something went wrong"); }
    finally { setReviewSubmitting(false); }
  };

  const isPdf = claim?.receiptUrl?.toLowerCase().endsWith(".pdf");

  if (!claim) return null;

  return (
    <Dialog open={!!claim} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="text-base">Review Expense Claim</DialogTitle>
            <Badge variant={statusInfo.variant} className="gap-1">{statusInfo.icon} {statusInfo.label}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Category: {claim.category}</span>
              <span>Date: {formatDate(claim.createdAt)}</span>
            </div>
            <div className="text-lg font-bold text-foreground">Amount: ₹{claim.amount.toLocaleString("en-IN")}</div>
            <p className="text-sm text-foreground/90">{claim.description}</p>
            {claim.staffName && <p className="text-xs text-muted-foreground">Submitted by: {claim.staffName}</p>}

            {claim.receiptUrl && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    {isPdf ? <FileText className="h-3.5 w-3.5 text-indigo-400" /> : <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />}
                    Receipt Attachment Preview
                  </span>
                  <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
                    Open Full Size <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="rounded-md border overflow-hidden bg-slate-950 flex items-center justify-center p-2">
                  {isPdf ? (
                    <iframe src={claim.receiptUrl} className="w-full h-48 border-0" title="Receipt PDF Preview" />
                  ) : (
                    <img src={claim.receiptUrl} alt="Receipt Attachment" className="max-h-56 object-contain rounded" />
                  )}
                </div>
              </div>
            )}

            {claim.reviewNotes && (
              <div className="rounded-md bg-muted/60 p-3 text-xs border border-border/40">
                <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="h-3.5 w-3.5" /> Previous Review Comment
                </span>
                <p className="leading-relaxed">{claim.reviewNotes}</p>
              </div>
            )}
          </div>

          {canHodApprove || canFinanceApprove || canReject ? (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Review Notes</label>
                <Textarea
                  placeholder={canReject ? "Enter comments (required for rejection)..." : "Enter comments (optional)..."}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={reviewSubmitting}>Cancel</Button>
                {canReject && (
                  <Button type="button" variant="destructive" onClick={() => handleReviewAction("rejected")} disabled={reviewSubmitting}>
                    Reject
                  </Button>
                )}
                {canHodApprove && (
                  <Button type="button" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleReviewAction("pending_finance")} disabled={reviewSubmitting}>
                    Forward to Finance
                  </Button>
                )}
                {canFinanceApprove && (
                  <Button type="button" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleReviewAction("approved")} disabled={reviewSubmitting}>
                    Approve & Pay
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              {["approved", "rejected"].includes(currentStatus)
                ? `This claim has been ${currentStatus === "approved" ? "approved and paid" : "rejected"}.`
                : "You don't have permission to review this claim at this stage."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
