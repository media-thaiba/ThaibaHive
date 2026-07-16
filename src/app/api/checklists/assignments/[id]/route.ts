import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  staffChecklists,
  staffChecklistTasks,
  staff,
  checklistTemplates,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, asc, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;

  const assignment = await db
    .select({
      id: staffChecklists.id,
      staffId: staffChecklists.staffId,
      templateId: staffChecklists.templateId,
      type: staffChecklists.type,
      status: staffChecklists.status,
      startedAt: staffChecklists.startedAt,
      completedAt: staffChecklists.completedAt,
      notes: staffChecklists.notes,
      createdById: staffChecklists.createdById,
      createdAt: staffChecklists.createdAt,
      updatedAt: staffChecklists.updatedAt,
      staffName: sql`${staff.firstName} || ' ' || ${staff.lastName}`,
      templateName: checklistTemplates.name,
    })
    .from(staffChecklists)
    .leftJoin(staff, eq(staffChecklists.staffId, staff.id))
    .leftJoin(
      checklistTemplates,
      eq(staffChecklists.templateId, checklistTemplates.id)
    )
    .where(eq(staffChecklists.id, id))
    .get();

  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    session.role !== "super_admin" &&
    session.role !== "admin" &&
    assignment.staffId !== session.staffId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await db
    .select()
    .from(staffChecklistTasks)
    .where(eq(staffChecklistTasks.checklistId, id))
    .orderBy(asc(staffChecklistTasks.order))
    .all();

  return NextResponse.json({ assignment, tasks });
}, "staff:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status, notes } = body;

  const assignment = await db
    .select()
    .from(staffChecklists)
    .where(eq(staffChecklists.id, id))
    .get();

  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    session.role !== "super_admin" &&
    session.role !== "admin" &&
    assignment.staffId !== session.staffId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (status !== undefined) {
    updates.status = status;
    if (status === "in_progress" && !assignment.startedAt) {
      updates.startedAt = new Date().toISOString();
    }
    if (status === "completed") {
      updates.completedAt = new Date().toISOString();
    }
  }
  if (notes !== undefined) updates.notes = notes;

  const updated = await db
    .update(staffChecklists)
    .set(updates)
    .where(eq(staffChecklists.id, id))
    .returning()
    .get();

  return NextResponse.json({ assignment: updated });
});

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  await db
    .delete(staffChecklistTasks)
    .where(eq(staffChecklistTasks.checklistId, id))
    .run();
  await db
    .delete(staffChecklists)
    .where(eq(staffChecklists.id, id))
    .run();

  return NextResponse.json({ success: true });
}, "org:manage");
