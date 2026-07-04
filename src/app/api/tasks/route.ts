import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();
  return NextResponse.json({ tasks: all });
}, "tasks:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { title, description, priority, assignedToId, departmentId, dueDate } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const task = await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      title,
      description,
      priority: priority || "medium",
      assignedToId,
      assignedById: session.staffId,
      departmentId,
      dueDate,
    })
    .returning()
    .get();

  return NextResponse.json({ task }, { status: 201 });
}, "tasks:create");
