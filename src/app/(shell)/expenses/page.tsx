"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  DollarSign, 
  Plus, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink 
} from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";

type ExpenseClaim = {
  id: string;
  staffId: string;
  amount: number;
  category: string;
  description: string;
  receiptUrl: string | null;
  status: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  staffName?: string;
};

const statusStyles: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const categories = [
  "Travel & Transport",
  "Food & Meals",
  "Office Supplies",
  "Utilities & Bills",
  "Hardware & Equipment",
  "Software & Subscriptions",
  "Others",
];

export default function ExpensesPage() {
  const { staff } = useAuth();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [allClaims, setAllClaims] = useState<ExpenseClaim[]>([]); // For HOD / Admin view
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  
  // Submit claim state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Review status dialog state
  const [reviewItem, setReviewItem] = useState<ExpenseClaim | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const canApprove = staff ? ["super_admin", "admin", "hod"].includes(staff.role) : false;

  const fetchClaims = () => {
    setLoading(true);
    const personalPromise = fetch("/api/expense-claims?viewAll=false")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load personal claims");
        return r.json();
      })
      .then((data) => setClaims(ensureArray(data.claims)))
      .catch((err) => {
        console.error(err);
        toast.error("Could not load your expense claims");
      });

    const teamPromise = canApprove
      ? fetch("/api/expense-claims?viewAll=true")
          .then((r) => {
            if (!r.ok) throw new Error("Failed to load team claims");
            return r.json();
          })
          .then((data) => setAllClaims(ensureArray(data.claims)))
          .catch((err) => {
            console.error(err);
            toast.error("Could not load team claims");
          })
      : Promise.resolve();

    Promise.all([personalPromise, teamPromise]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClaims();
  }, [canApprove]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Receipt size exceeds limit of 10MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptUrl(data.url);
        toast.success("Receipt uploaded successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to upload receipt");
      }
    } catch {
      toast.error("An error occurred during file upload");
    } finally {
      setUploading(false);
    }
  };

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          description: description.trim(),
          receiptUrl: receiptUrl || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Expense claim submitted successfully!");
        setShowForm(false);
        setAmount("");
        setCategory(categories[0]);
        setDescription("");
        setReceiptUrl("");
        fetchClaims();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit claim");
      }
    } catch {
      toast.error("An error occurred while submitting claim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!reviewItem) return;
    if (status === "rejected" && !reviewNotes.trim()) {
      toast.error("A review note is required when rejecting claims.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/expense-claims/${reviewItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Expense claim ${status === "approved" ? "approved" : "rejected"}`);
        setReviewItem(null);
        setReviewNotes("");
        fetchClaims();
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

  const myTotals = claims.reduce(
    (acc, curr) => {
      acc.total += curr.amount;
      if (curr.status === "approved") acc.approved += curr.amount;
      if (curr.status === "pending") acc.pending += curr.amount;
      return acc;
    },
    { total: 0, approved: 0, pending: 0 }
  );

  const displayList = activeTab === "my" ? claims : allClaims;

  if (loading && claims.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Expense Claims"
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Submit Claim
          </Button>
        }
      />

      {/* Tabs for HOD / Admins */}
      {canApprove && (
        <div className="flex gap-2 border-b pb-px">
          <Button
            variant={activeTab === "my" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("my")}
            className="font-medium"
          >
            My Claims
          </Button>
          <Button
            variant={activeTab === "team" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("team")}
            className="font-medium"
          >
            Pending Approvals ({allClaims.filter((c) => c.status === "pending").length})
          </Button>
        </div>
      )}

      {activeTab === "my" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Submitted
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">₹{myTotals.total.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across all submitted claims</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reimbursed / Approved
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-success">
                ₹{myTotals.approved.toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reimbursements approved</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Approval
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-warning">
                ₹{myTotals.pending.toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Currently under HOD review</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main List */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {activeTab === "my" ? "Claim Ledger" : "Pending Team Claims"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayList.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="h-12 w-12" />}
              title="No expense claims found"
              description={
                activeTab === "my"
                  ? "Submit your bills and receipts to claim reimbursement."
                  : "You're all caught up! No claims are waiting for review."
              }
              action={activeTab === "my" ? { label: "Submit Claim", onClick: () => setShowForm(true) } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {displayList.map((claim) => (
                <div
                  key={claim.id}
                  className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        ₹{claim.amount.toLocaleString("en-IN")}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {claim.category}
                      </Badge>
                      <Badge variant={statusStyles[claim.status] || "secondary"} className="capitalize text-[10px] py-0">
                        {claim.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{claim.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {activeTab === "team" && claim.staffName && (
                        <span>Submitted by: <strong>{claim.staffName}</strong></span>
                      )}
                      <span>Date: {formatDate(claim.createdAt)}</span>
                      {claim.receiptUrl && (
                        <a
                          href={claim.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          View Receipt <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Review Notes */}
                    {claim.reviewNotes && (
                      <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs border border-border/40">
                        <span className="font-semibold text-muted-foreground">Reviewer Note: </span>
                        <span>{claim.reviewNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Controls for Admins */}
                  {activeTab === "team" && claim.status === "pending" && (
                    <div className="flex gap-2 self-end shrink-0 md:self-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewItem(claim);
                          setReviewNotes("");
                        }}
                      >
                        Review Claim
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Claim Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Expense Claim</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitClaim} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Claim Amount (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description / Justification
              </label>
              <Textarea
                placeholder="Provide detail on why this expense was incurred..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                required
              />
              <p className="text-right text-[10px] text-muted-foreground">
                {description.length}/500 chars
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attach Receipt
              </label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 relative overflow-hidden"
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading..." : "Upload File"}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                    disabled={uploading}
                  />
                </Button>
                {receiptUrl ? (
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Receipt Attached
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> No file uploaded (Max 10MB)
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || uploading}>
                {submitting ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(open) => !open && setReviewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Expense Claim</DialogTitle>
          </DialogHeader>
          {reviewItem && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Category: {reviewItem.category}</span>
                  <span>Date: {formatDate(reviewItem.createdAt)}</span>
                </div>
                <div className="text-base font-bold text-foreground">
                  Amount: ₹{reviewItem.amount.toLocaleString("en-IN")}
                </div>
                <p className="text-sm">{reviewItem.description}</p>
                {reviewItem.receiptUrl && (
                  <a
                    href={reviewItem.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline mt-1"
                  >
                    View Receipt Attachment <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Review Notes
                </label>
                <Textarea
                  placeholder="Enter comments (required for rejection, optional for approval)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewItem(null)}
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
                  Reject
                </Button>
                <Button
                  type="button"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => handleReviewAction("approved")}
                  disabled={reviewSubmitting}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
