"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ShoppingBag, 
  Plus, 
  Check, 
  X, 
  Clock, 
  FileText, 
  ChevronRight
} from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";

type PurchaseRequest = {
  id: string;
  requesterId: string;
  itemName: string;
  quantity: number;
  estimatedCost: number;
  justification: string | null;
  status: string; // pending_hod, pending_accounts, pending_purchase, approved, rejected
  approvedByHodId: string | null;
  approvedByAccountsId: string | null;
  approvedByPurchaseId: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  requesterName?: string;
};

const statusStyles: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  pending_hod: "warning",
  pending_accounts: "warning",
  pending_purchase: "warning",
  approved: "success",
  rejected: "destructive",
};

const statusLabels: Record<string, string> = {
  pending_hod: "Pending HOD",
  pending_accounts: "Pending Accounts",
  pending_purchase: "Pending Purchase Officer",
  approved: "Fully Approved",
  rejected: "Rejected",
};

export default function PurchasesPage() {
  const { staff } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseRequest[]>([]); // Admin / Approver view
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  
  // Submit request state
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Review & details state
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Determine if user can approve *any* purchase stage
  const canApprove = staff ? ["super_admin", "admin", "hod", "accounts", "purchase"].includes(staff.role) : false;

  const fetchPurchases = () => {
    setLoading(true);
    const personalPromise = fetch("/api/purchases?viewAll=false")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load personal purchases");
        return r.json();
      })
      .then((data) => setPurchases(ensureArray(data.purchases)))
      .catch((err) => {
        console.error(err);
        toast.error("Could not load your purchase requests");
      });

    const teamPromise = canApprove
      ? fetch("/api/purchases?viewAll=true")
          .then((r) => {
            if (!r.ok) throw new Error("Failed to load team purchases");
            return r.json();
          })
          .then((data) => setAllPurchases(ensureArray(data.purchases)))
          .catch((err) => {
            console.error(err);
            toast.error("Could not load team purchases");
          })
      : Promise.resolve();

    Promise.all([personalPromise, teamPromise]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPurchases();
  }, [canApprove]);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Please enter item name");
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0 || !Number.isInteger(Number(quantity))) {
      toast.error("Quantity must be a positive integer");
      return;
    }
    if (!estimatedCost || isNaN(Number(estimatedCost)) || Number(estimatedCost) < 0) {
      toast.error("Estimated cost must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: itemName.trim(),
          quantity: parseInt(quantity),
          estimatedCost: parseFloat(estimatedCost),
          justification: justification.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Purchase request submitted successfully!");
        setShowForm(false);
        setItemName("");
        setQuantity("1");
        setEstimatedCost("");
        setJustification("");
        fetchPurchases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit purchase request");
      }
    } catch {
      toast.error("An error occurred while submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;
    if (status === "rejected" && !reviewNotes.trim()) {
      toast.error("A comment is required when rejecting requests.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/purchases/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status === "rejected" ? "rejected" : undefined, // API handles auto-transition for approval
          notes: reviewNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Purchase request ${status === "approved" ? "approved to next stage" : "rejected"}`);
        setSelectedRequest(null);
        setReviewNotes("");
        fetchPurchases();
      } else {
        const data = await res.json();
        toast.error(data.error || "Review action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const checkUserCanReviewRequest = (req: PurchaseRequest): boolean => {
    if (!staff) return false;
    if (["super_admin", "admin"].includes(staff.role)) return true;
    
    if (req.status === "pending_hod" && staff.role === "hod") return true;
    if (req.status === "pending_accounts" && staff.role === "accounts") return true;
    if (req.status === "pending_purchase" && staff.role === "purchase") return true;
    
    return false;
  };

  const displayList = activeTab === "my" ? purchases : allPurchases;

  // Visual Stepper configuration for visual approval tracking
  const getSteps = (req: PurchaseRequest) => {
    const isRejected = req.status === "rejected";
    
    return [
      {
        name: "Submission",
        status: "complete",
        desc: "Requested by staff",
      },
      {
        name: "HOD Approval",
        status: req.status === "pending_hod" 
          ? "active" 
          : (req.approvedByHodId || ["pending_accounts", "pending_purchase", "approved"].includes(req.status))
            ? "complete" 
            : isRejected && !req.approvedByHodId ? "failed" : "upcoming",
        desc: req.approvedByHodId ? "Approved" : isRejected && !req.approvedByHodId ? "Rejected" : "Pending",
      },
      {
        name: "Accounts clearance",
        status: req.status === "pending_accounts"
          ? "active"
          : (req.approvedByAccountsId || ["pending_purchase", "approved"].includes(req.status))
            ? "complete"
            : isRejected && req.approvedByHodId && !req.approvedByAccountsId ? "failed" : "upcoming",
        desc: req.approvedByAccountsId ? "Approved" : isRejected && req.approvedByHodId && !req.approvedByAccountsId ? "Rejected" : "Pending",
      },
      {
        name: "Purchase Officer",
        status: req.status === "pending_purchase"
          ? "active"
          : req.status === "approved"
            ? "complete"
            : isRejected && req.approvedByAccountsId ? "failed" : "upcoming",
        desc: req.status === "approved" ? "Approved & Disbursed" : isRejected && req.approvedByAccountsId ? "Rejected" : "Pending",
      },
    ];
  };

  if (loading && purchases.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Purchase Requests"
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        }
      />

      {/* Tabs */}
      {canApprove && (
        <div className="flex gap-2 border-b pb-px">
          <Button
            variant={activeTab === "my" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("my")}
            className="font-medium"
          >
            My Requests
          </Button>
          <Button
            variant={activeTab === "team" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("team")}
            className="font-medium"
          >
            Awaiting My Review ({allPurchases.filter(checkUserCanReviewRequest).length})
          </Button>
        </div>
      )}

      {/* Main List */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {activeTab === "my" ? "Personal Purchase Requests" : "Awaiting Approvals"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayList.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-12 w-12" />}
              title="No purchase requests found"
              description={
                activeTab === "my"
                  ? "Submit a new procurement request to start the approval pipeline."
                  : "Excellent! You have no pending purchase requests to approve."
              }
              action={activeTab === "my" ? { label: "New Request", onClick: () => setShowForm(true) } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {displayList.map((req) => (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setReviewNotes("");
                  }}
                  className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 cursor-pointer transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {req.itemName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &times; {req.quantity}
                      </span>
                      <Badge variant={statusStyles[req.status] || "secondary"} className="capitalize text-[10px] py-0">
                        {statusLabels[req.status] || req.status}
                      </Badge>
                    </div>
                    {req.justification && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {req.justification}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {activeTab === "team" && req.requesterName && (
                        <span>Requester: <strong>{req.requesterName}</strong></span>
                      )}
                      <span>Estimated Cost: <strong>₹{(req.estimatedCost * req.quantity).toLocaleString("en-IN")}</strong></span>
                      <span>Created: {formatDate(req.createdAt)}</span>
                    </div>

                    {/* Quick Stepper inside card */}
                    <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                      {getSteps(req).map((step, idx) => {
                        const isComplete = step.status === "complete";
                        const isActive = step.status === "active";
                        const isFailed = step.status === "failed";
                        return (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                            {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 border font-medium ${
                                isComplete
                                  ? "bg-success/10 border-success/20 text-success"
                                  : isActive
                                    ? "bg-primary/10 border-primary/20 text-primary animate-pulse"
                                    : isFailed
                                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                                      : "bg-muted border-border text-muted-foreground"
                              }`}
                            >
                              {step.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                    {checkUserCanReviewRequest(req) && (
                      <Badge variant="info" className="text-[10px] animate-pulse">
                        Requires Your Action
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Request Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Item Name
              </label>
              <Input
                placeholder="e.g. Dell UltraSharp 27 Monitor"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Est. Unit Cost (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  required
                />
              </div>
            </div>

            {quantity && estimatedCost && !isNaN(Number(quantity)) && !isNaN(Number(estimatedCost)) && (
              <p className="text-xs text-muted-foreground">
                Total Estimated Cost: <strong>₹{(Number(quantity) * Number(estimatedCost)).toLocaleString("en-IN")}</strong>
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Justification
              </label>
              <Textarea
                placeholder="Describe why this item is needed..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                maxLength={500}
                rows={3}
                required
              />
              <p className="text-right text-[10px] text-muted-foreground">
                {justification.length}/500 chars
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details & Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Purchase Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-5">
              {/* Core Details */}
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedRequest.itemName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Quantity: {selectedRequest.quantity}</p>
                  </div>
                  <Badge variant={statusStyles[selectedRequest.status] || "secondary"} className="capitalize">
                    {statusLabels[selectedRequest.status] || selectedRequest.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Estimated Unit Cost</span>
                    <strong className="text-foreground">₹{selectedRequest.estimatedCost.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total Estimated Cost</span>
                    <strong className="text-foreground">₹{(selectedRequest.estimatedCost * selectedRequest.quantity).toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="text-xs border-t pt-2.5">
                  <span className="text-muted-foreground block mb-1">Justification:</span>
                  <p className="text-foreground leading-relaxed italic">{selectedRequest.justification || "No justification provided."}</p>
                </div>
              </div>

              {/* Stepper Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Approval Timeline
                </h4>
                <div className="relative pl-6 space-y-4 border-l border-border/80">
                  {getSteps(selectedRequest).map((step, idx) => {
                    const isComplete = step.status === "complete";
                    const isActive = step.status === "active";
                    const isFailed = step.status === "failed";
                    return (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[10px] ${
                            isComplete
                              ? "border-success bg-success text-success-foreground"
                              : isActive
                                ? "border-primary bg-primary text-primary-foreground animate-ping"
                                : isFailed
                                  ? "border-destructive bg-destructive text-destructive-foreground"
                                  : "border-muted-foreground bg-muted text-muted-foreground"
                          }`}
                        >
                          {isComplete && <Check className="h-2.5 w-2.5" />}
                          {isActive && <Clock className="h-2.5 w-2.5" />}
                          {isFailed && <X className="h-2.5 w-2.5" />}
                        </div>
                        <div className="text-xs font-medium">
                          {step.name}
                          <span className="ml-2 font-normal text-muted-foreground">
                            &middot; {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review notes if any */}
              {selectedRequest.notes && (
                <div className="rounded-lg bg-muted/60 p-3 text-xs border border-border/40">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <FileText className="h-3.5 w-3.5" /> Comments & Notes
                  </span>
                  <p className="leading-relaxed">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Review Controls (Authorized users only) */}
              {checkUserCanReviewRequest(selectedRequest) && selectedRequest.status !== "approved" && selectedRequest.status !== "rejected" && (
                <div className="border-t pt-4 space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Add Review Notes
                  </h4>
                  <Textarea
                    placeholder="Provide approvals/rejection notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    maxLength={500}
                    rows={2}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedRequest(null)}
                      disabled={reviewSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleReviewAction("rejected")}
                      disabled={reviewSubmitting}
                    >
                      Reject Request
                    </Button>
                    <Button
                      type="button"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => handleReviewAction("approved")}
                      disabled={reviewSubmitting}
                    >
                      Approve & Advance
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
