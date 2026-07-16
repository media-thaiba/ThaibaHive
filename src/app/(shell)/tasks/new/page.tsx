"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function NewTaskPage() {
  const router = useRouter();
  const { staff } = useAuth();
  const [staffList, setStaffList] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [tomorrow] = useState(() => new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium",
    assignedToId: "", dueDate: tomorrow,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => {
        setStaffList(Array.isArray(d.staff) ? d.staff : []);
        if (staff?.id) {
          setForm((prev) => {
            if (!prev.assignedToId) {
              return { ...prev, assignedToId: staff.id };
            }
            return prev;
          });
        }
      })
      .catch((e) => { setError("Failed to load staff list"); console.error(e); });
  }, [staff]);

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
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>Assign To</Label>
          <Select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
            <option value="">Unassigned</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit">Create Task</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
