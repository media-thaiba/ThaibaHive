"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  type TaskData = { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null };
  type CommentData = { id: string; content: string; createdAt: string };
  const [task, setTask] = useState<TaskData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  useState(() => {
    fetch(`/api/tasks/${id}`).then(r => r.json()).then(data => {
      setTask(data.task);
      setComments(data.comments || []);
      setLoading(false);
    });
  });

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

  if (loading) return <div className="flex-1 p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!task) return <div className="flex-1 p-6 text-sm text-destructive">Task not found</div>;

  return (
    <div className="flex-1 p-6 max-w-2xl">
      <button onClick={() => router.back()} className="mb-4 text-sm text-muted-foreground hover:underline">&larr; Back</button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            task.priority === "urgent" ? "bg-red-100 text-red-700" :
            task.priority === "high" ? "bg-amber-100 text-amber-700" :
            "bg-blue-100 text-blue-700"
          }`}>{task.priority}</span>
        </div>
        <p className="text-sm text-muted-foreground">{task.description || "No description"}</p>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${
            task.status === "todo" ? "bg-gray-100" :
            task.status === "in_progress" ? "bg-blue-100 text-blue-700" :
            task.status === "review" ? "bg-amber-100 text-amber-700" :
            "bg-green-100 text-green-700"
          }`}>{task.status.replace("_", " ")}</span>
          {task.dueDate && <span>Due: {task.dueDate}</span>}
        </div>
        <div className="mt-3 flex gap-2">
          {["todo", "in_progress", "review", "completed"].filter(s => s !== task.status).map(s => (
            <button key={s} onClick={() => updateStatus(s)} className="rounded-md border border-input px-3 py-1 text-xs hover:bg-muted">
              Move to {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Comments ({comments.length})</h2>
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">{c.createdAt?.split("T")[0]}</p>
              <p className="text-sm">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet</p>}
        </div>
        <div className="flex gap-2">
          <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" onKeyDown={(e) => e.key === "Enter" && addComment()} />
          <button onClick={addComment} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Send</button>
        </div>
      </div>
    </div>
  );
}
