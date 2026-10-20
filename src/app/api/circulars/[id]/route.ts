import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, circularDownloads, circularCampusCompliance, staff, staffInstitutions, departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { canAccessCircular } from "@/lib/circulars/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { circularUpdateSchema } from "@/lib/validation/schemas";
import { eq, sql, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const circular = await db
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
      uploadedById: circulars.uploadedById,
      uploadedByName: staff.firstName,
      uploadedByLastName: staff.lastName,
      downloadCount: sql<number>`(
        SELECT COUNT(*) FROM circular_downloads
        WHERE circular_downloads.circular_id = circulars.id
      )`.as("download_count"),
    })
    .from(circulars)
    .leftJoin(staff, eq(circulars.uploadedById, staff.id))
    .where(eq(circulars.id, id))
    .get();

  if (!circular) {
    return NextResponse.json({ error: "Circular not found" }, { status: 404 });
  }

  const authorized = await canAccessCircular(session, circular);
  if (!authorized) {
    // 404 rather than 403 to prevent enumeration of confidential circulars
    return NextResponse.json({ error: "Circular not found" }, { status: 404 });
  }

  return NextResponse.json({ circular });
}, "circulars:read");

export const PATCH = requireAuth(async (request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = circularUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request data" }, { status: 400 });
  }

  const existing = await db.select().from(circulars).where(eq(circulars.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Circular not found" }, { status: 404 });
  }

  if (session.role !== "super_admin") {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const callerInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);
    if (session.institutionId) {
      callerInstIds.push(session.institutionId);
    }

    if (!existing.targetInstitutionId && existing.uploadedById !== session.staffId) {
      return NextResponse.json({ error: "Forbidden: Cannot modify global circulars" }, { status: 403 });
    }

    if (
      existing.targetInstitutionId &&
      !callerInstIds.includes(existing.targetInstitutionId) &&
      existing.uploadedById !== session.staffId
    ) {
      return NextResponse.json({ error: "Forbidden: Cannot modify circular from another institution" }, { status: 403 });
    }

    if (parsed.data.targetInstitutionId && !callerInstIds.includes(parsed.data.targetInstitutionId)) {
      return NextResponse.json({ error: "Forbidden: Cannot target another institution" }, { status: 403 });
    }

    if (session.role === "hod" && parsed.data.targetDepartmentId) {
      const dept = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.id, parsed.data.targetDepartmentId),
            eq(departments.headUserId, session.staffId)
          )
        )
        .get();
      if (!dept) {
        return NextResponse.json({ error: "Forbidden: You do not head this department" }, { status: 403 });
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.targetRole !== undefined) updateData.targetRole = parsed.data.targetRole;
  if (parsed.data.targetDepartmentId !== undefined) updateData.targetDepartmentId = parsed.data.targetDepartmentId;
  if (parsed.data.targetInstitutionId !== undefined) updateData.targetInstitutionId = parsed.data.targetInstitutionId;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ circular: existing });
  }

  const updated = await db
    .update(circulars)
    .set(updateData)
    .where(eq(circulars.id, id))
    .returning()
    .get();

  return NextResponse.json({ circular: updated });
}, "circulars:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const existing = await db.select().from(circulars).where(eq(circulars.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Circular not found" }, { status: 404 });

  if (session.role !== "super_admin") {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const callerInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);
    if (session.institutionId) {
      callerInstIds.push(session.institutionId);
    }

    if (!existing.targetInstitutionId && existing.uploadedById !== session.staffId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete global circulars" }, { status: 403 });
    }
    if (
      existing.targetInstitutionId &&
      !callerInstIds.includes(existing.targetInstitutionId) &&
      existing.uploadedById !== session.staffId
    ) {
      return NextResponse.json({ error: "Forbidden: Cannot delete circular from another institution" }, { status: 403 });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(circularDownloads).where(eq(circularDownloads.circularId, id)).run();
    await tx.delete(circularCampusCompliance).where(eq(circularCampusCompliance.circularId, id)).run();
    await tx.delete(circulars).where(eq(circulars.id, id)).run();
  });
  return NextResponse.json({ success: true });
}, "circulars:manage");
