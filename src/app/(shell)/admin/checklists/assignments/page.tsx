"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Assignment = {
  id: string;
  staffId: string;
  templateId: string | null;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  staffName: string;
  templateName: string | null;
  createdAt: string;
};

type Staff = { id: string; firstName: string; lastName: string };
type Template = { id: string; name: string; type: string };

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  pending: "secondary",
  in_progress: "warning",
  completed: "success",
  cancelled: "outline",
};

export default function AssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ staffId: "", templateId: "", type: "onboarding" });

  useEffect(() => {
    Promise.all([
      fetch("/api/checklists/assignments").then((r) => r.json()),
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/checklists").then((r) => r.json()),
    ]).then(([a, s, t]) => {
      setAssignments(Array.isArray(a.assignments) ? a.assignments : []);
      setStaffList(Array.isArray(s.staff) ? s.staff : []);
      setTemplates(Array.isArray(t.templates) ? t.templates : []);
      setLoading(false);
    });
  }, []);

  const filtered = assignments.filter((a) => {
    if (filterType && a.type !== filterType) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/checklists/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ staffId: "", templateId: "", type: "onboarding" });
    const res = await fetch("/api/checklists/assignments");
    const d = await res.json();
    setAssignments(Array.isArray(d.assignments) ? d.assignments : []);
  }

  if (loading) return <div className="flex-1 p-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Checklist Assignments</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Assignment"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  required
                >
                  <option value="">Select staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </Select>
                <Select
                  value={form.templateId}
                  onChange={(e) => {
                    const t = templates.find((t) => t.id === e.target.value);
                    setForm({ ...form, templateId: e.target.value, type: t?.type || "onboarding" });
                  }}
                  required
                >
                  <option value="">Select template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Input
                  value={form.type}
                  className="bg-muted w-auto inline-block"
                  readOnly
                />
                <span className="ml-2 text-xs text-muted-foreground">Auto-filled from template</span>
              </div>
              <Button type="submit">Assign</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-40"
        >
          <option value="">All types</option>
          <option value="onboarding">Onboarding</option>
          <option value="offboarding">Offboarding</option>
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Staff</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Started</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/admin/checklists/assignments/${a.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{a.staffName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.templateName || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.type === "onboarding" ? "default" : "warning"} className="text-[10px] capitalize">
                      {a.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[a.status] || "secondary"} className="text-[10px] capitalize">
                      {a.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {a.startedAt ? new Date(a.startedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/checklists/assignments/${a.id}`);
                      }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
