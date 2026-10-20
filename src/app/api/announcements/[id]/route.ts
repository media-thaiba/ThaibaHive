import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementReads, notifications, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { announcementUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, sql } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import {
  canAccessAnnouncement,
  canManageAnnouncement,
  verifyDepartmentInstitution,
  getStaffPrimaryInstitutionId,
} from "@/lib/announcements/utils";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const announcement = await db
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
      createdById: announcements.createdById,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
    })
    .from(announcements)
    .leftJoin(staff, eq(announcements.createdById, staff.id))
    .where(eq(announcements.id, id))
    .get();

  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const allowed = await canAccessAnnouncement(session, announcement);
  if (!allowed) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const isManager =
    session.role === "super_admin" ||
    session.role === "admin" ||
    session.role === "principal";

  if (isManager) {
    const readCountResult = await db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(announcementReads)
      .where(eq(announcementReads.announcementId, id))
      .get();

    return NextResponse.json({
      announcement: {
        ...announcement,
        readCount: Number(readCountResult?.count || 0),
      },
    });
  }

  const isReadResult = await db
    .select({ id: announcementReads.id })
    .from(announcementReads)
    .where(
      and(
        eq(announcementReads.announcementId, id),
        eq(announcementReads.staffId, session.staffId)
      )
    )
    .get();

  return NextResponse.json({
    announcement: {
      ...announcement,
      isRead: !!isReadResult,
    },
  });
}, "announcements:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = announcementUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const canManage = await canManageAnnouncement(session, existing);
  if (!canManage) {
    return NextResponse.json({ error: "You are not authorized to update this announcement" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const isSuperAdmin = session.role === "super_admin";

  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.targetRole !== undefined) updates.targetRole = parsed.data.targetRole;
  if (parsed.data.pinnedUntil !== undefined) updates.pinnedUntil = parsed.data.pinnedUntil;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  // Handle targetInstitutionId change
  let effectiveInstId = existing.targetInstitutionId;
  if (parsed.data.targetInstitutionId !== undefined) {
    if (!isSuperAdmin) {
      let callerInstId = scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;
      if (!callerInstId && session.staffId) {
        callerInstId = await getStaffPrimaryInstitutionId(session.staffId);
      }
      if (parsed.data.targetInstitutionId && parsed.data.targetInstitutionId !== callerInstId) {
        return NextResponse.json(
          { error: "Cannot assign announcement to another institution" },
          { status: 403 }
        );
      }
      effectiveInstId = callerInstId || null;
    } else {
      effectiveInstId = parsed.data.targetInstitutionId;
    }
    updates.targetInstitutionId = effectiveInstId;
  }

  // Handle targetDepartmentId change
  if (parsed.data.targetDepartmentId !== undefined) {
    if (parsed.data.targetDepartmentId && effectiveInstId) {
      const isDeptValid = await verifyDepartmentInstitution(parsed.data.targetDepartmentId, effectiveInstId);
      if (!isDeptValid) {
        return NextResponse.json(
          { error: "Target department does not belong to this institution" },
          { status: 400 }
        );
      }
    }
    updates.targetDepartmentId = parsed.data.targetDepartmentId;
  }

  const updated = await db
    .update(announcements)
    .set(updates)
    .where(eq(announcements.id, id))
    .returning()
    .get();

  return NextResponse.json({ announcement: updated });
}, "announcements:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const existing = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const canManage = await canManageAnnouncement(session, existing);
  if (!canManage) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  // Cascading cleanup of reads, notifications, and announcement
  await db.delete(announcementReads).where(eq(announcementReads.announcementId, id)).run();
  await db.delete(notifications).where(
    and(
      eq(notifications.referenceType, "announcement"),
      eq(notifications.referenceId, id)
    )
  ).run();
  await db.delete(announcements).where(eq(announcements.id, id)).run();

  return NextResponse.json({ success: true });
}, "announcements:manage");
