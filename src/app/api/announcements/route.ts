import { NextResponse, after } from "next/server";
import { db, isPostgres } from "@/db";
import { announcements, announcementReads, staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { announcementCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, and, or, isNull, sql, inArray } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import { sendBulkPushNotifications } from "@/lib/notifications/push-service";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { verifyDepartmentInstitution, getStaffPrimaryInstitutionId } from "@/lib/announcements/utils";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal"];

function pinnedUntilOrderSql() {
  return isPostgres
    ? sql`CASE WHEN ${announcements.pinnedUntil} IS NOT NULL AND ${announcements.pinnedUntil}::timestamptz > CURRENT_TIMESTAMP THEN 1 ELSE 0 END`
    : sql`CASE WHEN ${announcements.pinnedUntil} IS NOT NULL AND datetime(${announcements.pinnedUntil}) > datetime('now') THEN 1 ELSE 0 END`;
}

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);

  if (isAdmin) {
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    const conditions = [];
    if (!includeInactive) {
      conditions.push(eq(announcements.isActive, true));
    }
    if (scopedInstitutionId && scopedInstitutionId !== "global") {
      conditions.push(or(isNull(announcements.targetInstitutionId), eq(announcements.targetInstitutionId, scopedInstitutionId)));
    }
    const adminWhere = conditions.length > 0 ? and(...conditions) : sql`1=1`;

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
      .where(adminWhere)
      .orderBy(
        desc(pinnedUntilOrderSql()),
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
      desc(pinnedUntilOrderSql()),
      desc(announcements.createdAt)
    )
    .all();

  return NextResponse.json({ announcements: staffAnns });
}, "announcements:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = announcementCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, content, priority, targetRole, targetDepartmentId, targetInstitutionId, pinnedUntil } = parsed.data;

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const isSuperAdmin = session.role === "super_admin";

  let effectiveTargetInstitutionId: string | null = null;

  if (isSuperAdmin) {
    effectiveTargetInstitutionId = targetInstitutionId || null;
  } else {
    let callerInstId = scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;
    if (!callerInstId && session.staffId) {
      callerInstId = await getStaffPrimaryInstitutionId(session.staffId);
    }

    // Non-super_admins are strictly bound to their institution scope
    if (callerInstId) {
      if (targetInstitutionId && targetInstitutionId !== callerInstId) {
        return NextResponse.json(
          { error: "Cannot create announcements for another institution" },
          { status: 403 }
        );
      }
      effectiveTargetInstitutionId = callerInstId;
    } else {
      effectiveTargetInstitutionId = targetInstitutionId || null;
    }
  }

  // If a department is targeted, verify it belongs to the target institution
  if (targetDepartmentId && effectiveTargetInstitutionId) {
    const isDeptValid = await verifyDepartmentInstitution(targetDepartmentId, effectiveTargetInstitutionId);
    if (!isDeptValid) {
      return NextResponse.json(
        { error: "Target department does not belong to this institution" },
        { status: 400 }
      );
    }
  }

  const announcement = await db
    .insert(announcements)
    .values({
      id: crypto.randomUUID(),
      title,
      content,
      priority: priority || "normal",
      targetRole: targetRole || null,
      targetDepartmentId: targetDepartmentId || null,
      targetInstitutionId: effectiveTargetInstitutionId,
      createdById: session.staffId,
      pinnedUntil: pinnedUntil || null,
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
    targetRole: targetRole || undefined,
    targetDepartmentId: targetDepartmentId || undefined,
    targetInstitutionId: effectiveTargetInstitutionId || undefined,
  });

  // Asynchronous FCM Bulk Push Dispatch
  const triggerPush = async () => {
    try {
      await sendBulkPushNotifications({
        institutionId: effectiveTargetInstitutionId || undefined,
        title: `Announcement: ${title}`,
        message: content.substring(0, 150) + (content.length > 150 ? "..." : ""),
        type: "announcement",
        referenceType: "announcement",
        referenceId: announcement.id,
      });
    } catch (err) {
      console.error("[PushNotification] Bulk announcement push failed:", err);
    }
  };

  try {
    after(triggerPush);
  } catch {
    // In standalone tests or execution environments where after() is called outside request scope
    void triggerPush();
  }

  return NextResponse.json({ announcement }, { status: 201 });
}, "announcements:create");