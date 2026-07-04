"use client";

import { useState } from "react";

type ReportTask = { description: string; hoursSpent: number };

type Report = { id: string; date: string; summary: string | null; status: string };

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], summary: "" });
  const [reportTasks, setReportTasks] = useState<ReportTask[]>([]);

  useState(() => { fetch("/api/reports").then(r => r.json()).then(d => { const data = d as { reports: Report[] }; setReports(data.reports); setLoading(false); }); });

  function addTask() {
    setReportTasks([...reportTasks, { description: "", hoursSpent: 0 }]);
  }

  function updateTask(i: number, field: keyof ReportTask, value: string | number) {
    const updated = [...reportTasks] as ReportTask[];
    if (field === "description") updated[i].description = value as string;
    if (field === "hoursSpent") updated[i].hoursSpent = value as number;
    setReportTasks(updated);
  }

  function removeTask(i: number) {
    setReportTasks(reportTasks.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        summary: form.summary,
        tasks: reportTasks.filter((t) => t.description),
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setForm({ date: new Date().toISOString().split("T")[0], summary: "" });
      setReportTasks([]);
      const data = await fetch("/api/reports").then(r => r.json());
      setReports(data.reports);
    }
  }

  if (loading) return <div className="flex-1 p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Work Reports</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {showForm ? "Cancel" : "New Report"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>

          <div>
            <label className="text-sm font-medium">Summary</label>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tasks Completed</span>
              <button type="button" onClick={addTask} className="text-xs text-primary hover:underline">+ Add task</button>
            </div>
            <div className="space-y-2">
              {reportTasks.map((task, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input placeholder="Task description" value={task.description} onChange={(e) => updateTask(i, "description", e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <input type="number" placeholder="Hours" value={task.hoursSpent || ""} onChange={(e) => updateTask(i, "hoursSpent", Number(e.target.value))} className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <button type="button" onClick={() => removeTask(i)} className="text-xs text-destructive hover:underline mt-2">Remove</button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Submit Report</button>
        </form>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Summary</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-md truncate">{r.summary || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.status === "submitted" ? "bg-blue-100 text-blue-700" :
                    r.status === "reviewed" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
