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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Trash2,
  FileText,
  Filter,
  Download,
  AlertTriangle,
  Percent,
  RefreshCw,
} from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";

type Transaction = {
  id: string;
  institutionId: string;
  type: string; // income, expense
  category: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  recordedByName: string | null;
  recordedByLastName: string | null;
  institutionName: string | null;
  notes: string | null;
  createdAt: string;
};

type Institution = { id: string; name: string };

const ledgerCategories = {
  income: ["Tuition Fees", "Grants & Donations", "Canteen Sales", "Event Revenue", "Other Revenue"],
  expense: ["Salaries & Wages", "Maintenance & Repairs", "Canteen Purchase", "Utilities", "Teaching Supplies", "Others"],
};

export default function AccountsPage() {
  const { staff } = useAuth();
  
  // Access check
  const isAuthorized = staff ? ["super_admin", "admin", "principal", "hod"].includes(staff.role) : false;
  const isWriter = staff ? ["super_admin", "admin"].includes(staff.role) : false;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });

  // Filters state
  const [selectedInst, setSelectedInst] = useState("");
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);

  // Dialog state
  const [showAddForm, setShowAddForm] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txInstId, setTxInstId] = useState("");
  const [txCategory, setTxCategory] = useState(ledgerCategories.income[0]);
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(today.toISOString().split("T")[0]);
  const [txDesc, setTxDesc] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Tax rate override state
  const [taxRatePercent, setTaxRatePercent] = useState("18"); // default 18%
  const [taxCategoryOverrides, setTaxCategoryOverrides] = useState<Record<string, number>>({});

  const fetchInstitutions = () => {
    fetch("/api/institutions")
      .then((r) => r.json())
      .then((data) => {
        const list = ensureArray<Institution>(data.institutions);
        setInstitutions(list);
        if (list.length > 0) setTxInstId(list[0].id);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load institutions list");
      });
  };

  const fetchLedgerAndSummary = () => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (selectedInst) queryParams.append("institutionId", selectedInst);
    if (fromDate) queryParams.append("from", fromDate);
    if (toDate) queryParams.append("to", toDate);

    const ledgerPromise = fetch(`/api/accounts?${queryParams.toString()}`)
      .then((r) => r.ok ? r.json() : { transactions: [] })
      .then((data) => setTransactions(ensureArray(data.transactions)))
      .catch((err) => {
        console.error(err);
        toast.error("Failed to retrieve transaction ledger");
      });

    const summaryPromise = fetch(`/api/accounts/summary?${queryParams.toString()}`)
      .then((r) => r.ok ? r.json() : { totalIncome: 0, totalExpense: 0, netBalance: 0 })
      .then((data) => setSummaryData({
        totalIncome: data.totalIncome || 0,
        totalExpense: data.totalExpense || 0,
        netBalance: data.netBalance || 0,
      }))
      .catch((err) => {
        console.error(err);
        toast.error("Failed to retrieve ledger summary");
      });

    Promise.all([ledgerPromise, summaryPromise]).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchInstitutions();
      fetchLedgerAndSummary();
    } else {
      setLoading(false);
    }
  }, [isAuthorized]);

  // Refetch when filters change
  const handleApplyFilters = () => {
    fetchLedgerAndSummary();
  };

  // Dynamic category reset when switching type
  useEffect(() => {
    setTxCategory(ledgerCategories[txType][0]);
  }, [txType]);

  const recordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txInstId) {
      toast.error("Please select an institution");
      return;
    }
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      toast.error("Amount must be a positive decimal number");
      return;
    }
    if (!txDate) {
      toast.error("Please select transaction date");
      return;
    }

    setTxSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: txInstId,
          type: txType,
          category: txCategory,
          amount: parseFloat(txAmount),
          description: txDesc.trim() || undefined,
          transactionDate: txDate,
          notes: txNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Transaction recorded successfully!");
        setShowAddForm(false);
        setTxAmount("");
        setTxDesc("");
        setTxNotes("");
        setTxDate(today.toISOString().split("T")[0]);
        fetchLedgerAndSummary();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to record transaction");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setTxSubmitting(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction entry? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Transaction deleted successfully");
        fetchLedgerAndSummary();
      } else {
        toast.error("Failed to delete transaction entry");
      }
    } catch {
      toast.error("Something went wrong during deletion");
    }
  };

  const triggerExport = () => {
    const queryParams = new URLSearchParams({ type: "accounts" });
    if (selectedInst) queryParams.append("institutionId", selectedInst);
    if (fromDate) queryParams.append("dateFrom", fromDate);
    if (toDate) queryParams.append("dateTo", toDate);

    window.location.href = `/api/export?${queryParams.toString()}`;
  };

  // Tax calculations based on overrides configuration
  const handleTaxOverrideChange = (category: string, rate: number) => {
    setTaxCategoryOverrides(prev => ({
      ...prev,
      [category]: rate
    }));
  };

  const getTaxCalculations = () => {
    const defaultRate = parseFloat(taxRatePercent) || 0;
    
    let totalTaxableIncome = 0;
    let totalTaxableExpense = 0;
    let calculatedTaxOnIncome = 0;
    let calculatedTaxOnExpense = 0;

    transactions.forEach(tx => {
      const rateOverride = taxCategoryOverrides[tx.category];
      const activeRate = rateOverride !== undefined ? rateOverride : defaultRate;
      
      const taxAmount = (tx.amount * activeRate) / 100;

      if (tx.type === "income") {
        totalTaxableIncome += tx.amount;
        calculatedTaxOnIncome += taxAmount;
      } else {
        totalTaxableExpense += tx.amount;
        calculatedTaxOnExpense += taxAmount;
      }
    });

    return {
      totalTaxableIncome,
      totalTaxableExpense,
      calculatedTaxOnIncome,
      calculatedTaxOnExpense,
      netTaxLiability: calculatedTaxOnIncome - calculatedTaxOnExpense,
    };
  };

  const taxCalcs = getTaxCalculations();

  if (loading && transactions.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Handle unauthorized users
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
              Please contact the Finance & IT Administrator if you require access.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Institutional Financials"
        actions={
          isWriter ? (
            <Button onClick={() => setShowAddForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Record Transaction
            </Button>
          ) : undefined
        }
      />

      {/* Filter and Export Bar */}
      <Card className="hover:shadow-xs transition-shadow">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 min-w-[200px] flex-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Institution</label>
            <Select value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)}>
              <option value="">All Institutions</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">From Date</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">To Date</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleApplyFilters} className="gap-1.5">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" onClick={triggerExport} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-xs transition-shadow border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue / Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">
              ₹{summaryData.totalIncome.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sum of institutional receipts</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-xs transition-shadow border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Operational Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              ₹{summaryData.totalExpense.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sum of institutional disbursements</p>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-xs transition-shadow border-l-4 ${summaryData.netBalance >= 0 ? "border-l-primary" : "border-l-warning"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Balance
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${summaryData.netBalance >= 0 ? "text-primary" : "text-warning"}`}>
              ₹{summaryData.netBalance.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Net operating margin surplus</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Ledger list */}
        <Card className="lg:col-span-2 animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Transaction Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No transactions logged"
                description="Use the record button above to add new income or expenses."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Institution</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">By</th>
                      {isWriter && <th className="p-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-medium whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                        <td className="p-3 font-medium text-muted-foreground">{tx.institutionName || "\u2014"}</td>
                        <td className="p-3">
                          <div className="font-semibold">{tx.category}</div>
                          {tx.description && <div className="text-[10px] text-muted-foreground line-clamp-1">{tx.description}</div>}
                        </td>
                        <td className="p-3">
                          <Badge variant={tx.type === "income" ? "success" : "destructive"} className="text-[9px] px-1.5 py-0 uppercase">
                            {tx.type}
                          </Badge>
                        </td>
                        <td className={`p-3 text-right font-bold ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                          ₹{tx.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {tx.recordedByName ? `${tx.recordedByName} ${tx.recordedByLastName?.charAt(0)}.` : "\u2014"}
                        </td>
                        {isWriter && (
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => deleteTransaction(tx.id)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Override Panel */}
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-base font-semibold">Tax rate override</CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Base GST/Tax Rate (%)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                />
                <Button variant="outline" size="sm" onClick={() => setTaxCategoryOverrides({})} title="Reset category overrides">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground">GST Category Overrides</h4>
              <div className="space-y-2 text-xs">
                {ledgerCategories.income.concat(ledgerCategories.expense).map(cat => {
                  const currentOverride = taxCategoryOverrides[cat];
                  const hasTx = transactions.some(t => t.category === cat);
                  if (!hasTx) return null; // Only show overrides for active categories in current dataset
                  
                  return (
                    <div key={cat} className="flex justify-between items-center gap-2">
                      <span className="truncate flex-1 font-medium">{cat}</span>
                      <Select
                        className="h-7 py-0 w-24 text-[11px]"
                        value={currentOverride !== undefined ? currentOverride.toString() : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            // remove override
                            const copy = { ...taxCategoryOverrides };
                            delete copy[cat];
                            setTaxCategoryOverrides(copy);
                          } else {
                            handleTaxOverrideChange(cat, parseFloat(val));
                          }
                        }}
                      >
                        <option value="">Default ({taxRatePercent}%)</option>
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t text-xs">
              <h4 className="font-semibold text-muted-foreground">Calculation Summary</h4>
              <div className="flex justify-between text-muted-foreground">
                <span>Calculated Tax on Income:</span>
                <span className="font-semibold text-success">₹{taxCalcs.calculatedTaxOnIncome.toLocaleString("en-IN", {maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Calculated Tax on Expenses:</span>
                <span className="font-semibold text-destructive">₹{taxCalcs.calculatedTaxOnExpense.toLocaleString("en-IN", {maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-foreground">
                <span>Net Estimated GST Liability:</span>
                <span className={taxCalcs.netTaxLiability >= 0 ? "text-success" : "text-destructive"}>
                  ₹{taxCalcs.netTaxLiability.toLocaleString("en-IN", {maximumFractionDigits:2})}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground italic pt-2">
                *Estimated net tax liability calculated as Tax collected on Income minus Input Tax Credit on Expenses.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Record Transaction dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Transaction Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={recordTransaction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Transaction Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  variant={txType === "income" ? "default" : "outline"}
                  onClick={() => setTxType("income")}
                >
                  Revenue / Income
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  variant={txType === "expense" ? "default" : "outline"}
                  onClick={() => setTxType("expense")}
                >
                  Expense Claim / Payout
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Institution Name
              </label>
              <Select value={txInstId} onChange={(e) => setTxInstId(e.target.value)} required>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount (₹)
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date
                </label>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ledger Category
              </label>
              <Select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} required>
                {ledgerCategories[txType].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              <Input
                placeholder="e.g. Purchase of science lab equipment"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Auditor Notes
              </label>
              <Textarea
                placeholder="Additional audit notes, invoice details, cheque numbers..."
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={txSubmitting}>
                {txSubmitting ? "Recording..." : "Record Entry"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
