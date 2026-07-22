import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffChecklistTasks, staffChecklists } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { isCompleted } = body;

  if (isCompleted === undefined) {
    return NextResponse.json(
      { error: "isCompleted is required" },
      { status: 400 }
    );
  }

  const task = await db
    .select()
    .from(staffChecklistTasks)
    .where(eq(staffChecklistTasks.id, id))
    .get();

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const checklist = await db
    .select()
    .from(staffChecklists)
    .where(eq(staffChecklists.id, task.checklistId))
    .get();

  if (!checklist) {
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }

  if (
    session.role !== "super_admin" &&
    session.role !== "admin" &&
    !(await canAccessStaff(session.staffId, session.role, checklist.staffId))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    isCompleted,
  };

  if (isCompleted) {
    updates.completedById = session.staffId;
    updates.completedAt = new Date().toISOString();
  } else {
    updates.completedById = null;
    updates.completedAt = null;
  }

  const updated = await db
    .update(staffChecklistTasks)
    .set(updates)
    .where(eq(staffChecklistTasks.id, id))
    .returning()
    .get();

  return NextResponse.json({ task: updated });
});
