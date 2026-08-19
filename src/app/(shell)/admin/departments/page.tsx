"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Institution = { id: string; name: string; code: string };
type Department = {
  id: string; name: string; code: string;
  institutionId: string | null; description: string | null; isActive: boolean;
};

const emptyForm = { name: "", code: "", institutionId: "", description: "" };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);

  // Edit state
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/admin/departments").then((r) => r.json()),
      fetch("/api/admin/institutions").then((r) => r.json()),
    ])
      .then(([deptData, instData]) => {
        setDepartments(Array.isArray(deptData.departments) ? deptData.departments : []);
        setInstitutions(Array.isArray(instData.institutions) ? instData.institutions : []);
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(dept: Department) {
    setEditTarget(dept);
    setEditForm({
      name: dept.name, code: dept.code,
      institutionId: dept.institutionId ?? "",
      description: dept.description ?? "",
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Create failed"); return; }
      toast.success("Department created");
      setShowCreate(false);
      setCreateForm(emptyForm);
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/departments/${editTarget.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Update failed"); return; }
      toast.success("Department updated");
      setEditTarget(null);
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Delete failed"); return; }
    toast.success("Department deleted");
    fetchData();
  }

  if (loading) return (
    <div className="flex-1 space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        <Button onClick={() => setShowCreate(true)}>Add Department</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Institution</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dept.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {institutions.find((i) => i.id === dept.institutionId)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={dept.isActive ? "default" : "secondary"} className="text-[10px]">
                      {dept.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(dept)}>Edit</Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="text-destructive hover:text-destructive"
                    >Delete</Button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No departments yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Department</DialogTitle></DialogHeader>
          <form id="create-dept-form" onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input id="create-dept-name" placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
              <Input id="create-dept-code" placeholder="Code" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} required />
              <Select id="create-dept-inst" value={createForm.institutionId} onChange={(e) => setCreateForm({ ...createForm, institutionId: e.target.value })}>
                <option value="">No institution</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </div>
            <Textarea id="create-dept-desc" placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" form="create-dept-form" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          <form id="edit-dept-form" onSubmit={handleEdit} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input id="edit-dept-name" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              <Input id="edit-dept-code" placeholder="Code" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} required />
              <Select id="edit-dept-inst" value={editForm.institutionId} onChange={(e) => setEditForm({ ...editForm, institutionId: e.target.value })}>
                <option value="">No institution</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </div>
            <Textarea id="edit-dept-desc" placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" form="edit-dept-form" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
