"use client";

import { useState } from "react";

type Institution = {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "campus", address: "", phone: "", email: "" });

  useState(() => { fetchData(); });

  async function fetchData() {
    const res = await fetch("/api/admin/institutions");
    const data = await res.json();
    setInstitutions(data.institutions);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", code: "", type: "campus", address: "", phone: "", email: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this institution?")) return;
    await fetch(`/api/admin/institutions/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Institutions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {showForm ? "Cancel" : "Add Institution"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="campus">Campus</option>
              <option value="college">College</option>
              <option value="school">School</option>
            </select>
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create</button>
        </form>
      )}

      <div className="rounded-lg border">
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
              <tr key={inst.id} className="border-b last:border-0">
                <td className="px-4 py-3">{inst.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{inst.code}</td>
                <td className="px-4 py-3 capitalize">{inst.type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${inst.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {inst.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(inst.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
