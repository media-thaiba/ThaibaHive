"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import {
  FileText,
  AlignLeft,
  Flag,
  Calendar,
  User,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function NewTaskPage() {
  const router = useRouter();
  const { staff } = useAuth();
  const [staffList, setStaffList] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [tomorrow] = useState(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedToId: "",
    dueDate: tomorrow,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      .catch((e) => {
        setError("Failed to load staff list");
        console.error(e);
      });
  }, [staff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
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
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Create New Task"
          description="Assign a new task to yourself or a team member"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
        />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Task Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="error">
                  <p>{error}</p>
                </Alert>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Task Title
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter a clear, descriptive title"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                  <AlignLeft className="h-4 w-4 text-muted-foreground" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Provide details about the task requirements, goals, and any relevant context"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Optional — add context to help the assignee understand the task
                </p>
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center gap-2 text-sm font-medium">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    Priority
                  </Label>
                  <Select
                    id="priority"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="assignee" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Assign To
                </Label>
                <Select
                  id="assignee"
                  value={form.assignedToId}
                  onChange={(e) =>
                    setForm({ ...form, assignedToId: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  {staffList.length > 0
                    ? `${staffList.length} team members available`
                    : "Loading team members..."}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
