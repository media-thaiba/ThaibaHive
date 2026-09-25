import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceCycles, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { performanceCycleCreateSchema } from "@/lib/validation/schemas";
import { eq, inArray, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const institutionIdParam = url.searchParams.get("institutionId");

  const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin";
  let allowedInstIds: string[] = [];

  if (!isSuperOrAdmin) {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    allowedInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);
  }

  const conditions = [];
  if (status) {
    conditions.push(eq(performanceCycles.status, status));
  }
  if (institutionIdParam) {
    conditions.push(eq(performanceCycles.institutionId, institutionIdParam));
  } else if (!isSuperOrAdmin && allowedInstIds.length > 0) {
    conditions.push(inArray(performanceCycles.institutionId, allowedInstIds));
  }

  const cycles = await db
    .select()
    .from(performanceCycles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .all();

  return NextResponse.json({ cycles });
}, "performance:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const validated = performanceCycleCreateSchema.parse(body);

    let institutionId = body.institutionId;
    if (!institutionId) {
      const callerInst = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, session.staffId))
        .get();
      institutionId = callerInst?.institutionId || "inst_default";
    }

    const id = `cyc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCycle = {
      id,
      institutionId,
      title: validated.title,
      cycleType: validated.cycleType,
      startDate: validated.startDate,
      endDate: validated.endDate,
      selfAssessmentDeadline: validated.selfAssessmentDeadline,
      managerReviewDeadline: validated.managerReviewDeadline,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(performanceCycles).values(newCycle).run();

    return NextResponse.json({ cycle: newCycle }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create performance cycle" },
      { status: 400 }
    );
  }
}, "performance:manage");
