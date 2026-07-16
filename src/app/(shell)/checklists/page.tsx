"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Task = {
  id: string;
  checklistId: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  order: number;
};

type Assignment = {
  id: string;
  templateName: string | null;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  pending: "secondary",
  in_progress: "warning",
  completed: "success",
  cancelled: "outline",
};

export default function MyChecklistsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/checklists/assignments")
      .then((r) => r.json())
      .then((d) => {
        setAssignments(Array.isArray(d.assignments) ? d.assignments : []);
        setLoading(false);
      });
  }, []);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!tasksMap[id]) {
      const res = await fetch(`/api/checklists/assignments/${id}`);
      const d = await res.json();
      setTasksMap((prev) => ({ ...prev, [id]: Array.isArray(d.tasks) ? d.tasks : [] }));
    }
  }

  async function toggleTask(taskId: string, isCompleted: boolean) {
    await fetch(`/api/checklists/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted }),
    });
    const res = await fetch(`/api/checklists/assignments/${expandedId}`);
    const d = await res.json();
    setTasksMap((prev) => ({ ...prev, [expandedId!]: Array.isArray(d.tasks) ? d.tasks : [] }));
    const aRes = await fetch("/api/checklists/assignments");
    const aD = await aRes.json();
    setAssignments(Array.isArray(aD.assignments) ? aD.assignments : []);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/checklists/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const res = await fetch("/api/checklists/assignments");
    const d = await res.json();
    setAssignments(Array.isArray(d.assignments) ? d.assignments : []);
  }

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  if (assignments.length === 0) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          title="No checklists yet"
          description="Your assigned onboarding and offboarding checklists will appear here."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-bold">My Checklists</h1>

      {assignments.map((a) => {
        const tasks = tasksMap[a.id] || [];
        const completed = tasks.filter((t) => t.isCompleted).length;
        const isExpanded = expandedId === a.id;

        return (
          <Card key={a.id}>
            <CardHeader className="cursor-pointer" onClick={() => toggleExpand(a.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>{a.templateName || "Checklist"}</CardTitle>
                  <Badge variant={a.type === "onboarding" ? "default" : "warning"} className="capitalize text-[10px]">
                    {a.type}
                  </Badge>
                  <Badge variant={statusColors[a.status] || "secondary"} className="capitalize text-[10px]">
                    {a.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {tasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {completed}/{tasks.length} done
                    </span>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-3">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: tasks.length > 0 ? `${(completed / tasks.length) * 100}%` : "0%" }}
                  />
                </div>

                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks in this checklist.</p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={(e) => toggleTask(task.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}

                <div className="flex gap-2 pt-2">
                  {a.status === "pending" && (
                    <Button size="sm" onClick={() => updateStatus(a.id, "in_progress")}>Start</Button>
                  )}
                  {a.status === "in_progress" && (
                    <Button size="sm" variant="default" onClick={() => updateStatus(a.id, "completed")}>Mark Complete</Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
