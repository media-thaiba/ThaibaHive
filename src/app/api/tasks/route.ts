import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, staff, staffDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { taskCreateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { desc, eq, and, asc, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "all";

  let query = db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignedToId: tasks.assignedToId,
      assignedById: tasks.assignedById,
      departmentId: tasks.departmentId,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      sortOrder: tasks.sortOrder,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeFirstName: staff.firstName,
      assigneeLastName: staff.lastName,
    })
    .from(tasks)
    .leftJoin(staff, eq(tasks.assignedToId, staff.id))
    .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));

  if (scope === "my") {
    query = query.where(eq(tasks.assignedToId, session.staffId)) as typeof query;
  } else if (scope === "department") {
    const primaryDept = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(and(eq(staffDepartments.staffId, session.staffId), eq(staffDepartments.isPrimary, true)))
      .get();
    if (primaryDept) {
      query = query.where(eq(tasks.departmentId, primaryDept.departmentId)) as typeof query;
    }
  }

  const rows = await query.all();
  const all = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    assignedToId: r.assignedToId,
    assignedById: r.assignedById,
    departmentId: r.departmentId,
    dueDate: r.dueDate,
    completedAt: r.completedAt,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    assignee: r.assigneeFirstName
      ? { firstName: r.assigneeFirstName, lastName: r.assigneeLastName }
      : null,
  }));

  return NextResponse.json({ tasks: all });
}, "tasks:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json();
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, description, priority, assignedToId, departmentId, dueDate } = parsed.data;

  // Find the max sortOrder in the 'todo' list to insert the new task at the end
  const maxRow = await db
    .select({ maxOrder: sql<number>`max(sort_order)` })
    .from(tasks)
    .where(eq(tasks.status, "todo"))
    .get();
  
  const nextOrder = maxRow?.maxOrder !== undefined && maxRow.maxOrder !== null 
    ? maxRow.maxOrder + 1 
    : 0;

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
      sortOrder: nextOrder,
    })
    .returning()
    .get();

  return NextResponse.json({ task }, { status: 201 });
}, "tasks:create");
