"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewTaskPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium",
    assignedToId: "", dueDate: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/staff").then(r => r.json()).then(d => setStaffList(d.staff));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create task");
      return;
    }

    router.push("/tasks");
  }

  return (
    <div className="flex-1 p-6 max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New Task</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Assign To</label>
          <select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create Task</button>
          <button type="button" onClick={() => router.back()} className="rounded-md border border-input px-4 py-2 text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
