"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Clock, X, FileText } from "lucide-react";
import { toast } from "sonner";

type PurchaseRequest = {
  id: string; requesterId: string; itemName: string; quantity: number; estimatedCost: number;
  justification: string | null; status: string; notes: string | null;
  approvedByHodId: string | null; approvedByAccountsId: string | null;
  approvedByPurchaseId: string | null; requesterName?: string;
  approvedAt: string | null; createdAt: string; updatedAt: string;
};

const statusStyles: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  pending_hod: "warning", pending_accounts: "warning", pending_purchase: "warning",
  approved: "success", rejected: "destructive",
};

const statusLabels: Record<string, string> = {
  pending_hod: "Pending HOD", pending_accounts: "Pending Accounts",
  pending_purchase: "Pending Purchase Officer", approved: "Fully Approved", rejected: "Rejected",
};

const statusTransitions: Record<string, { nextStatus: string; actionLabel: string }> = {
  pending_hod: { nextStatus: "pending_accounts", actionLabel: "Approve & Send to Accounts" },
  pending_accounts: { nextStatus: "pending_purchase", actionLabel: "Approve & Send to Purchase" },
  pending_purchase: { nextStatus: "approved", actionLabel: "Approve & Finalize" },
};

function getSteps(req: PurchaseRequest) {
  const isRejected = req.status === "rejected";
  return [
    { name: "Submission", status: "complete", desc: "Requested by staff" },
    {
      name: "HOD Approval",
      status: req.status === "pending_hod" ? "active" : (req.approvedByHodId || ["pending_accounts", "pending_purchase", "approved"].includes(req.status)) ? "complete" : isRejected && !req.approvedByHodId ? "failed" : "upcoming",
      desc: req.approvedByHodId ? "Approved" : isRejected && !req.approvedByHodId ? "Rejected" : "Pending",
    },
    {
      name: "Accounts Clearance",
      status: req.status === "pending_accounts" ? "active" : (req.approvedByAccountsId || ["pending_purchase", "approved"].includes(req.status)) ? "complete" : isRejected && req.approvedByHodId && !req.approvedByAccountsId ? "failed" : "upcoming",
      desc: req.approvedByAccountsId ? "Approved" : isRejected && req.approvedByHodId && !req.approvedByAccountsId ? "Rejected" : "Pending",
    },
    {
      name: "Purchase Officer",
      status: req.status === "pending_purchase" ? "active" : req.status === "approved" ? "complete" : isRejected && req.approvedByAccountsId ? "failed" : "upcoming",
      desc: req.status === "approved" ? "Approved & Finalized" : isRejected && req.approvedByAccountsId ? "Rejected" : "Pending",
    },
  ];
}

type Props = {
  request: PurchaseRequest | null;
  staffRole?: string;
  onClose: () => void;
  onReviewed: () => void;
};

export function PurchaseDetailDialog({ request, staffRole, onClose, onReviewed }: Props) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const checkUserCanReview = (req: PurchaseRequest): boolean => {
    if (!staffRole) return false;
    if (["super_admin", "admin"].includes(staffRole)) return true;
    if (req.status === "pending_hod" && staffRole === "hod") return true;
    if (req.status === "pending_accounts" && staffRole === "accounts") return true;
    if (req.status === "pending_purchase" && staffRole === "purchase") return true;
    return false;
  };

  const getNextAction = (status: string) => statusTransitions[status] || { nextStatus: "", actionLabel: "Approve" };

  const handleReviewAction = async (action: "approved" | "rejected") => {
    if (!request) return;
    if (action === "rejected" && !reviewNotes.trim()) { toast.error("A comment is required when rejecting requests."); return; }
    setReviewSubmitting(true);
    try {
      const nextStatus = action === "approved" ? getNextAction(request.status).nextStatus : "rejected";
      const res = await fetch(`/api/purchases/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, notes: reviewNotes.trim() || undefined }),
      });
      if (res.ok) {
        toast.success(action === "approved" ? "Approved and advanced to next stage" : "Request rejected");
        onClose(); setReviewNotes(""); onReviewed();
      } else { const data = await res.json(); toast.error(data.error || "Review action failed"); }
    } catch { toast.error("Something went wrong"); }
    finally { setReviewSubmitting(false); }
  };

  const nextAction = request ? getNextAction(request.status) : { actionLabel: "Approve" };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Purchase Request Details</DialogTitle></DialogHeader>
        {request && (
          <div className="space-y-5">
            <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{request.itemName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Quantity: {request.quantity}</p>
                </div>
                <Badge variant={statusStyles[request.status] || "secondary"} className="capitalize">{statusLabels[request.status] || request.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><span className="text-muted-foreground block">Estimated Unit Cost</span><strong className="text-foreground">₹{request.estimatedCost.toLocaleString("en-IN")}</strong></div>
                <div><span className="text-muted-foreground block">Total Estimated Cost</span><strong className="text-foreground">₹{(request.estimatedCost * request.quantity).toLocaleString("en-IN")}</strong></div>
              </div>
              <div className="text-xs border-t pt-2.5">
                <span className="text-muted-foreground block mb-1">Justification:</span>
                <p className="text-foreground leading-relaxed italic">{request.justification || "No justification provided."}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval Timeline</h4>
              <div className="relative pl-6 space-y-4 border-l border-border/80">
                {getSteps(request).map((step, idx) => {
                  const isComplete = step.status === "complete";
                  const isActive = step.status === "active";
                  const isFailed = step.status === "failed";
                  return (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[10px] ${isComplete ? "border-success bg-success text-success-foreground" : isActive ? "border-primary bg-primary text-primary-foreground animate-ping" : isFailed ? "border-destructive bg-destructive text-destructive-foreground" : "border-muted-foreground bg-muted text-muted-foreground"}`}>
                        {isComplete && <Check className="h-2.5 w-2.5" />}
                        {isActive && <Clock className="h-2.5 w-2.5" />}
                        {isFailed && <X className="h-2.5 w-2.5" />}
                      </div>
                      <div className="text-xs font-medium">{step.name}<span className="ml-2 font-normal text-muted-foreground">&middot; {step.desc}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {request.notes && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs border border-border/40">
                <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-1"><FileText className="h-3.5 w-3.5" /> Comments & Notes</span>
                <p className="leading-relaxed">{request.notes}</p>
              </div>
            )}

            {checkUserCanReview(request) && request.status !== "approved" && request.status !== "rejected" && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Review Notes</h4>
                <Textarea placeholder="Provide approval/rejection notes..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} maxLength={500} rows={2} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={reviewSubmitting}>Cancel</Button>
                  <Button type="button" variant="destructive" onClick={() => handleReviewAction("rejected")} disabled={reviewSubmitting}>Reject Request</Button>
                  <Button type="button" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleReviewAction("approved")} disabled={reviewSubmitting}>{nextAction.actionLabel}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
