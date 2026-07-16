"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  Plus, 
  FileText, 
  TrendingUp, 
  Inbox,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck
} from "lucide-react";

type PurchaseRequest = {
  id: string;
  requesterId: string;
  itemName: string;
  quantity: number;
  estimatedCost: number | null;
  justification: string | null;
  status: string;
  approvedByHodId: string | null;
  approvedByAccountsId: string | null;
  approvedByPurchaseId: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "pending_hod", label: "Pending HOD" },
  { key: "pending_accounts", label: "Pending Accounts" },
  { key: "pending_purchase", label: "Pending Purchase" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const statusColor: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  approved: "success",
  pending_hod: "warning",
  pending_accounts: "warning",
  pending_purchase: "warning",
  rejected: "destructive",
};

export default function PurchasesPage() {
  const { staff } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ itemName: "", quantity: 1, estimatedCost: "", justification: "" });
  const [error, setError] = useState("");
  
  // Review Dialogue State
  const [reviewDialog, setReviewDialog] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPurchases = useCallback(async () => {
    const url = filter === "all" ? "/api/purchases" : `/api/purchases?status=${filter}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
    } catch {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName || !form.estimatedCost) {
      setError("Item name and cost are required");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...form, 
          estimatedCost: parseFloat(form.estimatedCost) 
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ itemName: "", quantity: 1, estimatedCost: "", justification: "" });
        toast.success("Purchase request submitted");
        fetchPurchases();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to submit request");
      }
    } catch {
      setError("Failed to submit request due to a network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action, 
          notes: reviewNotes || undefined 
        }),
      });

      if (res.ok) {
        setReviewDialog(null);
        setReviewNotes("");
        toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
        fetchPurchases();
      } else {
        const d = await res.json();
        toast.error(d.error || `Failed to ${action} request`);
      }
    } catch {
      toast.error("Network error. Failed to complete action.");
    }
  };

  const canApprove = (p: PurchaseRequest) => {
    if (!staff) return false;
    const r = staff.role;
    if (r === "super_admin") return true;
    if (p.status === "pending_hod" && (r === "admin" || r === "hod")) return true;
    if (p.status === "pending_accounts" && r === "admin") return true;
    if (p.status === "pending_purchase" && r === "admin") return true;
    return false;
  };

  const canReject = (p: PurchaseRequest) => {
    if (!staff) return false;
    const r = staff.role;
    if (r === "super_admin" || r === "admin") return true;
    if (p.status === "pending_hod" && r === "hod") return true;
    return false;
  };

  const renderStepper = (p: PurchaseRequest) => {
    const stages = [
      { key: "pending_hod", label: "HOD Approval" },
      { key: "pending_accounts", label: "Accounts Clear" },
      { key: "pending_purchase", label: "Purchase Placement" },
    ];

    if (p.status === "rejected") {
      return (
        <span className="text-[10px] text-destructive font-semibold flex items-center gap-1 mt-1 bg-destructive/10 px-1.5 py-0.5 rounded">
          <AlertTriangle className="h-3 w-3" /> Rejected / Cancelled
        </span>
      );
    }

    if (p.status === "approved") {
      return (
        <span className="text-[10px] text-success font-semibold flex items-center gap-1 mt-1 bg-success/10 px-1.5 py-0.5 rounded">
          <ClipboardCheck className="h-3.5 w-3.5" /> Fully Approved & Dispatched
        </span>
      );
    }

    const currentIdx = stages.findIndex((s) => s.key === p.status);

    return (
      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded-lg border border-dashed">
        {stages.map((s, idx) => {
          const isDone = currentIdx === -1 || idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={s.key} className="flex items-center gap-1">
              {idx > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/30" />}
              <span className={`px-1.5 py-0.5 rounded ${
                isCurrent 
                  ? "bg-warning/20 text-warning font-semibold border border-warning/10" 
                  : isDone 
                    ? "bg-success/15 text-success font-semibold" 
                    : "text-muted-foreground/45"
              }`}>
                {s.label.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const filtered = filter === "all" ? purchases : purchases.filter((p) => p.status === filter);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" /> Purchase Requests
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1.5" /> New Request</>}
        </Button>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {showForm && (
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Submit a Purchase Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitRequest} className="space-y-4">
              <Input 
                type="text" 
                placeholder="Item / Equipment Name (e.g., Whiteboards, Lab Laptops)" 
                value={form.itemName} 
                onChange={(e) => setForm({ ...form, itemName: e.target.value })} 
                required 
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="Quantity" 
                  value={form.quantity} 
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} 
                  required 
                />
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="Estimated cost (₹)" 
                  value={form.estimatedCost} 
                  onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} 
                  required 
                />
              </div>

              <Textarea 
                placeholder="Justification/Why is this item required?..." 
                value={form.justification} 
                onChange={(e) => setForm({ ...form, justification: e.target.value })} 
                rows={3} 
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Purchase Request"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Requests undergo a 3-stage validation workflow: HOD ➜ Accounts ➜ Purchase Admin.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button key={tab.key} variant={filter === tab.key ? "default" : "outline"} size="sm" onClick={() => setFilter(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* List Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => {
          const approvable = canApprove(p);
          const rejectable = canReject(p);

          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{p.itemName} × {p.quantity}</h3>
                    <Badge variant={statusColor[p.status] || "secondary"} className="capitalize">
                      {p.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {p.estimatedCost && (
                    <p className="text-sm font-bold text-foreground">₹{p.estimatedCost.toLocaleString("en-IN")}</p>
                  )}
                  {p.justification && (
                    <p className="text-xs text-muted-foreground line-clamp-2 h-8">{p.justification}</p>
                  )}
                  
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t pt-2">
                    <span>Requested: {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>

                  {p.notes && (
                    <p className="text-[10px] italic text-muted-foreground bg-muted/40 p-1.5 rounded border border-dashed">
                      Notes: {p.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-3 mt-auto border-t pt-3">
                  {/* Stepper workflow */}
                  {renderStepper(p)}

                  {/* Actions buttons */}
                  {(approvable || rejectable) && (
                    <div className="flex gap-2 w-full mt-1">
                      {approvable && (
                        <Button size="sm" className="text-xs py-0.5 h-8 px-3 flex-1" onClick={() => setReviewDialog({ id: p.id, action: "approve" })}>
                          Approve Stage
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" className="text-xs py-0.5 h-8 px-3 flex-1" onClick={() => setReviewDialog({ id: p.id, action: "reject" })}>
                        Reject / Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-8">
            <EmptyState
              icon={<Inbox className="h-12 w-12" />}
              title="No purchase requests found"
              description="Submit new purchase requests or adjust filters."
            />
          </div>
        )}
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) { setReviewDialog(null); setReviewNotes(""); } }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewDialog?.action === "approve" ? "Approve" : "Reject"} Purchase Request</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Decision notes / comment (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button variant={reviewDialog?.action === "approve" ? "default" : "destructive"} onClick={() => reviewDialog && handleReviewAction(reviewDialog.id, reviewDialog.action)}>
              {reviewDialog?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
