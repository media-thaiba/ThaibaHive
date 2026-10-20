import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskComments, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";
import { canAccessTask } from "@/lib/auth/department-scope";
import { resolveScopedInstitutionId, type SessionPayload } from "@/lib/auth";
import { taskUpdateSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { withTaskLock, canManageTask, verifyTaskStaffAffiliation, computeCompletedAt } from "@/lib/tasks/ledger";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(tasks.id, id), eq(tasks.institutionId, institutionId))
    : eq(tasks.id, id);

  const task = await db.select().from(tasks).where(whereClause).get();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessTask(session.staffId, session.role, task);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
}, "tasks:read");

async function handleUpdate(request: Request, session: SessionPayload, context?: { params: Promise<Record<string, string>> }) {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  return await withTaskLock(id, async () => {
    const whereClause = institutionId && institutionId !== "global"
      ? and(eq(tasks.id, id), eq(tasks.institutionId, institutionId))
      : eq(tasks.id, id);

    const existing = await db.select().from(tasks).where(whereClause).get();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasAccess = await canAccessTask(session.staffId, session.role, existing);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, status, priority, assignedToId, departmentId, dueDate, sortOrder } = parsed.data;

    // Cross-tenant staff assignment check on update
    if (assignedToId && existing.institutionId) {
      const isAffiliated = await verifyTaskStaffAffiliation(assignedToId, existing.institutionId);
      if (!isAffiliated) {
        return NextResponse.json(
          { error: "Assigned staff member is not affiliated with this task's institution" },
          { status: 400 }
        );
      }
    }

    const completedAt = computeCompletedAt(status, existing.completedAt);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (completedAt !== undefined) updateData.completedAt = completedAt;

    const updated = await db
      .update(tasks)
      .set(updateData)
      .where(whereClause)
      .returning()
      .get();

    return NextResponse.json({ task: updated });
  });
}

export const PUT = requireAuth(handleUpdate, "tasks:update");
export const PATCH = requireAuth(handleUpdate, "tasks:update");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(tasks.id, id), eq(tasks.institutionId, institutionId))
    : eq(tasks.id, id);

  return await withTaskLock(id, async () => {
    const existing = await db.select().from(tasks).where(whereClause).get();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authorization: Must have management authority (admin, principal, hod, or original creator)
    const canDelete = canManageTask(
      session,
      {
        institutionId: existing.institutionId || "",
        assignedById: existing.assignedById || "",
        assignedToId: existing.assignedToId || "",
      },
      institutionId !== "global" ? institutionId : null
    );

    if (!canDelete) {
      return NextResponse.json(
        { error: "You do not have permission to delete this task" },
        { status: 403 }
      );
    }

    await db.delete(taskComments).where(eq(taskComments.taskId, id)).run();
    await db.delete(tasks).where(whereClause).run();
    return NextResponse.json({ success: true });
  });
}, "tasks:delete");
