import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskComments, tasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { canAccessTask } from "@/lib/auth/department-scope";
import { taskCommentSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

// "tasks:read" is used intentionally for this self-service write action — staff can comment on tasks they can read
export const POST = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = taskCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
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
      content: parsed.data.content,
    })
    .returning()
    .get();

  return NextResponse.json({ comment }, { status: 201 });
}, "tasks:read");
