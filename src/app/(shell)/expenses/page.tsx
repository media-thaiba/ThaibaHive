"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import { ensureArray } from "@/lib/utils";
import { ExpenseSummaryCards } from "@/components/expenses/expense-summary-cards";
import { ExpenseClaimList } from "@/components/expenses/expense-claim-list";
import { ExpenseClaimFormDialog } from "@/components/expenses/expense-claim-form-dialog";
import { ExpenseReviewDialog } from "@/components/expenses/expense-review-dialog";

type ExpenseClaim = {
  id: string; staffId: string; amount: number; category: string; description: string;
  receiptUrl: string | null; status: string; reviewedById: string | null;
  reviewedAt: string | null; reviewNotes: string | null; createdAt: string; updatedAt: string;
  staffName?: string;
};

export default function ExpensesPage() {
  const { staff } = useAuth();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [allClaims, setAllClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  const [reviewItem, setReviewItem] = useState<ExpenseClaim | null>(null);

  const canApprove = staff ? ["super_admin", "admin", "hod", "accounts"].includes(staff.role) : false;

  const fetchClaims = useCallback(() => {
    setLoading(true);
    const personalPromise = fetch("/api/expense-claims?viewAll=false")
      .then((r) => r.ok ? r.json() : { claims: [] })
      .then((data) => setClaims(ensureArray(data.claims)))
      .catch(() => toast.error("Could not load your expense claims"));

    const teamPromise = canApprove
      ? fetch("/api/expense-claims?viewAll=true").then((r) => r.ok ? r.json() : { claims: [] }).then((data) => setAllClaims(ensureArray(data.claims))).catch(() => toast.error("Could not load team claims"))
      : Promise.resolve();

    Promise.all([personalPromise, teamPromise]).finally(() => setLoading(false));
  }, [canApprove]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const myTotals = claims.reduce((acc, curr) => {
    acc.total += curr.amount;
    if (curr.status === "approved") acc.approved += curr.amount;
    if (["pending", "pending_hod", "pending_finance"].includes(curr.status)) acc.pending += curr.amount;
    return acc;
  }, { total: 0, approved: 0, pending: 0 });

  if (loading && claims.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Expense Claims"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.open("/api/export?type=expenses", "_blank")} className="gap-1.5"><Download className="h-4 w-4" /> Export CSV</Button>
            <Button onClick={() => setShowForm(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Submit Claim</Button>
          </div>
        }
      />

      {canApprove && (
        <div className="flex gap-2 border-b pb-px">
          <Button variant={activeTab === "my" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("my")} className="font-medium">My Claims</Button>
          <Button variant={activeTab === "team" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("team")} className="font-medium">
            Pending Approvals ({allClaims.filter((c) => ["pending", "pending_hod", "pending_finance"].includes(c.status)).length})
          </Button>
        </div>
      )}

      {activeTab === "my" && <ExpenseSummaryCards {...myTotals} />}

      <ExpenseClaimList claims={activeTab === "my" ? claims : allClaims} activeTab={activeTab} onReviewClaim={(claim) => { setReviewItem(claim); }} />

      <ExpenseClaimFormDialog open={showForm} onOpenChange={setShowForm} onSubmitted={fetchClaims} />
      <ExpenseReviewDialog claim={reviewItem} onClose={() => setReviewItem(null)} onReviewed={fetchClaims} />
    </div>
  );
}
