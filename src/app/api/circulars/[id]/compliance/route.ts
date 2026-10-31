import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, circularCampusCompliance, institutions, staffInstitutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { circularComplianceUpdateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const params = await (context as unknown as { params: Promise<{ id: string }> }).params;
  const circularId = params?.id;

  if (!circularId) {
    return NextResponse.json({ error: "circularId is required" }, { status: 400 });
  }

  // Ensure circular exists
  const circular = await db
    .select({ id: circulars.id })
    .from(circulars)
    .where(eq(circulars.id, circularId))
    .get();

  if (!circular) {
    return NextResponse.json({ error: "Circular not found" }, { status: 404 });
  }

  // Get all active institutions
  const allInstitutions = await db
    .select({
      id: institutions.id,
      name: institutions.name,
      code: institutions.code,
      type: institutions.type,
    })
    .from(institutions)
    .where(eq(institutions.isActive, true))
    .all();

  // Get existing compliance records for this circular
  const complianceRecords = await db
    .select()
    .from(circularCampusCompliance)
    .where(eq(circularCampusCompliance.circularId, circularId))
    .all();

  const recordMap = new Map(complianceRecords.map((r) => [r.institutionId, r]));

  // Merge into full campus checklist
  const checklist = allInstitutions.map((inst) => {
    const existing = recordMap.get(inst.id);
    return {
      institutionId: inst.id,
      institutionName: inst.name,
      institutionCode: inst.code,
      institutionType: inst.type,
      status: existing?.status || "pending",
      completionEvidenceUrl: existing?.completionEvidenceUrl || null,
      coordinatorRemarks: existing?.coordinatorRemarks || null,
      completedAt: existing?.completedAt || null,
      id: existing?.id || null,
    };
  });

  const totalCampuses = checklist.length;
  const completedCount = checklist.filter((c) => c.status === "completed").length;

  return NextResponse.json({
    circularId,
    totalCampuses,
    completedCount,
    compliancePercentage: totalCampuses > 0 ? Math.round((completedCount / totalCampuses) * 100) : 0,
    checklist,
  });
}, "circulars:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const params = await (context as unknown as { params: Promise<{ id: string }> }).params;
  const circularId = params?.id;

  if (!circularId) {
    return NextResponse.json({ error: "circularId is required" }, { status: 400 });
  }

  // Check circular existence
  const circular = await db
    .select({ id: circulars.id })
    .from(circulars)
    .where(eq(circulars.id, circularId))
    .get();

  if (!circular) {
    return NextResponse.json({ error: "Circular not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = circularComplianceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { status, coordinatorRemarks, completionEvidenceUrl, verifiedById, institutionId: reqInstitutionId } = parsed.data;
  const institutionId = await resolveRequestInstitution(session, reqInstitutionId ?? undefined);

  if (!institutionId) {
    return NextResponse.json(
      { error: "institutionId is required" },
      { status: 400 }
    );
  }

  // Enforce multi-tenant boundary for campus compliance updates
  if (session.role !== "super_admin") {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const callerInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);

    if (!callerInstIds.includes(institutionId)) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update compliance for another institution" },
        { status: 403 }
      );
    }
  }

  const normalizedStatus = status === "compliant" ? "completed" : status;
  const completedAt = normalizedStatus === "completed" ? new Date().toISOString() : null;

  const existing = await db
    .select()
    .from(circularCampusCompliance)
    .where(
      and(
        eq(circularCampusCompliance.circularId, circularId),
        eq(circularCampusCompliance.institutionId, institutionId)
      )
    )
    .get();

  if (existing) {
    const updated = await db
      .update(circularCampusCompliance)
      .set({
        status: normalizedStatus,
        coordinatorRemarks: coordinatorRemarks !== undefined ? coordinatorRemarks : existing.coordinatorRemarks,
        completionEvidenceUrl: completionEvidenceUrl !== undefined ? completionEvidenceUrl : existing.completionEvidenceUrl,
        completedAt: completedAt || existing.completedAt,
        verifiedById: verifiedById || existing.verifiedById,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(circularCampusCompliance.id, existing.id))
      .returning()
      .get();

    return NextResponse.json({ compliance: updated });
  }

  const created = await db
    .insert(circularCampusCompliance)
    .values({
      id: `ccc_${crypto.randomUUID().slice(0, 10)}`,
      circularId,
      institutionId,
      status: normalizedStatus,
      coordinatorRemarks: coordinatorRemarks || null,
      completionEvidenceUrl: completionEvidenceUrl || null,
      completedAt,
      verifiedById: verifiedById || null,
    })
    .returning()
    .get();

  return NextResponse.json({ compliance: created }, { status: 201 });
}, "circulars:manage");
