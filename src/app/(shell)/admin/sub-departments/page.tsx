"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type SubDept = { id: string; name: string; code: string; departmentId: string; headOfSubDepartment: string | null; isActive: boolean };

export default function SubDepartmentsPage() {
  const [subDepts, setSubDepts] = useState<SubDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", departmentId: "", headOfSubDepartment: "" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const res = await fetch("/api/admin/sub-departments");
    const data = await res.json();
    setSubDepts(Array.isArray(data.subDepartments) ? data.subDepartments : []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/sub-departments", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", code: "", departmentId: "", headOfSubDepartment: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sub-department?")) return;
    await fetch(`/api/admin/sub-departments/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sub-Departments</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Sub-Department"}
        </Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Sub-Department</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="px-4 py-3 text-left font-medium">Name</th><th className="px-4 py-3 text-left font-medium">Code</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody>
              {subDepts.map((sd) => (
                <tr key={sd.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{sd.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sd.code}</td>
                  <td className="px-4 py-3"><Badge variant={sd.isActive ? "default" : "secondary"} className="text-[10px]">{sd.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => handleDelete(sd.id)} className="text-destructive hover:text-destructive">Delete</Button></td>
                </tr>
              ))}
              {subDepts.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No sub-departments yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
