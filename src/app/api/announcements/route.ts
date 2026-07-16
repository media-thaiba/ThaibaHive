import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementReads, staff, departments, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { announcementCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, and, or, isNull, sql, inArray } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal"];

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);

  if (isAdmin) {
    // Admin/Super Admin/Principal: get all announcements with read receipt counts
    const all = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        priority: announcements.priority,
        isActive: announcements.isActive,
        targetRole: announcements.targetRole,
        targetDepartmentId: announcements.targetDepartmentId,
        targetInstitutionId: announcements.targetInstitutionId,
        pinnedUntil: announcements.pinnedUntil,
        createdAt: announcements.createdAt,
        createdByName: staff.firstName,
        createdByLastName: staff.lastName,
        readCount: sql<number>`(
          SELECT COUNT(*) FROM ${announcementReads}
          WHERE ${announcementReads.announcementId} = ${announcements.id}
        )`.as("read_count"),
      })
      .from(announcements)
      .leftJoin(staff, eq(announcements.createdById, staff.id))
      .where(includeInactive ? sql`1=1` : eq(announcements.isActive, true))
      .orderBy(
        desc(sql`CASE WHEN ${announcements.pinnedUntil} IS NOT NULL AND datetime(${announcements.pinnedUntil}) > datetime('now') THEN 1 ELSE 0 END`),
        desc(announcements.createdAt)
      )
      .all();

    return NextResponse.json({ announcements: all });
  }

  // Standard Staff: get only active announcements targeted to them with isRead flag
  // Get user's department IDs
  const userDepts = await db
    .select({ departmentId: staffDepartments.departmentId })
    .from(staffDepartments)
    .where(eq(staffDepartments.staffId, session.staffId))
    .all();
  const deptIds = userDepts.map((d) => d.departmentId).filter(Boolean);

  // Get user's institution IDs
  const userInsts = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .all();
  const instIds = userInsts.map((i) => i.institutionId).filter(Boolean);

  // Build targeting conditions
  const roleMatch = or(isNull(announcements.targetRole), eq(announcements.targetRole, session.role));

  const deptMatch = deptIds.length > 0
    ? or(isNull(announcements.targetDepartmentId), inArray(announcements.targetDepartmentId, deptIds))
    : isNull(announcements.targetDepartmentId);

  const instMatch = instIds.length > 0
    ? or(isNull(announcements.targetInstitutionId), inArray(announcements.targetInstitutionId, instIds))
    : isNull(announcements.targetInstitutionId);

  const targetingClause = and(roleMatch, deptMatch, instMatch);

  const staffAnns = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      priority: announcements.priority,
      isActive: announcements.isActive,
      targetRole: announcements.targetRole,
      targetDepartmentId: announcements.targetDepartmentId,
      targetInstitutionId: announcements.targetInstitutionId,
      pinnedUntil: announcements.pinnedUntil,
      createdAt: announcements.createdAt,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
      isRead: sql<boolean>`EXISTS (
        SELECT 1 FROM ${announcementReads}
        WHERE ${announcementReads.announcementId} = announcements.id
        AND ${announcementReads.staffId} = ${session.staffId}
      )`.as("is_read"),
    })
    .from(announcements)
    .leftJoin(staff, eq(announcements.createdById, staff.id))
    .where(
      and(
        eq(announcements.isActive, true),
        targetingClause
      )
    )
    .orderBy(
      desc(sql`CASE WHEN ${announcements.pinnedUntil} IS NOT NULL AND datetime(${announcements.pinnedUntil}) > datetime('now') THEN 1 ELSE 0 END`),
      desc(announcements.createdAt)
    )
    .all();

  return NextResponse.json({ announcements: staffAnns });
}, "announcements:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = announcementCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, content, priority, targetRole, targetDepartmentId, targetInstitutionId, pinnedUntil } = parsed.data;
  const announcement = await db
    .insert(announcements)
    .values({
      id: crypto.randomUUID(),
      title,
      content,
      priority: priority || "normal",
      targetRole,
      targetDepartmentId,
      targetInstitutionId,
      createdById: session.staffId,
      pinnedUntil,
    })
    .returning()
    .get();

  // Trigger Notifications
  await createNotificationsForTarget({
    title: `New Announcement: ${title}`,
    message: content.substring(0, 150) + (content.length > 150 ? "..." : ""),
    type: "announcement",
    referenceType: "announcement",
    referenceId: announcement.id,
    targetRole,
    targetDepartmentId,
    targetInstitutionId,
  });

  return NextResponse.json({ announcement }, { status: 201 });
}, "announcements:create");