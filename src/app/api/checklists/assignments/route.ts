import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  staffChecklists,
  staffChecklistTasks,
  checklistTemplateItems,
  staff,
  checklistTemplates,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { checklistAssignmentCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";
import { getAccessibleStaffIds, canAccessStaff } from "@/lib/auth/department-scope";

export const GET = requireAuth(async (_request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let query = db
    .select({
      id: staffChecklists.id,
      staffId: staffChecklists.staffId,
      templateId: staffChecklists.templateId,
      type: staffChecklists.type,
      status: staffChecklists.status,
      startedAt: staffChecklists.startedAt,
      completedAt: staffChecklists.completedAt,
      notes: staffChecklists.notes,
      createdAt: staffChecklists.createdAt,
      updatedAt: staffChecklists.updatedAt,
      staffName: sql`${staff.firstName} || ' ' || ${staff.lastName}`,
      templateName: checklistTemplates.name,
    })
    .from(staffChecklists);

  if (session.role !== "super_admin" && session.role !== "admin") {
    const staffIds = await getAccessibleStaffIds(session.staffId, session.role);
    const allowedIds = staffIds && staffIds.length > 0 ? staffIds : [session.staffId];
    query = query.where(inArray(staffChecklists.staffId, allowedIds)) as typeof query;
  }

  const assignments = await query
    .leftJoin(staff, eq(staffChecklists.staffId, staff.id))
    .leftJoin(
      checklistTemplates,
      eq(staffChecklists.templateId, checklistTemplates.id)
    )
    .orderBy(desc(staffChecklists.createdAt))
    .all();

  return NextResponse.json({ assignments });
}, "staff:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = checklistAssignmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { staffId, templateId, type, notes } = parsed.data;

  if (session.role !== "super_admin" && session.role !== "admin") {
    const hasAccess = await canAccessStaff(session.staffId, session.role, staffId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const template = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, templateId))
    .get();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const staffMember = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .get();

  if (!staffMember) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const checklistId = randomUUID();

  const assignment = await db
    .insert(staffChecklists)
    .values({
      id: checklistId,
      staffId,
      templateId,
      type,
      notes: notes ?? null,
      createdById: session.staffId,
    })
    .returning()
    .get();

  const templateItems = await db
    .select()
    .from(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, templateId))
    .orderBy(asc(checklistTemplateItems.order))
    .all();

  if (templateItems.length > 0) {
    await db
      .insert(staffChecklistTasks)
      .values(
        templateItems.map((item) => ({
          id: randomUUID(),
          checklistId,
          title: item.title,
          description: item.description,
          order: item.order,
        }))
      )
      .run();
  }

  return NextResponse.json({ assignment }, { status: 201 });
}, "org:manage");
