"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  createdAt: string;
  updatedAt: string;
  submitterName: string | null;
};

const CATEGORIES = ["workplace", "harassment", "discrimination", "facilities", "management", "suggestion", "other"];
const STATUSES = ["open", "in_review", "resolved", "closed"];

const STATUS_BADGE: Record<string, "warning" | "default" | "success" | "secondary"> = {
  open: "warning",
  in_review: "default",
  resolved: "success",
  closed: "secondary",
};

const CATEGORY_LABEL: Record<string, string> = {
  workplace: "Workplace",
  harassment: "Harassment",
  discrimination: "Discrimination",
  facilities: "Facilities",
  management: "Management",
  suggestion: "Suggestion",
  other: "Other",
};

export default function GrievancesPage() {
  const { staff: currentUser } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    isAnonymous: true, category: "", subject: "", description: "",
  });
  const [adminResponse, setAdminResponse] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  useEffect(() => {
    fetch("/api/grievances")
      .then(r => r.json())
      .then(d => {
        setGrievances(Array.isArray(d.grievances) ? d.grievances : []);
        setLoading(false);
      });
  }, []);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  async function loadGrievances() {
    const res = await fetch("/api/grievances").then(r => r.json());
    setGrievances(Array.isArray(res.grievances) ? res.grievances : []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description) { toast.error("Description is required"); return; }
    const res = await fetch("/api/grievances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isAnonymous: form.isAnonymous,
        category: form.category || "other",
        subject: form.subject || "No subject",
        description: form.description,
      }),
    });
    if (!res.ok) { toast.error("Failed to submit"); return; }
    toast.success("Feedback submitted");
    setShowForm(false);
    setForm({ isAnonymous: true, category: "", subject: "", description: "" });
    await loadGrievances();
  }

  async function handleUpdate(id: string) {
    const payload: Record<string, string> = {};
    if (adminStatus) payload.status = adminStatus;
    if (adminResponse) payload.response = adminResponse;
    if (!adminStatus && !adminResponse) return;
    const res = await fetch(`/api/grievances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("Failed to update"); return; }
    toast.success("Grievance updated");
    setAdminResponse("");
    setAdminStatus("");
    setExpanded(null);
    await loadGrievances();
  }

  const filtered = tab === "all" ? grievances : grievances.filter(g => g.status === tab);

  if (loading) return (
    <div className="flex-1 p-6 space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-10 w-48 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grievances & Suggestions</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Submit Feedback"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} className="rounded" />
                Submit anonymously
              </label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
              <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <Textarea placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} required />
              <Button type="submit">Submit</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b pb-2">
        {["all", ...STATUSES].map((s) => (
          <Button key={s} variant={tab === s ? "default" : "ghost"} size="sm" onClick={() => setTab(s)} className="capitalize">
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{g.subject}</span>
                    <Badge variant={STATUS_BADGE[g.status] || "default"}>
                      {g.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{CATEGORY_LABEL[g.category] || g.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {g.isAnonymous ? "Anonymous" : "Identified"} &middot; {new Date(g.createdAt).toLocaleDateString()}
                  </p>
                  <p className={`text-sm ${expanded === g.id ? "" : "line-clamp-2"}`}>
                    {g.description}
                  </p>
                  {g.description.length > 120 && expanded !== g.id && (
                    <Button variant="link" size="sm" onClick={() => setExpanded(g.id)}>Read more</Button>
                  )}
                  {expanded === g.id && (
                    <Button variant="link" size="sm" onClick={() => setExpanded(null)}>Show less</Button>
                  )}
                </div>
              </div>

              {g.response && (
                <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Response</p>
                  <p>{g.response}</p>
                  {g.responderName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      &mdash; {g.responderName} {g.responderLastName}, {g.respondedAt ? new Date(g.respondedAt).toLocaleDateString() : ""}
                    </p>
                  )}
                </div>
              )}

              {isAdmin && expanded === g.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <Select value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                    <option value="">Change status...</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </Select>
                  <Textarea placeholder="Add response..." value={adminResponse} onChange={(e) => setAdminResponse(e.target.value)} rows={2} />
                  <Button size="sm" onClick={() => handleUpdate(g.id)}>Update</Button>
                </div>
              )}

              {isAdmin && expanded !== g.id && (
                <Button variant="link" size="sm" className="mt-2" onClick={() => { setExpanded(g.id); setAdminResponse(g.response || ""); setAdminStatus(g.status); }}>Manage</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No grievances found.</p>
        )}
      </div>
    </div>
  );
}
