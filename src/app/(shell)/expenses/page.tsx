"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  File, 
  Loader2,
  DollarSign,
  Briefcase,
  AlertCircle,
  Inbox,
  Plus
} from "lucide-react";

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
};

const CATEGORIES = ["travel", "supplies", "equipment", "maintenance", "food", "other"];

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

export default function ExpensesPage() {
  const { staff } = useAuth();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [form, setForm] = useState({ 
    amount: "", 
    category: "travel", 
    description: "", 
    receiptUrl: "" 
  });
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviewDialog, setReviewDialog] = useState<{ id: string; action: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const canReview = staff && ["super_admin", "admin", "principal", "hod"].includes(staff.role);

  const fetchClaims = useCallback(async () => {
    const url = filter === "all" ? "/api/expense-claims" : `/api/expense-claims?status=${filter}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setClaims(Array.isArray(data.claims) ? data.claims : []);
    } catch {
      toast.error("Failed to load expense claims");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
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
        setForm((prev) => ({
          ...prev,
          receiptUrl: data.url,
        }));
        toast.success("Receipt uploaded successfully");
      } else {
        const d = await res.json();
        setError(d.error || "Failed to upload file");
      }
    } catch {
      setError("File upload failed due to network error");
    } finally {
      setUploading(false);
    }
  };

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.category || !form.description) {
      setError("Please fill out all required fields");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...form, 
          amount: parseFloat(form.amount) 
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({ amount: "", category: "travel", description: "", receiptUrl: "" });
        toast.success("Expense claim submitted");
        fetchClaims();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to submit expense claim");
      }
    } catch {
      setError("Failed to submit due to a network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewClaim = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/expense-claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes }),
      });

      if (res.ok) {
        setReviewDialog(null);
        setReviewNotes("");
        toast.success(`Claim ${status}`);
        fetchClaims();
      } else {
        toast.error("Failed to review claim");
      }
    } catch {
      toast.error("Error connecting to review endpoint.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" /> Expense Claims
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1.5" /> Submit Claim</>}
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
            <CardTitle>Submit a New Expense Claim</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitClaim} className="space-y-4">
              <Input 
                type="number" 
                step="0.01" 
                placeholder="Amount (₹)" 
                value={form.amount} 
                onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                required 
              />
              
              <Select 
                value={form.category} 
                onChange={(e) => setForm({ ...form, category: e.target.value })} 
                required
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </Select>
              
              <Textarea 
                placeholder="Describe expense details (e.g., train ticket to main campus, printer ink)..." 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                rows={3} 
                required 
              />

              {/* Receipt File Uploader */}
              <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-5 bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  id="expense-receipt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-xs font-semibold">Uploading receipt file...</p>
                  </div>
                ) : form.receiptUrl ? (
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="h-5 w-5 text-rose-500" />
                    <span className="font-semibold text-foreground">Receipt uploaded successfully</span>
                    <Badge variant="success">Ready</Badge>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-xs font-semibold">Select or drag receipt file here</p>
                    <p className="text-[10px] text-muted-foreground">PDF, Word, or Images</p>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={submitting || uploading} className="w-full">
                {submitting ? "Submitting..." : "Submit Expense Claim"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Your claim will be reviewed by your HOD or Admin. Attaching receipts speeds up approval.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((tab) => (
          <Button key={tab} variant={filter === tab ? "default" : "outline"} size="sm" onClick={() => setFilter(tab)} className="capitalize">
            {tab}
          </Button>
        ))}
      </div>

      {/* Claims List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <span className="text-xl font-bold text-foreground">₹{c.amount.toLocaleString("en-IN")}</span>
                  <Badge variant={statusVariant[c.status] || "secondary"} className="capitalize">
                    {c.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="capitalize text-[10px] py-0">{c.category}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 h-8">{c.description}</p>
                
                {c.reviewNotes && (
                  <p className="text-[10px] italic text-muted-foreground bg-muted/40 p-1.5 rounded border border-dashed">
                    Review: {c.reviewNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3 mt-auto">
                <div>
                  {c.receiptUrl ? (
                    <a
                      href={c.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                    >
                      <File className="h-3.5 w-3.5 text-rose-500" /> View Receipt
                    </a>
                  ) : (
                    <span className="text-[10px] italic text-muted-foreground/60">No receipt attached</span>
                  )}
                </div>

                {canReview && c.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="default" className="text-xs py-0.5 h-7 px-2.5" onClick={() => setReviewDialog({ id: c.id, action: "approved" })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs py-0.5 h-7 px-2.5" onClick={() => setReviewDialog({ id: c.id, action: "rejected" })}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-8">
            <EmptyState
              icon={<Inbox className="h-12 w-12" />}
              title="No expense claims found"
              description="Submit new expense claims or adjust status filters."
            />
          </div>
        )}
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) { setReviewDialog(null); setReviewNotes(""); } }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewDialog?.action === "approved" ? "Approve" : "Reject"} Claim</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Review notes or justification (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button variant={reviewDialog?.action === "approved" ? "default" : "destructive"} onClick={() => reviewDialog && reviewClaim(reviewDialog.id, reviewDialog.action)}>
              {reviewDialog?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
