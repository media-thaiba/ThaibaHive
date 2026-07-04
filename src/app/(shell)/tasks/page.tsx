"use client";

import { useState } from "react";
import Link from "next/link";

type Task = {
  id: string; title: string; description: string | null;
  status: string; priority: string; assignedToId: string | null;
  dueDate: string | null; createdAt: string;
};

const columns = ["todo", "in_progress", "review", "completed"] as const;
const columnLabels: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Completed",
};
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => { fetch("/api/tasks").then(r => r.json()).then(d => { setTasks(d.tasks); setLoading(false); }); });

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  if (loading) return <div className="flex-1 p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Link href="/tasks/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          New Task
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col} className="rounded-lg border bg-muted/20">
            <div className="border-b px-3 py-2 text-sm font-medium">{columnLabels[col]}</div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {tasks.filter((t) => t.status === col).map((task) => (
                <div key={task.id} className="rounded-md border bg-background p-3 space-y-2">
                  <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline block">
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority] || ""}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && <span className="text-xs text-muted-foreground">{task.dueDate}</span>}
                  </div>
                  <div className="flex gap-1">
                    {col !== "todo" && <button onClick={() => updateStatus(task.id, columns[columns.indexOf(col) - 1])} className="text-xs text-muted-foreground hover:text-foreground">←</button>}
                    {col !== "completed" && <button onClick={() => updateStatus(task.id, columns[columns.indexOf(col) + 1])} className="text-xs text-muted-foreground hover:text-foreground">→</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
