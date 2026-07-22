import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, staff, staffDepartments, staffInstitutions, departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { circularCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, and, or, isNull, inArray, sql } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal", "hod"];

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);

  if (isAdmin) {
    let query = db
      .select({
        id: circulars.id,
        title: circulars.title,
        description: circulars.description,
        fileUrl: circulars.fileUrl,
        fileType: circulars.fileType,
        fileSize: circulars.fileSize,
        category: circulars.category,
        targetRole: circulars.targetRole,
        targetDepartmentId: circulars.targetDepartmentId,
        targetInstitutionId: circulars.targetInstitutionId,
        isActive: circulars.isActive,
        createdAt: circulars.createdAt,
        uploadedByName: staff.firstName,
        uploadedByLastName: staff.lastName,
        downloadCount: sql<number>`(
          SELECT COUNT(*) FROM circular_downloads
          WHERE circular_downloads.circular_id = circulars.id
        )`.as("download_count"),
      })
      .from(circulars)
      .leftJoin(staff, eq(circulars.uploadedById, staff.id));

    const conditions = [];
    if (!includeInactive) {
      conditions.push(eq(circulars.isActive, true));
    }

    if (session.role !== "super_admin" && session.role !== "admin") {
      const callerInsts = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, session.staffId))
        .all();
      const instIds = callerInsts.map((i) => i.institutionId).filter(Boolean);

      if (instIds.length > 0) {
        conditions.push(
          or(
            isNull(circulars.targetInstitutionId),
            inArray(circulars.targetInstitutionId, instIds),
            eq(circulars.uploadedById, session.staffId)
          )
        );
      } else {
        conditions.push(eq(circulars.uploadedById, session.staffId));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const all = await query.orderBy(desc(circulars.createdAt)).all();
    return NextResponse.json({ circulars: all });
  }

  // Standard Staff: target audience filtering
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

  // Build targeting conditions: matches user's role, department, or institution, OR is null (global)
  const roleMatch = or(isNull(circulars.targetRole), eq(circulars.targetRole, session.role));

  const deptMatch = deptIds.length > 0
    ? or(isNull(circulars.targetDepartmentId), inArray(circulars.targetDepartmentId, deptIds))
    : isNull(circulars.targetDepartmentId);

  const instMatch = instIds.length > 0
    ? or(isNull(circulars.targetInstitutionId), inArray(circulars.targetInstitutionId, instIds))
    : isNull(circulars.targetInstitutionId);

  const targetingClause = and(roleMatch, deptMatch, instMatch);

  const staffCirculars = await db
    .select({
      id: circulars.id,
      title: circulars.title,
      description: circulars.description,
      fileUrl: circulars.fileUrl,
      fileType: circulars.fileType,
      fileSize: circulars.fileSize,
      category: circulars.category,
      createdAt: circulars.createdAt,
      uploadedByName: staff.firstName,
      uploadedByLastName: staff.lastName,
    })
    .from(circulars)
    .leftJoin(staff, eq(circulars.uploadedById, staff.id))
    .where(
      and(
        eq(circulars.isActive, true),
        targetingClause
      )
    )
    .orderBy(desc(circulars.createdAt))
    .all();

  return NextResponse.json({ circulars: staffCirculars });
}, "circulars:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = circularCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, description, fileUrl, fileType, fileSize, category, targetRole, targetDepartmentId, targetInstitutionId } = parsed.data;

  // Authorization checks for non-admins:
  if (session.role !== "super_admin" && session.role !== "admin") {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const callerInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);

    if (!targetInstitutionId) {
      return NextResponse.json({ error: "Institution ID is required for non-admins" }, { status: 400 });
    }
    if (!callerInstIds.includes(targetInstitutionId)) {
      return NextResponse.json({ error: "Forbidden: Cannot target another institution" }, { status: 403 });
    }

    // For HODs, verify they head the target department if specified
    if (session.role === "hod" && targetDepartmentId) {
      const dept = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.id, targetDepartmentId),
            eq(departments.headUserId, session.staffId)
          )
        )
        .get();
      if (!dept) {
        return NextResponse.json({ error: "Forbidden: You do not head this department" }, { status: 403 });
      }
    }
  }

  const circular = await db
    .insert(circulars)
    .values({
      id: crypto.randomUUID(),
      title,
      description,
      fileUrl,
      fileType,
      fileSize,
      category: category || "general",
      targetRole,
      targetDepartmentId,
      targetInstitutionId,
      uploadedById: session.staffId,
    })
    .returning()
    .get();

  // Trigger Notifications
  await createNotificationsForTarget({
    title: `New Document: ${title}`,
    message: description || `A new document has been uploaded in ${category || "general"}.`,
    type: "circular",
    referenceType: "circular",
    referenceId: circular.id,
    targetRole: targetRole as StaffRole | undefined,
    targetDepartmentId,
    targetInstitutionId,
  });

  return NextResponse.json({ circular }, { status: 201 });
}, "circulars:create");