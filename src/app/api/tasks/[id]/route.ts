import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskComments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await db.select().from(taskComments).where(eq(taskComments.taskId, id)).all();
  return NextResponse.json({ task, comments });
});

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const updated = await db
    .update(tasks)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))
    .returning()
    .get();

  return NextResponse.json({ task: updated });
}, "tasks:create");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(taskComments).where(eq(taskComments.taskId, id)).run();
  await db.delete(tasks).where(eq(tasks.id, id)).run();
  return NextResponse.json({ success: true });
}, "tasks:create");
