"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Institution = { id: string; name: string; code: string };
type Department = { id: string; name: string; code: string; institutionId: string | null; description: string | null; isActive: boolean };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", institutionId: "", description: "" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [deptRes, instRes] = await Promise.all([
      fetch("/api/admin/departments"), fetch("/api/admin/institutions"),
    ]);
    const deptData = await deptRes.json();
    const instData = await instRes.json();
    setDepartments(Array.isArray(deptData.departments) ? deptData.departments : []);
    setInstitutions(Array.isArray(instData.institutions) ? instData.institutions : []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/departments", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", code: "", institutionId: "", description: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department?")) return;
    await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Department"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Department</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                <Select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })}>
                  <option value="">No institution</option>
                  {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th><th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Institution</th><th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{dept.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dept.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{institutions.find((i) => i.id === dept.institutionId)?.name || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={dept.isActive ? "default" : "secondary"} className="text-[10px]">{dept.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => handleDelete(dept.id)} className="text-destructive hover:text-destructive">Delete</Button></td>
                </tr>
              ))}
              {departments.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No departments yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
