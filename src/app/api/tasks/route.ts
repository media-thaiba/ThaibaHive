import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { tasks, staff, staffDepartments, departments, staffInstitutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { taskCreateSchema, paginationSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { sendPushNotification } from "@/lib/notifications/push-service";
import { desc, eq, and, or, inArray, asc, sql } from "drizzle-orm";
import { verifyTaskStaffAffiliation, resolveActorInstitution } from "@/lib/tasks/ledger";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "all";

  const pagination = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;
  const scopedInstitutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));

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
  // - super_admin/admin: see all in scoped institution (or all globally if super_admin)
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
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    conditions.push(eq(tasks.institutionId, scopedInstitutionId));
  }
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

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(whereClause)
    .get();
  const total = countResult?.count ?? 0;

  if (whereClause) {
    query = query.where(whereClause) as typeof query;
  }

  const rows = await query.limit(limit).offset(offset).all();
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

  return NextResponse.json({ tasks: all, total, page, limit });
}, "tasks:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, description, priority, status, assignedToId, departmentId, dueDate } = parsed.data;
  
  // Resolve effective institutional boundary for task
  const callerInstitutionId = await resolveActorInstitution(session);
  const scopedInstitutionId = await resolveScopedInstitutionId(callerInstitutionId || session.institutionId);
  const targetInstId = scopedInstitutionId !== "global" ? scopedInstitutionId : (callerInstitutionId || null);

  // Cross-tenant staff assignment check: if assignedToId is provided and task is scoped to an institution,
  // verify assigned staff belongs to the target institution
  if (assignedToId && targetInstId) {
    const isAffiliated = await verifyTaskStaffAffiliation(assignedToId, targetInstId);
    if (!isAffiliated) {
      return NextResponse.json(
        { error: "Assigned staff member is not affiliated with the target institution" },
        { status: 400 }
      );
    }
  }

  // Find the max sortOrder in the target status list to insert the new task at the end
  const maxRow = await db
    .select({ maxOrder: sql<number>`max(sort_order)` })
    .from(tasks)
    .where(
      targetInstId
        ? and(eq(tasks.status, status || "todo"), eq(tasks.institutionId, targetInstId))
        : eq(tasks.status, status || "todo")
    )
    .get();
  
  const nextOrder = maxRow?.maxOrder !== undefined && maxRow.maxOrder !== null 
    ? maxRow.maxOrder + 1 
    : 0;

  const task = await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      title,
      description: description || null,
      priority: priority || "medium",
      status: status || "todo",
      assignedToId: assignedToId || null,
      assignedById: session.staffId,
      departmentId: departmentId || null,
      dueDate: dueDate || null,
      sortOrder: nextOrder,
      institutionId: targetInstId,
    })
    .returning()
    .get();

  if (task && task.assignedToId) {
    const triggerPush = async () => {
      try {
        await sendPushNotification({
          staffId: task.assignedToId!,
          title: `New Task Assigned: ${task.title}`,
          message: task.description || "A new task has been assigned to you.",
          type: "task",
          referenceType: "task",
          referenceId: task.id,
        });
      } catch (err) {
        console.error("[PushNotification] Task assignment push failed:", err);
      }
    };

    try {
      after(triggerPush);
    } catch {
      // In standalone tests or execution environments where after() is called outside request scope
      void triggerPush();
    }
  }

  return NextResponse.json({ task }, { status: 201 });
}, "tasks:create");
