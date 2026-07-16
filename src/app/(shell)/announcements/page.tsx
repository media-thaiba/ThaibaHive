"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Pin, Eye, Users, Calendar } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  isActive: boolean;
  targetRole?: string | null;
  targetDepartmentId?: string | null;
  targetInstitutionId?: string | null;
  pinnedUntil?: string | null;
  createdAt: string;
  createdByName: string;
  createdByLastName: string;
  readCount?: number;
  isRead?: boolean;
};

type Department = { id: string; name: string };
type Institution = { id: string; name: string };
type Permissions = { role: string; permissions: string[] };

const priorityVariant: Record<string, "destructive" | "warning" | "secondary" | "info" | "default"> = {
  urgent: "destructive",
  high: "warning",
  normal: "secondary",
  low: "info",
  default: "default",
};

const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "hod", label: "HOD" },
  { value: "staff", label: "Staff" },
];

export default function AnnouncementsPage() {
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal",
    targetRole: "",
    targetDepartmentId: "",
    targetInstitutionId: "",
    pinnedUntil: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());

  const canCreate = permissions?.permissions.includes("announcements:create") ?? false;
  const canManage = permissions?.permissions.includes("announcements:manage") ?? false;
  const isAdmin = canManage;

  const fetchData = useCallback(async () => {
    try {
      const [annData, deptsData, instsData, permsData] = await Promise.all([
        fetch("/api/announcements").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
        fetch("/api/institutions").then((r) => r.json()),
        fetch("/api/auth/permissions").then((r) => r.json()).catch(() => ({ permissions: [], role: "" })),
      ]);

      setAnns(Array.isArray(annData.announcements) ? annData.announcements : []);
      setDepartments(Array.isArray(deptsData.departments) ? deptsData.departments : []);
      setInstitutions(Array.isArray(instsData.institutions) ? instsData.institutions : []);
      if (permsData.role) setPermissions(permsData);
    } catch {
      setError("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    const payload = {
      title: form.title,
      content: form.content,
      priority: form.priority,
      targetRole: form.targetRole || undefined,
      targetDepartmentId: form.targetDepartmentId || undefined,
      targetInstitutionId: form.targetInstitutionId || undefined,
      pinnedUntil: form.pinnedUntil || undefined,
    };
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ title: "", content: "", priority: "normal", targetRole: "", targetDepartmentId: "", targetInstitutionId: "", pinnedUntil: "" });
        setSuccess("Announcement published successfully.");
        fetchData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to publish announcement. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/announcements/${id}/read`, { method: "POST" });
      setAnns((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    } catch {
      // Silently fail - not critical
    }
  };

  const handleCardClick = (announcement: Announcement) => {
    if (!canManage && !announcement.isRead) {
      handleMarkRead(announcement.id);
    }
  };

  const isPinned = (announcement: Announcement) => {
    if (!announcement.pinnedUntil) return false;
    return new Date(announcement.pinnedUntil) > new Date();
  };

  const formatDate = (dateStr: string) => dateStr?.split("T")[0] ?? "";

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  const pinnedAnns = anns.filter(isPinned);
  const regularAnns = anns.filter((a) => !isPinned(a));
  const displayAnns = [...pinnedAnns, ...regularAnns];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        {(canCreate || canManage) && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Announcement"}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {showForm && (canCreate || canManage) && (
        <Card>
          <CardHeader><CardTitle>Publish Announcement</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <Textarea
                placeholder="Content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
                <Select
                  value={form.targetRole}
                  onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                >
                  <option value="">All Roles</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={form.targetDepartmentId}
                  onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
                <Select
                  value={form.targetInstitutionId}
                  onChange={(e) => setForm({ ...form, targetInstitutionId: e.target.value })}
                >
                  <option value="">All Institutions</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  placeholder="Pin Until (optional)"
                  value={form.pinnedUntil}
                  onChange={(e) => setForm({ ...form, pinnedUntil: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Publishing..." : "Publish"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {displayAnns.map((a) => {
          const pinned = isPinned(a);
          return (
            <Card
              key={a.id}
              className={`transition-colors ${pinned ? "ring-2 ring-primary/20 bg-primary/5" : ""}`}
              onClick={() => handleCardClick(a)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{a.title}</CardTitle>
                      <Badge variant={priorityVariant[a.priority] || "secondary"}>{a.priority}</Badge>
                      {pinned && (
                        <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                          <Pin className="h-3 w-3" /> Pinned
                        </Badge>
                      )}
                      {!a.isActive && (
                        <Badge variant="outline" className="bg-muted">Inactive</Badge>
                      )}
                    </div>
                    {(a.targetRole || a.targetDepartmentId) && (
                      <p className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
                        {a.targetRole && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
                            <Users className="h-3 w-3" />
                            {roleOptions.find((r) => r.value === a.targetRole)?.label || a.targetRole}
                          </span>
                        )}
                        {a.targetDepartmentId && departments.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
                            <Megaphone className="h-3 w-3" />
                            {departments.find((d) => d.id === a.targetDepartmentId)?.name || a.targetDepartmentId}
                          </span>
                        )}
                        {a.pinnedUntil && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
                            <Calendar className="h-3 w-3" />
                            Pinned until {formatDate(a.pinnedUntil)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
{canManage && (
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Eye className="h-3 w-3" />
                        {a.readCount ?? 0} read
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.createdByName} {a.createdByLastName} &middot; {formatDate(a.createdAt)}
                  </p>
                  {!isAdmin && !a.isRead && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary" /> Unread
                      </span>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleMarkRead(a.id); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
            </Card>
          );
        })}
        {displayAnns.length === 0 && (
          <EmptyState
            icon={<Megaphone className="h-12 w-12" />}
            title="No announcements yet"
            description="When an announcement is published, it will appear here."
          />
        )}
      </div>
    </div>
  );
}
