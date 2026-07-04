"use client";

import { useState } from "react";

type LeaveRequest = {
  id: string; leaveTypeId: string; startDate: string; endDate: string;
  daysCount: number; reason: string | null; status: string; appliedAt: string;
};
type LeaveType = { id: string; name: string; code: string; daysAllowed: number };

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: "", startDate: "", endDate: "", daysCount: 1, reason: "",
  });
  const [error, setError] = useState("");

  useState(() => {
    Promise.all([
      fetch("/api/leaves").then(r => r.json()),
      fetch("/api/leaves/types").then(r => r.json()),
    ]).then(([leaveData, typeData]) => {
      setLeaves(leaveData.leaves);
      setLeaveTypes(typeData.leaveTypes);
      setLoading(false);
    });
  });

  function calcDays() {
    if (!form.startDate || !form.endDate) return;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setForm({ ...form, daysCount: Math.max(1, diff) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to submit leave");
      return;
    }

    setShowForm(false);
    setForm({ leaveTypeId: "", startDate: "", endDate: "", daysCount: 1, reason: "" });
    const data = await fetch("/api/leaves").then(r => r.json());
    setLeaves(data.leaves);
  }

  async function cancelLeave(id: string) {
    if (!confirm("Cancel this leave request?")) return;
    await fetch(`/api/leaves/${id}`, { method: "DELETE" });
    const data = await fetch("/api/leaves").then(r => r.json());
    setLeaves(data.leaves);
  }

  if (loading) return <div className="flex-1 p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {showForm ? "Cancel" : "Apply for Leave"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Leave Type</label>
            <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select type</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.daysAllowed} days)</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required onBlur={calcDays} />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required onBlur={calcDays} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Total days: {form.daysCount}</p>

          <div>
            <label className="text-sm font-medium">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Submit</button>
        </form>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">From</th>
              <th className="px-4 py-3 text-left font-medium">To</th>
              <th className="px-4 py-3 text-left font-medium">Days</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Applied</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-4 py-3">{leaveTypes.find(t => t.id === l.leaveTypeId)?.name || l.leaveTypeId}</td>
                <td className="px-4 py-3">{l.startDate}</td>
                <td className="px-4 py-3">{l.endDate}</td>
                <td className="px-4 py-3">{l.daysCount}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.status === "approved" ? "bg-green-100 text-green-700" :
                    l.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{l.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{l.appliedAt?.split("T")[0]}</td>
                <td className="px-4 py-3 text-right">
                  {l.status === "pending" && (
                    <button onClick={() => cancelLeave(l.id)} className="text-xs text-destructive hover:underline">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
