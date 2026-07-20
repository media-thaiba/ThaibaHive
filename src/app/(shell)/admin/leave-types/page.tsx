"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type LeaveType = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  daysAllowed: number;
  requiresApproval: boolean;
  isActive: boolean;
};

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    daysAllowed: "",
    requiresApproval: true,
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch("/api/admin/leave-types");
    const data = await res.json();
    setLeaveTypes(Array.isArray(data.leaveTypes) ? data.leaveTypes : []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", description: "", daysAllowed: "", requiresApproval: true });
    setDialogOpen(true);
  }

  function openEdit(lt: LeaveType) {
    setEditing(lt);
    setForm({
      name: lt.name,
      code: lt.code,
      description: lt.description || "",
      daysAllowed: String(lt.daysAllowed),
      requiresApproval: lt.requiresApproval,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name,
      code: form.code,
      description: form.description || null,
      daysAllowed: parseFloat(form.daysAllowed),
      requiresApproval: form.requiresApproval,
    };

    if (editing) {
      const res = await fetch(`/api/admin/leave-types/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Leave type updated");
        setDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } else {
      const res = await fetch("/api/admin/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Leave type created");
        setDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create");
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this leave type?")) return;
    const res = await fetch(`/api/admin/leave-types/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Leave type deleted");
      fetchData();
    }
  }

  async function toggleActive(lt: LeaveType) {
    await fetch(`/api/admin/leave-types/${lt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !lt.isActive }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Types</h1>
        <Button onClick={openCreate}>Add Leave Type</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Days Allowed</th>
                <th className="px-4 py-3 text-left font-medium">Requires Approval</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map((lt) => (
                <tr key={lt.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{lt.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{lt.code}</td>
                  <td className="px-4 py-3">{lt.daysAllowed}</td>
                  <td className="px-4 py-3">
                    <Badge variant={lt.requiresApproval ? "warning" : "secondary"} className="text-[10px]">
                      {lt.requiresApproval ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => toggleActive(lt)}>
                      <Badge variant={lt.isActive ? "default" : "secondary"} className="text-[10px] cursor-pointer">
                        {lt.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button variant="link" className="h-auto p-0 text-xs text-primary hover:underline" onClick={() => openEdit(lt)}>
                      Edit
                    </Button>
                    <Button variant="link" className="h-auto p-0 text-xs text-destructive hover:underline" onClick={() => handleDelete(lt.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {leaveTypes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No leave types configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Leave Type" : "New Leave Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Casual Leave"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CL"
                required
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Days Allowed (per year)</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.daysAllowed}
                onChange={(e) => setForm({ ...form, daysAllowed: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Requires Approval</label>
              <Select
                value={form.requiresApproval ? "true" : "false"}
                onChange={(e) => setForm({ ...form, requiresApproval: e.target.value === "true" })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
