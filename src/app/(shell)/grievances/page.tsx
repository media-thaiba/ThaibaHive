"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { ensureArray, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  Shield,
  Eye,
  CheckCircle,
  Send,
  Inbox,
  Lock,
  AlertTriangle,
} from "lucide-react";

type Grievance = {
  id: string;
  staffId: string | null;
  isAnonymous: boolean;
  category: string;
  subject: string;
  description: string;
  status: string;
  response: string | null;
  respondedById: string | null;
  responderName: string | null;
  responderLastName: string | null;
  respondedAt: string | null;
  submitterName: string | null;
  createdAt: string;
  updatedAt: string;
};

type Permissions = { role: string; permissions: string[] };

const CATEGORIES = [
  { value: "workplace", label: "Workplace" },
  { value: "harassment", label: "Harassment" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "payroll", label: "Payroll / Compensation" },
  { value: "management", label: "Management" },
  { value: "general", label: "General" },
];

const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "secondary" | "destructive"> = {
  open: "info",
  in_review: "warning",
  resolved: "success",
  dismissed: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const CATEGORY_VARIANT: Record<string, "default" | "secondary" | "info" | "warning" | "destructive" | "success"> = {
  workplace: "default",
  harassment: "destructive",
  infrastructure: "warning",
  payroll: "info",
  management: "secondary",
  general: "default",
};

type FilterTab = "all" | "mine" | "open" | "resolved";

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Submit modal state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    isAnonymous: true,
    category: "general",
    subject: "",
    description: "",
  });

  // Detail / admin response modal state
  const [selected, setSelected] = useState<Grievance | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseForm, setResponseForm] = useState({
    status: "in_review",
    response: "",
  });

  const isAdmin = permissions?.role === "super_admin" || permissions?.role === "admin";

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ grievances: Grievance[] }>("/api/grievances", { toast: false });
    if (res.ok) {
      setGrievances(ensureArray<Grievance>(res.data?.grievances));
    } else {
      toast.error("Failed to load grievances");
    }
    setLoading(false);
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/permissions");
      if (res.ok) {
        const data = await res.json();
        if (data.role) setPermissions(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchGrievances();
    fetchPermissions();
  }, [fetchGrievances, fetchPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setSubmitting(true);
    const res = await api.post("/api/grievances", {
      isAnonymous: form.isAnonymous,
      category: form.category,
      subject: form.subject,
      description: form.description,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Grievance submitted successfully");
      setSubmitOpen(false);
      setForm({ isAnonymous: true, category: "general", subject: "", description: "" });
      fetchGrievances();
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setResponding(true);
    const res = await api.patch(`/api/grievances/${selected.id}`, {
      status: responseForm.status,
      response: responseForm.response || undefined,
    });
    setResponding(false);
    if (res.ok) {
      toast.success("Response submitted");
      setDetailOpen(false);
      setSelected(null);
      fetchGrievances();
    }
  };

  const openDetail = (g: Grievance) => {
    setSelected(g);
    setResponseForm({
      status: g.status === "open" ? "in_review" : g.status,
      response: g.response || "",
    });
    setDetailOpen(true);
  };

  const filteredGrievances = grievances.filter((g) => {
    if (activeTab === "mine") return g.staffId !== null && !g.isAnonymous;
    if (activeTab === "open") return g.status === "open" || g.status === "in_review";
    if (activeTab === "resolved") return g.status === "resolved";
    return true;
  });

  const totalCount = grievances.length;
  const openCount = grievances.filter((g) => g.status === "open" || g.status === "in_review").length;
  const resolvedCount = grievances.filter((g) => g.status === "resolved").length;
  const anonymousCount = grievances.filter((g) => g.isAnonymous).length;

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "mine", label: "My Submissions", count: grievances.filter((g) => g.staffId !== null && !g.isAnonymous).length },
    { key: "open", label: "Open", count: openCount },
    { key: "resolved", label: "Resolved", count: resolvedCount },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Grievance &amp; Workplace Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit suggestions, concerns, or anonymous feedback to help improve the workplace.
          </p>
        </div>
        <Button onClick={() => setSubmitOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Submit Grievance
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2.5">
              <Eye className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open &amp; In Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved Concerns</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2.5">
              <Lock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{anonymousCount}</p>
              <p className="text-xs text-muted-foreground">Anonymous Submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Grievance List */}
      <div className="space-y-3">
        {filteredGrievances.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-12 w-12" />}
            title="No grievances found"
            description="No submissions match the selected filter. Submit a new grievance to get started."
          />
        ) : (
          filteredGrievances.map((g) => (
            <Card
              key={g.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetail(g)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={CATEGORY_VARIANT[g.category] || "default"}>
                        {CATEGORY_LABELS[g.category] || g.category}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[g.status] || "secondary"}>
                        {STATUS_LABELS[g.status] || g.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-1">{g.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{g.description}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t pt-2 mt-3">
                  <span className="flex items-center gap-1">
                    {g.isAnonymous ? (
                      <>
                        <Shield className="h-3 w-3" /> Anonymous
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3 w-3" /> {g.submitterName || "Staff Member"}
                      </>
                    )}
                  </span>
                  <span>{formatDate(g.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Submit Grievance Modal */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Grievance / Feedback</DialogTitle>
            <DialogDescription>
              Your submission will be treated confidentially. You may choose to submit anonymously.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Anonymous Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <input
                type="checkbox"
                id="anonymous-toggle"
                checked={form.isAnonymous}
                onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="anonymous-toggle" className="cursor-pointer">
                Submit Anonymously
              </Label>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="Brief summary of your concern"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your grievance or feedback in detail..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={5}
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : <><Send className="h-4 w-4 mr-1.5" /> Submit</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Response Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Grievance Details</DialogTitle>
            <DialogDescription>
              {selected?.isAnonymous
                ? "This submission is anonymous."
                : `Submitted by ${selected?.submitterName || "Staff Member"}`}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={CATEGORY_VARIANT[selected.category] || "default"}>
                    {CATEGORY_LABELS[selected.category] || selected.category}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[selected.status] || "secondary"}>
                    {STATUS_LABELS[selected.status] || selected.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{formatDate(selected.createdAt)}</span>
                </div>
                <h3 className="font-semibold">{selected.subject}</h3>
                <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground leading-relaxed">
                  {selected.description}
                </div>
              </div>

              {/* Existing Response */}
              {selected.response && (
                <div className="p-3 rounded-lg bg-success/5 border border-success/20 space-y-1">
                  <p className="text-xs font-semibold text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Committee Response
                  </p>
                  <p className="text-sm">{selected.response}</p>
                  {selected.respondedAt && (
                    <p className="text-[10px] text-muted-foreground">{formatDate(selected.respondedAt)}</p>
                  )}
                </div>
              )}

              {/* Admin Controls */}
              {isAdmin && (
                <form onSubmit={handleAdminResponse} className="space-y-3 p-3 rounded-lg bg-muted/20 border">
                  <p className="text-xs font-semibold flex items-center gap-1 text-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Admin Committee Response
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Update Status</Label>
                    <Select
                      value={responseForm.status}
                      onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}
                    >
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Official Response Notes</Label>
                    <Textarea
                      placeholder="Enter the committee's official response..."
                      value={responseForm.response}
                      onChange={(e) => setResponseForm({ ...responseForm, response: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <Button type="submit" disabled={responding} className="w-full">
                    {responding ? "Submitting..." : <><Send className="h-4 w-4 mr-1.5" /> Submit Response</>}
                  </Button>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
