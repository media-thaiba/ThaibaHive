"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, CheckCircle2, AlertCircle, File, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

const categories = [
  "Travel & Transport", "Food & Meals", "Office Supplies", "Utilities & Bills",
  "Hardware & Equipment", "Software & Subscriptions", "Others",
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
};

export function ExpenseClaimFormDialog({ open, onOpenChange, onSubmitted }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Receipt size exceeds limit of 10MB"); return; }
    setReceiptFile(file);
    setUploading(true);
    try {
      const { data, ok } = await api.post<{ uploadUrl: string; fileUrl: string }>(
        "/api/media/upload/sign",
        { ext: file.name.split(".").pop() || "pdf" },
        { toast: false }
      );
      if (!ok || !data) { toast.error("Failed to get upload URL"); return; }

      const uploadRes = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) { toast.error("Failed to upload receipt"); return; }

      setReceiptUrl(data.fileUrl);
      toast.success("Receipt uploaded successfully!");
    } catch { toast.error("An error occurred during file upload"); }
    finally { setUploading(false); }
  };

  const removeReceipt = () => {
    setReceiptUrl("");
    setReceiptFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error("Please enter a valid amount"); return; }
    if (!description.trim()) { toast.error("Please enter a description"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), category, description: description.trim(), receiptUrl: receiptUrl || undefined }),
      });
      if (res.ok) {
        toast.success("Expense claim submitted successfully!");
        onOpenChange(false);
        setAmount(""); setCategory(categories[0]); setDescription(""); setReceiptUrl(""); setReceiptFile(null);
        onSubmitted();
      } else { const data = await res.json(); toast.error(data.error || "Failed to submit claim"); }
    } catch { toast.error("An error occurred while submitting claim"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Submit Expense Claim</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim Amount (₹)</label>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
            <Textarea placeholder="Describe the expense..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receipt (Required for claims ≥ ₹1,000)</label>
            {receiptUrl ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <File className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Receipt uploaded</p>
                  <p className="text-xs text-muted-foreground">Click to replace or remove</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={removeReceipt} className="gap-1">
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click or drag to upload receipt</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, WEBP • Max 10MB</p>
                {uploading && <p className="text-xs text-primary mt-2">Uploading...</p>}
              </div>
            )}
            {(receiptFile || uploading) && <p className="text-xs text-muted-foreground">Upload in progress...</p>}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Claim"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
