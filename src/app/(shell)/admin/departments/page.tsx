"use client";

import { useState } from "react";

type Institution = { id: string; name: string; code: string };
type Department = {
  id: string; name: string; code: string; institutionId: string | null;
  description: string | null; isActive: boolean;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", institutionId: "", description: "" });

  useState(() => { fetchData(); });

  async function fetchData() {
    const [deptRes, instRes] = await Promise.all([
      fetch("/api/admin/departments"),
      fetch("/api/admin/institutions"),
    ]);
    setDepartments((await deptRes.json()).departments);
    setInstitutions((await instRes.json()).institutions);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {showForm ? "Cancel" : "Add Department"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            <select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">No institution</option>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create</button>
        </form>
      )}

      <div className="rounded-lg border">
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
              <tr key={dept.id} className="border-b last:border-0">
                <td className="px-4 py-3">{dept.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{dept.code}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {institutions.find((i) => i.id === dept.institutionId)?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dept.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {dept.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(dept.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
