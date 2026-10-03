import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { canAccessTask } from "@/lib/auth/department-scope";

const reorderSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      sortOrder: z.number(),
    })
  ),
});

export const PATCH = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const taskIds = parsed.data.tasks.map((t) => t.id);
  if (taskIds.length === 0) {
    return NextResponse.json({ success: true });
  }

  const dbTasks = await db.select().from(tasks).where(inArray(tasks.id, taskIds)).all();
  if (dbTasks.length !== taskIds.length) {
    return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
  }

  if (session.role !== "super_admin" && session.role !== "admin") {
    for (const t of dbTasks) {
      const hasAccess = await canAccessTask(session.staffId, session.role, t);
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }


  // Update all tasks' statuses and sort orders inside a transaction to ensure database consistency
  await db.transaction(async (tx) => {
    for (const item of parsed.data.tasks) {
      await tx
        .update(tasks)
        .set({
          status: item.status,
          sortOrder: item.sortOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, item.id));
    }
  });

  return NextResponse.json({ success: true });
}, "tasks:create");
