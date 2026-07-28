"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
};

export function PurchaseFormDialog({ open, onOpenChange, onSubmitted }: Props) {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) { toast.error("Please enter item name"); return; }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0 || !Number.isInteger(Number(quantity))) { toast.error("Quantity must be a positive integer"); return; }
    if (!estimatedCost || isNaN(Number(estimatedCost)) || Number(estimatedCost) < 0) { toast.error("Estimated cost must be a positive number"); return; }

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
        onOpenChange(false);
        setItemName(""); setQuantity("1"); setEstimatedCost(""); setJustification("");
        onSubmitted();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit purchase request");
      }
    } catch { toast.error("An error occurred while submitting request"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item Name</label>
            <Input placeholder="e.g. Dell UltraSharp 27 Monitor" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</label>
              <Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Unit Cost (₹)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} required />
            </div>
          </div>
          {quantity && estimatedCost && !isNaN(Number(quantity)) && !isNaN(Number(estimatedCost)) && (
            <p className="text-xs text-muted-foreground">Total Estimated Cost: <strong>₹{(Number(quantity) * Number(estimatedCost)).toLocaleString("en-IN")}</strong></p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Justification</label>
            <Textarea placeholder="Describe why this item is needed..." value={justification} onChange={(e) => setJustification(e.target.value)} maxLength={500} rows={3} required />
            <p className="text-right text-[10px] text-muted-foreground">{justification.length}/500 chars</p>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
