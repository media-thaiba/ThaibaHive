"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Wallet, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { ensureArray } from "@/lib/utils";
import { PurchaseList } from "@/components/purchases/purchase-list";
import { PurchaseFormDialog } from "@/components/purchases/purchase-form-dialog";
import { PurchaseDetailDialog } from "@/components/purchases/purchase-detail-dialog";

type PurchaseRequest = {
  id: string; requesterId: string; itemName: string; quantity: number; estimatedCost: number;
  justification: string | null; status: string; notes: string | null;
  approvedByHodId: string | null; approvedByAccountsId: string | null; approvedByPurchaseId: string | null;
  approvedAt: string | null; createdAt: string; updatedAt: string; requesterName?: string;
};

type BudgetSummary = {
  totalAllocated: number;
  totalSpent: number;
  totalPending: number;
  remaining: number;
};

export default function PurchasesPage() {
  const { staff } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(true);

  const canApprove = staff ? ["super_admin", "admin", "hod", "accounts", "purchase"].includes(staff.role) : false;

  const fetchPurchases = useCallback(() => {
    setLoading(true);
    const personalPromise = fetch("/api/purchases?viewAll=false")
      .then((r) => r.ok ? r.json() : { purchases: [] })
      .then((data) => setPurchases(ensureArray(data.purchases)))
      .catch(() => toast.error("Could not load your purchase requests"));

    const teamPromise = canApprove
      ? fetch("/api/purchases?viewAll=true").then((r) => r.ok ? r.json() : { purchases: [] }).then((data) => setAllPurchases(ensureArray(data.purchases))).catch(() => toast.error("Could not load team purchases"))
      : Promise.resolve();

    Promise.all([personalPromise, teamPromise]).finally(() => setLoading(false));
  }, [canApprove]);

  const fetchBudget = useCallback(async () => {
    try {
      const res = await fetch("/api/purchases/budget");
      if (res.ok) {
        const data = await res.json();
        setBudget(data.budget);
      }
    } catch {
      // Silently fail budget fetch
    } finally {
      setBudgetLoading(false);
    }
  }, []);

  useEffect(() => { fetchPurchases(); fetchBudget(); }, [fetchPurchases, fetchBudget]);

  const getStatusBadge = (status: string) => {
    const badgeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
      pending_hod: { label: "Pending HOD", variant: "warning" },
      pending_accounts: { label: "Pending Accounts", variant: "warning" },
      pending_purchase: { label: "Pending Purchase Manager", variant: "info" },
      approved: { label: "Approved", variant: "success" },
      rejected: { label: "Rejected", variant: "destructive" },
    };
    const config = badgeMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant} className="capitalize text-xs">{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  if (loading && purchases.length === 0) {
    return <div className="flex-1 space-y-4 p-6 lg:p-8"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-full" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader title="Purchase Requests" actions={<Button onClick={() => setShowForm(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Request</Button>} />

      {!budgetLoading && budget && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Remaining Campus Budget</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Allocated</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(budget.totalAllocated)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Spent (Approved)</p>
              <p className="text-2xl font-bold text-destructive flex items-center gap-1"><ArrowDown className="h-4 w-4" />{formatCurrency(budget.totalSpent)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Approval</p>
              <p className="text-2xl font-bold text-warning flex items-center gap-1"><ArrowUp className="h-4 w-4" />{formatCurrency(budget.totalPending)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining</p>
              <p className="text-2xl font-bold text-success flex items-center gap-1"><Minus className="h-4 w-4" />{formatCurrency(budget.remaining)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {budgetLoading && (
        <Card>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
          </CardContent>
        </Card>
      )}

      {canApprove && (
        <div className="flex gap-2 border-b pb-px">
          <Button variant={activeTab === "my" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("my")} className="font-medium">My Requests</Button>
          <Button variant={activeTab === "team" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("team")} className="font-medium">
            Awaiting My Review ({allPurchases.filter((req) => {
              if (!staff) return false;
              if (["super_admin", "admin"].includes(staff.role)) return true;
              if (req.status === "pending_hod" && staff.role === "hod") return true;
              if (req.status === "pending_accounts" && staff.role === "accounts") return true;
              if (req.status === "pending_purchase" && staff.role === "purchase") return true;
              return false;
            }).length})
          </Button>
        </div>
      )}

      <PurchaseList
        purchases={purchases} allPurchases={allPurchases} activeTab={activeTab}
        canApprove={canApprove} staffRole={staff?.role} onSelect={setSelectedRequest}
        getStatusBadge={getStatusBadge}
      />

      <PurchaseFormDialog open={showForm} onOpenChange={setShowForm} onSubmitted={fetchPurchases} />
      <PurchaseDetailDialog request={selectedRequest} staffRole={staff?.role} onClose={() => setSelectedRequest(null)} onReviewed={fetchPurchases} />
    </div>
  );
}
