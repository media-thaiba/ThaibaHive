"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import { ensureArray } from "@/lib/utils";
import { AccountsFilterBar } from "@/components/accounts/accounts-filter-bar";
import { AccountsSummaryCards } from "@/components/accounts/accounts-summary-cards";
import { AccountsLedger } from "@/components/accounts/accounts-ledger";
import { AccountsTaxPanel } from "@/components/accounts/accounts-tax-panel";
import { useAccountsStore } from "@/stores";

const TransactionFormDialog = dynamic(
  () => import("@/components/accounts/transaction-form-dialog").then((m) => m.TransactionFormDialog),
  { ssr: false }
);
const ExportDialog = dynamic(
  () => import("@/components/export-dialog").then((m) => m.ExportDialog),
  { ssr: false }
);

type Transaction = {
  id: string; institutionId: string; type: string; category: string; amount: number;
  description: string | null; transactionDate: string; recordedByName: string | null;
  recordedByLastName: string | null; institutionName: string | null; notes: string | null; createdAt: string;
};

type Institution = { id: string; name: string };

export const _ledgerCategories = {
  income: ["Tuition Fees", "Grants & Donations", "Canteen Sales", "Event Revenue", "Other Revenue"],
  expense: ["Salaries & Wages", "Maintenance & Repairs", "Canteen Purchase", "Utilities", "Teaching Supplies", "Others"],
};

export default function AccountsPage() {
  const { staff } = useAuth();
  const isAuthorized = staff ? ["super_admin", "admin", "principal", "hod"].includes(staff.role) : false;
  const isWriter = staff ? ["super_admin", "admin"].includes(staff.role) : false;

  const {
    selectedInst,
    setSelectedInst,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    showAddForm,
    setShowAddForm,
    showExportModal,
    setShowExportModal,
    taxRatePercent,
    setTaxRatePercent,
    taxCategoryOverrides,
    setTaxCategoryOverrides,
  } = useAccountsStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0 });

  const fetchInstitutions = () => {
    fetch("/api/institutions")
      .then((r) => r.json())
      .then((data) => { const list = ensureArray<Institution>(data.institutions); setInstitutions(list); })
      .catch(() => toast.error("Failed to load institutions list"));
  };

  const fetchLedgerAndSummary = useCallback(() => {
    setLoading(true);
    const qp = new URLSearchParams();
    if (selectedInst) qp.append("institutionId", selectedInst);
    if (fromDate) qp.append("from", fromDate);
    if (toDate) qp.append("to", toDate);
    const qs = qp.toString();

    Promise.all([
      fetch(`/api/accounts?${qs}`).then((r) => r.ok ? r.json() : { transactions: [] }).then((d) => setTransactions(ensureArray(d.transactions))).catch(() => toast.error("Failed to retrieve transaction ledger")),
      fetch(`/api/accounts/summary?${qs}`).then((r) => r.ok ? r.json() : { totalIncome: 0, totalExpense: 0, netBalance: 0 }).then((d) => setSummaryData({ totalIncome: d.totalIncome || 0, totalExpense: d.totalExpense || 0, netBalance: d.netBalance || 0 })).catch(() => toast.error("Failed to retrieve ledger summary")),
    ]).finally(() => setLoading(false));
  }, [selectedInst, fromDate, toDate]);

  useEffect(() => {
    if (isAuthorized) { fetchInstitutions(); fetchLedgerAndSummary(); }
    else { setLoading(false); }
  }, [isAuthorized, fetchLedgerAndSummary]);

  const deleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction entry? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Transaction deleted successfully"); fetchLedgerAndSummary(); }
      else { toast.error("Failed to delete transaction entry"); }
    } catch { toast.error("Something went wrong during deletion"); }
  };

  const getTaxCalculations = () => {
    const defaultRate = parseFloat(taxRatePercent) || 0;
    let calculatedTaxOnIncome = 0, calculatedTaxOnExpense = 0;
    transactions.forEach(tx => {
      const rate = taxCategoryOverrides[tx.category] ?? defaultRate;
      const taxAmount = (tx.amount * rate) / 100;
      if (tx.type === "income") calculatedTaxOnIncome += taxAmount;
      else calculatedTaxOnExpense += taxAmount;
    });
    return { calculatedTaxOnIncome, calculatedTaxOnExpense, netTaxLiability: calculatedTaxOnIncome - calculatedTaxOnExpense };
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex-1 p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 text-center">
          <CardHeader className="flex flex-col items-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <CardTitle className="text-lg font-bold text-destructive">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You do not have the necessary accounting permissions to view institutional financial metrics.
              Please contact the Finance &amp; IT Administrator if you require access.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/"}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Institutional Financials"
        actions={isWriter ? <Button onClick={() => setShowAddForm(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Record Transaction</Button> : undefined}
      />

      <AccountsFilterBar
        institutions={institutions} selectedInst={selectedInst} fromDate={fromDate} toDate={toDate}
        onInstChange={setSelectedInst} onFromChange={setFromDate} onToChange={setToDate}
        onApply={fetchLedgerAndSummary}
        onExport={() => setShowExportModal(true)}
      />

      <ExportDialog
        open={showExportModal}
        onOpenChange={setShowExportModal}
        type="accounts"
        defaultParams={{ institutionId: selectedInst, from: fromDate, to: toDate }}
      />

      <AccountsSummaryCards
        totalIncome={summaryData.totalIncome}
        totalExpense={summaryData.totalExpense}
        netBalance={summaryData.netBalance}
      />

      <AccountsTaxPanel
        taxRatePercent={taxRatePercent}
        taxCategoryOverrides={taxCategoryOverrides}
        transactions={transactions}
        onRateChange={setTaxRatePercent}
        onOverrideChange={(cat: string, rate: number) => {
          setTaxCategoryOverrides(prev => ({ ...prev, [cat]: rate }));
        }}
        onResetOverrides={() => setTaxCategoryOverrides({})}
        taxCalcs={getTaxCalculations()}
      />

      <AccountsLedger
        transactions={transactions}
        isWriter={isWriter}
        onDelete={deleteTransaction}
      />

      <TransactionFormDialog
        open={showAddForm}
        onOpenChange={setShowAddForm}
        institutions={institutions}
        onRecorded={fetchLedgerAndSummary}
      />
    </div>
  );
}
