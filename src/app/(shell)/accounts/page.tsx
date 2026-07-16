"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [filter, setFilter] = useState({ institutionId: "", type: "", from: "", to: "" });
  const [form, setForm] = useState({ institutionId: "", type: "income", category: "", amount: 0, description: "", transactionDate: new Date().toISOString().split("T")[0], notes: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then(r => r.json()),
      fetch("/api/accounts/summary").then(r => r.json()),
      fetch("/api/admin/institutions").then(r => r.json()),
    ]).then(([txData, sumData, instData]) => {
      setTransactions(Array.isArray(txData.transactions) ? txData.transactions : []);
      setSummary(sumData);
      setInstitutions(Array.isArray(instData.institutions) ? instData.institutions : []);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const params = new URLSearchParams(filter);
    const [txData, sumData] = await Promise.all([
      fetch(`/api/accounts?${params}`).then(r => r.json()),
      fetch(`/api/accounts/summary?${params}`).then(r => r.json()),
    ]);
    setTransactions(Array.isArray(txData.transactions) ? txData.transactions : []);
    setSummary(sumData);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/accounts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ institutionId: "", type: "income", category: "", amount: 0, description: "", transactionDate: new Date().toISOString().split("T")[0], notes: "" });
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Transactions</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Transaction"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Transaction</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} required>
                <option value="">Select institution...</option>
                {institutions.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="income">Income</option><option value="expense">Expense</option>
                </Select>
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Category...</option>
                  <option value="tuition_fee">Tuition Fee</option><option value="admission_fee">Admission Fee</option>
                  <option value="exam_fee">Exam Fee</option><option value="transport_fee">Transport Fee</option>
                  <option value="salary">Salary</option><option value="maintenance">Maintenance</option>
                  <option value="utilities">Utilities</option><option value="supplies">Supplies</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
                <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required />
              </div>
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button type="submit">Record</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Income</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">₹{summary?.totalIncome?.toLocaleString() || 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">₹{summary?.totalExpense?.toLocaleString() || 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Balance</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${(summary?.netBalance || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{(summary?.netBalance || 0).toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th><th className="px-4 py-3 text-left font-medium">Institution</th>
              <th className="px-4 py-3 text-left font-medium">Category</th><th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 text-left font-medium">By</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr></thead>
            <tbody>
              {transactions.map((t: any) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{t.transactionDate}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.institutionName}</td>
                  <td className="px-4 py-3 capitalize">{t.category?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3"><Badge variant={t.type === "income" ? "success" : "destructive"} className="capitalize">{t.type}</Badge></td>
                  <td className={`px-4 py-3 text-right font-medium ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>₹{Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.recordedByName}</td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-destructive">Delete</Button></td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
