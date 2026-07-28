"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ledgerCategories = {
  income: ["Tuition Fees", "Grants & Donations", "Canteen Sales", "Event Revenue", "Other Revenue"],
  expense: ["Salaries & Wages", "Maintenance & Repairs", "Canteen Purchase", "Utilities", "Teaching Supplies", "Others"],
};

type Institution = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutions: Institution[];
  onRecorded: () => void;
};

export function TransactionFormDialog({ open, onOpenChange, institutions, onRecorded }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txInstId, setTxInstId] = useState(institutions[0]?.id || "");
  const [txCategory, setTxCategory] = useState(ledgerCategories.income[0]);
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(today);
  const [txDesc, setTxDesc] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && institutions.length > 0 && !txInstId) {
      setTxInstId(institutions[0].id);
    }
  }, [open, institutions, txInstId]);

  useEffect(() => { setTxCategory(ledgerCategories[txType][0]); }, [txType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txInstId) { toast.error("Please select an institution"); return; }
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) { toast.error("Amount must be positive"); return; }
    if (!txDate) { toast.error("Please select transaction date"); return; }

    setSubmitting(true);
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
        onOpenChange(false);
        setTxAmount(""); setTxDesc(""); setTxNotes(""); setTxDate(today);
        onRecorded();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to record transaction");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Transaction Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Type</label>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" variant={txType === "income" ? "default" : "outline"} onClick={() => setTxType("income")}>
                Revenue / Income
              </Button>
              <Button type="button" className="flex-1" variant={txType === "expense" ? "default" : "outline"} onClick={() => setTxType("expense")}>
                Expense Claim / Payout
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Institution Name</label>
            <Select value={txInstId} onChange={(e) => setTxInstId(e.target.value)} required>
              {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (₹)</label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ledger Category</label>
            <Select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} required>
              {ledgerCategories[txType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
            <Input placeholder="e.g. Purchase of science lab equipment" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auditor Notes</label>
            <Textarea placeholder="Additional audit notes, invoice details, cheque numbers..." value={txNotes} onChange={(e) => setTxNotes(e.target.value)} maxLength={500} rows={2} />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Recording..." : "Record Entry"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
