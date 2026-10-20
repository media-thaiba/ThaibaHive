import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, inArray } from "drizzle-orm";
import { canAccessTask } from "@/lib/auth/department-scope";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { taskReorderSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { computeCompletedAt, resolveActorInstitution } from "@/lib/tasks/ledger";

export const PATCH = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = taskReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const taskIds = parsed.data.tasks.map((t) => t.id);
  if (taskIds.length === 0) {
    return NextResponse.json({ success: true });
  }

  // Determine effective institution of the actor
  const actorInstId = await resolveActorInstitution(session);
  const resolvedInstId = await resolveScopedInstitutionId(actorInstId || session.institutionId);
  const effectiveInstitutionId = resolvedInstId !== "global" ? resolvedInstId : actorInstId;

  const dbTasks = await db.select().from(tasks).where(inArray(tasks.id, taskIds)).all();
  if (dbTasks.length !== taskIds.length) {
    return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
  }

  // Cross-tenant boundary enforcement:
  // Non-super_admin users cannot touch tasks belonging to other institutions
  if (session.role !== "super_admin" && effectiveInstitutionId) {
    const hasCrossTenantTask = dbTasks.some((t) => t.institutionId && t.institutionId !== effectiveInstitutionId);
    if (hasCrossTenantTask) {
      return NextResponse.json({ error: "Cannot modify tasks outside your institution" }, { status: 403 });
    }
  }

  // Department / Assignee scope enforcement for HOD and Staff
  if (session.role !== "super_admin" && session.role !== "admin") {
    for (const t of dbTasks) {
      const hasAccess = await canAccessTask(session.staffId, session.role, t);
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const taskMap = new Map(dbTasks.map((t) => [t.id, t]));

  // Update all tasks' statuses and sort orders inside a transaction
  await db.transaction(async (tx) => {
    for (const item of parsed.data.tasks) {
      const existing = taskMap.get(item.id);
      const completedAt = computeCompletedAt(item.status, existing?.completedAt);

      const updateData: Record<string, unknown> = {
        status: item.status,
        sortOrder: item.sortOrder,
        updatedAt: new Date().toISOString(),
      };
      if (completedAt !== undefined) {
        updateData.completedAt = completedAt;
      }

      await tx
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, item.id));
    }
  });

  return NextResponse.json({ success: true });
}, "tasks:update");
