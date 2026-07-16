"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  type TaskData = { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null };
  type CommentData = {
    id: string;
    content: string;
    createdAt: string;
    authorFirstName?: string | null;
    authorLastName?: string | null;
    authorDesignation?: string | null;
  };
  const [task, setTask] = useState<TaskData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then(r => r.json())
      .then(data => {
        setTask(data.task);
        setComments(data.comments || []);
        setLoading(false);
      })
      .catch(() => toast.error("Failed to load task"));
  }, [id]);

  async function addComment() {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/tasks/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments([...comments, data.comment]);
      setNewComment("");
    }
  }

  async function updateStatus(status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTask({ ...(task as TaskData), status });
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 max-w-2xl space-y-6">
        <Skeleton className="h-4 w-16" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      </div>
    );
  }
  if (!task) return <div className="flex-1 p-6 text-sm text-destructive">Task not found</div>;

  return (
    <div className="flex-1 p-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
        &larr; Back
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <Badge variant={
            task.priority === "urgent" ? "destructive" :
            task.priority === "high" ? "warning" :
            "info"
          }>
            {task.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{task.description || "No description"}</p>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <Badge variant={
            task.status === "todo" ? "secondary" :
            task.status === "in_progress" ? "info" :
            task.status === "review" ? "warning" :
            "success"
          }>
            {task.status.replace("_", " ")}
          </Badge>
          {task.dueDate && <span>Due: {task.dueDate}</span>}
        </div>
        <div className="mt-3 flex gap-2">
          {["todo", "in_progress", "review", "completed"].filter(s => s !== task.status).map(s => (
            <Button key={s} variant="outline" size="sm" onClick={() => updateStatus(s)}>
              Move to {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Comments ({comments.length})</h2>
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                {c.authorFirstName && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                      {c.authorFirstName[0]}{c.authorLastName?.[0] || ""}
                    </div>
                    <span className="text-xs font-medium">
                      {c.authorFirstName} {c.authorLastName}
                    </span>
                    {c.authorDesignation && (
                      <span className="text-xs text-muted-foreground">· {c.authorDesignation}</span>
                    )}
                  </div>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{c.createdAt?.split("T")[0]}</span>
              </div>
              <p className="text-sm">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet</p>}
        </div>
        <div className="flex gap-2">
          <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => e.key === "Enter" && addComment()} />
          <Button onClick={addComment}>Send</Button>
        </div>
      </div>
    </div>
  );
}
