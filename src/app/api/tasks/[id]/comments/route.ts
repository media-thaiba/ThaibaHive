import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskComments, tasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { canAccessTask } from "@/lib/auth/department-scope";

// "tasks:read" is used intentionally for this self-service write action — staff can comment on tasks they can read
export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  if (!body.content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const hasAccess = await canAccessTask(session.staffId, session.role, task);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await db
    .insert(taskComments)
    .values({
      id: crypto.randomUUID(),
      taskId: id,
      staffId: session.staffId,
      content: body.content,
    })
    .returning()
    .get();

  return NextResponse.json({ comment }, { status: 201 });
}, "tasks:read");

