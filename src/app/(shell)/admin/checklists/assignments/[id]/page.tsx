"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Task = {
  id: string;
  checklistId: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedById: string | null;
  completedAt: string | null;
  order: number;
};

type Assignment = {
  id: string;
  staffId: string;
  staffName: string;
  templateId: string | null;
  templateName: string | null;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
};

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  pending: "secondary",
  in_progress: "warning",
  completed: "success",
  cancelled: "outline",
};

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/checklists/assignments/${id}`);
    const d = await res.json();
    setAssignment(d.assignment);
    setTasks(Array.isArray(d.tasks) ? d.tasks : []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleTask(taskId: string, isCompleted: boolean) {
    await fetch(`/api/checklists/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted }),
    });
    fetchData();
  }

  async function updateStatus(status: string) {
    await fetch(`/api/checklists/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  const completedCount = tasks.filter((t) => t.isCompleted).length;

  if (loading) return <div className="flex-1 p-6"><div className="h-8 w-48 animate-pulse rounded bg-muted" /></div>;
  if (!assignment) return <div className="flex-1 p-6 text-muted-foreground">Assignment not found</div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{assignment.staffName}</h1>
            <Badge variant={assignment.type === "onboarding" ? "default" : "warning"} className="capitalize">
              {assignment.type}
            </Badge>
            <Badge variant={statusColors[assignment.status] || "secondary"} className="capitalize">
              {assignment.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignment.templateName || "No template"} &middot; Created{" "}
            {new Date(assignment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/checklists/assignments")}>
          Back
        </Button>
      </div>

      <div className="flex gap-2">
        {assignment.status === "pending" && (
          <Button size="sm" onClick={() => updateStatus("in_progress")}>Start</Button>
        )}
        {assignment.status === "in_progress" && (
          <Button size="sm" variant="default" onClick={() => updateStatus("completed")}>Complete</Button>
        )}
        {assignment.status !== "cancelled" && assignment.status !== "completed" && (
          <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelled")}>Cancel</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({completedCount}/{tasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : "0%" }}
            />
          </div>
          {tasks.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No tasks yet</p>
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
                  {task.completedAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Completed {new Date(task.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
