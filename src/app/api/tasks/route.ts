import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, staff, staffDepartments, departments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { taskCreateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { desc, eq, and, or, inArray, asc, sql } from "drizzle-orm";

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

  // RLS Access Filters:
  // - super_admin/admin: see all
  // - principal: see all tasks in their institution, or assigned/created by them
  // - hod: see tasks in their managed departments, or assigned/created by them
  // - staff: see tasks assigned to/by them
  let accessFilter = null;
  if (session.role !== "super_admin" && session.role !== "admin") {
    if (session.role === "principal") {
      const callerInst = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, session.staffId))
        .limit(1);
      const instId = callerInst[0]?.institutionId;
      if (instId) {
        const instDepts = await db
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.institutionId, instId))
          .all();
        const deptIds = instDepts.map((d) => d.id).filter(Boolean);
        if (deptIds.length > 0) {
          accessFilter = or(
            inArray(tasks.departmentId, deptIds),
            eq(tasks.assignedToId, session.staffId),
            eq(tasks.assignedById, session.staffId)
          );
        } else {
          accessFilter = or(
            eq(tasks.assignedToId, session.staffId),
            eq(tasks.assignedById, session.staffId)
          );
        }
      } else {
        accessFilter = or(
          eq(tasks.assignedToId, session.staffId),
          eq(tasks.assignedById, session.staffId)
        );
      }
    } else if (session.role === "hod") {
      const managedDepts = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.headUserId, session.staffId))
        .all();
      const deptIds = managedDepts.map((d) => d.id).filter(Boolean);
      if (deptIds.length > 0) {
        accessFilter = or(
          inArray(tasks.departmentId, deptIds),
          eq(tasks.assignedToId, session.staffId),
          eq(tasks.assignedById, session.staffId)
        );
      } else {
        accessFilter = or(
          eq(tasks.assignedToId, session.staffId),
          eq(tasks.assignedById, session.staffId)
        );
      }
    } else {
      // staff
      accessFilter = or(
        eq(tasks.assignedToId, session.staffId),
        eq(tasks.assignedById, session.staffId)
      );
    }
  }

  const conditions = [];
  if (accessFilter) {
    conditions.push(accessFilter);
  }

  if (scope === "my") {
    conditions.push(eq(tasks.assignedToId, session.staffId));
  } else if (scope === "department") {
    const primaryDept = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(and(eq(staffDepartments.staffId, session.staffId), eq(staffDepartments.isPrimary, true)))
      .get();
    if (primaryDept) {
      conditions.push(eq(tasks.departmentId, primaryDept.departmentId));
    } else {
      conditions.push(sql`1=0`);
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
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
