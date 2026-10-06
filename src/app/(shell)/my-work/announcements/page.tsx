"use client";

/**
 * Announcements Page
 * Migrated to TanStack Query (P2-46) and central API client (P2-47).
 * Uses useQuery for fetching (auto-cache, dedup) and useMutation for writes.
 */

import { useState } from "react";
import { toast } from "sonner";
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
import {
  useAnnouncements,
  useDepartments,
  useInstitutions,
  usePermissions,
  useCreateAnnouncement,
  useMarkAnnouncementRead,
  type Announcement,
} from "@/lib/hooks/use-announcements";

// ─── Constants ─────────────────────────────────────────────────────────────────

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

const EMPTY_FORM = {
  title: "",
  content: "",
  priority: "normal",
  targetRole: "",
  targetDepartmentId: "",
  targetInstitutionId: "",
  pinnedUntil: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isPinned = (a: Announcement) =>
  !!a.pinnedUntil && new Date(a.pinnedUntil) > new Date();

const formatDate = (dateStr: string) => dateStr?.split("T")[0] ?? "";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Data queries (P2-46: TanStack Query) ──────────────────────────────────
  const { data: anns = [], isLoading } = useAnnouncements();
  const { data: departments = [] } = useDepartments();
  const { data: institutions = [] } = useInstitutions();
  const { data: permissions } = usePermissions();

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreateAnnouncement();
  const markReadMutation = useMarkAnnouncementRead();

  // ── Derived permissions ───────────────────────────────────────────────────
  const canCreate =
    permissions?.role === "super_admin" ||
    (permissions?.permissions.includes("announcements:create") ?? false);
  const canManage =
    permissions?.role === "super_admin" ||
    (permissions?.permissions.includes("announcements:manage") ?? false);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      content: form.content,
      priority: form.priority,
      targetRole: form.targetRole || undefined,
      targetDepartmentId: form.targetDepartmentId || undefined,
      targetInstitutionId: form.targetInstitutionId || undefined,
      pinnedUntil: form.pinnedUntil || undefined,
    };
    const { ok } = await createMutation.mutateAsync(payload).catch(() => ({ ok: false }));
    if (ok) {
      toast.success("Announcement published successfully.");
      setShowForm(false);
      setForm(EMPTY_FORM);
    }
    // Errors are handled by the mutation (auto-toast via api client)
  };

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleCardClick = (announcement: Announcement) => {
    if (!canManage && !announcement.isRead) {
      handleMarkRead(announcement.id);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const pinnedAnns = anns.filter(isPinned);
  const regularAnns = anns.filter((a) => !isPinned(a));
  const displayAnns = [...pinnedAnns, ...regularAnns];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

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

      {createMutation.error && (
        <Alert variant="error">{String(createMutation.error)}</Alert>
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
                <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
                <Select value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                  <option value="">All Roles</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={form.targetDepartmentId} onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}>
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
                <Select value={form.targetInstitutionId} onChange={(e) => setForm({ ...form, targetInstitutionId: e.target.value })}>
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
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending ? "Publishing..." : "Publish"}
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
                {!canManage && !a.isRead && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" /> Unread
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(a.id); }}
                    >
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
