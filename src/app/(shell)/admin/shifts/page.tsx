"use client";

import { useState } from "react";

type Shift = {
  id: string; name: string; startTime: string; endTime: string;
  gracePeriodMinutes: number; departmentId: string | null;
  applicableToAll: boolean; isActive: boolean;
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", startTime: "", endTime: "", gracePeriodMinutes: 15 });

  useState(() => { fetchData(); });

  async function fetchData() {
    const res = await fetch("/api/admin/shifts");
    setShifts((await res.json()).shifts);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", startTime: "", endTime: "", gracePeriodMinutes: 15 });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this shift?")) return;
    await fetch(`/api/admin/shifts/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shifts</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {showForm ? "Cancel" : "Add Shift"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Shift name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            <input type="number" placeholder="Grace period (min)" value={form.gracePeriodMinutes} onChange={(e) => setForm({ ...form, gracePeriodMinutes: Number(e.target.value) })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <label className="text-sm">
              Start time
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </label>
            <label className="text-sm">
              End time
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </label>
          </div>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create</button>
        </form>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Start</th>
              <th className="px-4 py-3 text-left font-medium">End</th>
              <th className="px-4 py-3 text-left font-medium">Grace</th>
              <th className="px-4 py-3 text-left font-medium">Scope</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.startTime}</td>
                <td className="px-4 py-3">{s.endTime}</td>
                <td className="px-4 py-3">{s.gracePeriodMinutes}m</td>
                <td className="px-4 py-3">{s.applicableToAll ? "All" : "Department"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
