"use client";

import { useState } from "react";

type Department = { id: string; name: string };
type SubDepartment = {
  id: string; name: string; code: string | null;
  departmentId: string; description: string | null; isActive: boolean;
};

export default function SubDepartmentsPage() {
  const [subDepts, setSubDepts] = useState<SubDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", departmentId: "", description: "" });

  useState(() => { fetchData(); });

  async function fetchData() {
    const [subRes, deptRes] = await Promise.all([
      fetch("/api/admin/sub-departments"),
      fetch("/api/admin/departments"),
    ]);
    setSubDepts((await subRes.json()).subDepartments);
    setDepartments((await deptRes.json()).departments);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/sub-departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", code: "", departmentId: "", description: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sub-department?")) return;
    await fetch(`/api/admin/sub-departments/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sub-departments</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {showForm ? "Cancel" : "Add Sub-department"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
              <th className="px-4 py-3 text-left font-medium">Department</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subDepts.map((sub) => (
              <tr key={sub.id} className="border-b last:border-0">
                <td className="px-4 py-3">{sub.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{sub.code || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {departments.find((d) => d.id === sub.departmentId)?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sub.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {sub.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(sub.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
