"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Institution = {
  id: string; name: string; code: string; type: string;
  address: string | null; phone: string | null; email: string | null; isActive: boolean;
};

const emptyForm = { name: "", code: "", type: "campus", address: "", phone: "", email: "" };

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);

  // Edit state
  const [editTarget, setEditTarget] = useState<Institution | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const fetchData = useCallback(() => {
    fetch("/api/admin/institutions")
      .then((r) => r.json())
      .then((data) => setInstitutions(Array.isArray(data.institutions) ? data.institutions : []))
      .catch(() => toast.error("Failed to load institutions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(inst: Institution) {
    setEditTarget(inst);
    setEditForm({
      name: inst.name, code: inst.code, type: inst.type,
      address: inst.address ?? "", phone: inst.phone ?? "", email: inst.email ?? "",
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/institutions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Create failed"); return; }
      toast.success("Institution created");
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
      const res = await fetch(`/api/admin/institutions/${editTarget.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Update failed"); return; }
      toast.success("Institution updated");
      setEditTarget(null);
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/institutions/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Delete failed"); return; }
    toast.success("Institution deleted");
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
        <h1 className="text-2xl font-bold">Institutions</h1>
        <Button onClick={() => setShowCreate(true)}>Add Institution</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => (
                <tr key={inst.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{inst.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.code}</td>
                  <td className="px-4 py-3 capitalize text-xs">{inst.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inst.isActive ? "default" : "secondary"} className="text-[10px]">
                      {inst.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(inst)}>Edit</Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleDelete(inst.id, inst.name)}
                      className="text-destructive hover:text-destructive"
                    >Delete</Button>
                  </td>
                </tr>
              ))}
              {institutions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No institutions yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Institution</DialogTitle></DialogHeader>
          <form id="create-inst-form" onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input id="create-inst-name" placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
              <Input id="create-inst-code" placeholder="Code" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} required />
              <Select id="create-inst-type" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                <option value="campus">Campus</option>
                <option value="college">College</option>
                <option value="school">School</option>
              </Select>
              <Input id="create-inst-phone" placeholder="Phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
            </div>
            <Input id="create-inst-address" placeholder="Address" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} />
            <Input id="create-inst-email" type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" form="create-inst-form" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Institution</DialogTitle></DialogHeader>
          <form id="edit-inst-form" onSubmit={handleEdit} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input id="edit-inst-name" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              <Input id="edit-inst-code" placeholder="Code" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} required />
              <Select id="edit-inst-type" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                <option value="campus">Campus</option>
                <option value="college">College</option>
                <option value="school">School</option>
              </Select>
              <Input id="edit-inst-phone" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <Input id="edit-inst-address" placeholder="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            <Input id="edit-inst-email" type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" form="edit-inst-form" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
