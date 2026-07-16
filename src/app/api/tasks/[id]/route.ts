import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskComments, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      staffId: taskComments.staffId,
      content: taskComments.content,
      createdAt: taskComments.createdAt,
      authorFirstName: staff.firstName,
      authorLastName: staff.lastName,
      authorDesignation: staff.designation,
    })
    .from(taskComments)
    .leftJoin(staff, eq(taskComments.staffId, staff.id))
    .where(eq(taskComments.taskId, id))
    .all();

  const comments = rows.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    staffId: r.staffId,
    content: r.content,
    createdAt: r.createdAt,
    authorFirstName: r.authorFirstName,
    authorLastName: r.authorLastName,
    authorDesignation: r.authorDesignation,
  }));

  return NextResponse.json({ task, comments });
});

function computeCompletedAt(status: string | undefined, currentStatus: string | null): string | null {
  if (status === undefined) return null;
  if (status === "completed") return new Date().toISOString();
  if (currentStatus === "completed" && status !== "completed") return new Date().toISOString();
  return null;
}

async function handleUpdate(request: Request, _session: unknown, context?: { params: Promise<Record<string, string>> }) {
  const { id } = await context!.params;
  const body = await request.json();

  const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = pick(body, ["title", "description", "status", "priority", "assignedToId", "dueDate"]);
  const completedAt = computeCompletedAt(body.status, existing.status);

  const updated = await db
    .update(tasks)
    .set({
      ...fields,
      ...(completedAt !== null ? { completedAt } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, id))
    .returning()
    .get();

  return NextResponse.json({ task: updated });
}

export const PUT = requireAuth(handleUpdate, "tasks:create");
export const PATCH = requireAuth(handleUpdate, "tasks:create");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(taskComments).where(eq(taskComments.taskId, id)).run();
  await db.delete(tasks).where(eq(tasks.id, id)).run();
  return NextResponse.json({ success: true });
}, "tasks:create");
