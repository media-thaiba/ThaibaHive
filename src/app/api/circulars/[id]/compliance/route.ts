import { NextResponse } from "next/server";
import { db } from "@/db";
import { circularCampusCompliance, institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request, context) => {
  const params = await (context as unknown as { params: Promise<{ id: string }> }).params;
  const circularId = params.id;

  if (!circularId) {
    return NextResponse.json({ error: "circularId is required" }, { status: 400 });
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

export const PATCH = requireAuth(async (request: Request, context) => {
  const params = await (context as unknown as { params: Promise<{ id: string }> }).params;
  const circularId = params.id;
  const body = await request.json();
  const { institutionId, status, coordinatorRemarks, completionEvidenceUrl, verifiedById } = body;

  if (!circularId || !institutionId || !status) {
    return NextResponse.json(
      { error: "circularId, institutionId, and status are required" },
      { status: 400 }
    );
  }

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

  const completedAt = status === "completed" ? new Date().toISOString() : null;

  if (existing) {
    const updated = await db
      .update(circularCampusCompliance)
      .set({
        status,
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
      status,
      coordinatorRemarks: coordinatorRemarks || null,
      completionEvidenceUrl: completionEvidenceUrl || null,
      completedAt,
      verifiedById: verifiedById || null,
    })
    .returning()
    .get();

  return NextResponse.json({ compliance: created }, { status: 201 });
}, "circulars:create");
