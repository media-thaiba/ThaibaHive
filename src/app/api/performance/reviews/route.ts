import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceReviews, staff, performanceCycles, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { getManagedStaffIds } from "@/lib/auth/department-scope";
import { eq, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const cycleId = url.searchParams.get("cycleId");
  const staffIdParam = url.searchParams.get("staffId");
  const status = url.searchParams.get("status");

  const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin" || session.role === "principal";
  const conditions = [];

  if (cycleId) {
    conditions.push(eq(performanceReviews.cycleId, cycleId));
  }
  if (status) {
    conditions.push(eq(performanceReviews.status, status));
  }

  if (isSuperOrAdmin) {
    if (staffIdParam) {
      conditions.push(eq(performanceReviews.staffId, staffIdParam));
    }
  } else if (session.role === "hod") {
    const managedIds = (await getManagedStaffIds(session.staffId, session.role)) || [session.staffId];
    if (staffIdParam) {
      if (managedIds.includes(staffIdParam)) {
        conditions.push(eq(performanceReviews.staffId, staffIdParam));
      } else {
        return NextResponse.json({ reviews: [] });
      }
    } else {
      conditions.push(inArray(performanceReviews.staffId, managedIds));
    }
  } else {
    // Regular staff can only see their own reviews
    conditions.push(eq(performanceReviews.staffId, session.staffId));
  }

  const reviews = await db
    .select({
      id: performanceReviews.id,
      institutionId: performanceReviews.institutionId,
      cycleId: performanceReviews.cycleId,
      staffId: performanceReviews.staffId,
      evaluatorStaffId: performanceReviews.evaluatorStaffId,
      status: performanceReviews.status,
      period: performanceReviews.period,
      selfScore: performanceReviews.selfScore,
      managerScore: performanceReviews.managerScore,
      finalScore: performanceReviews.finalScore,
      grade: performanceReviews.grade,
      selfComments: performanceReviews.selfComments,
      managerComments: performanceReviews.managerComments,
      hrComments: performanceReviews.hrComments,
      submittedAt: performanceReviews.submittedAt,
      approvedAt: performanceReviews.approvedAt,
      completedAt: performanceReviews.completedAt,
      createdAt: performanceReviews.createdAt,
      updatedAt: performanceReviews.updatedAt,
      employeeId: staff.employeeId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      cycleTitle: performanceCycles.title,
    })
    .from(performanceReviews)
    .leftJoin(staff, eq(performanceReviews.staffId, staff.id))
    .leftJoin(performanceCycles, eq(performanceReviews.cycleId, performanceCycles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .all();

  return NextResponse.json({ reviews });
}, "performance:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const { cycleId, staffId, period, formTemplateId } = body;

    if (!cycleId || !staffId) {
      return NextResponse.json({ error: "cycleId and staffId are required" }, { status: 400 });
    }

    // Determine institution
    let institutionId = body.institutionId;
    if (!institutionId) {
      const instRec = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, staffId))
        .get();
      institutionId = instRec?.institutionId || "inst_default";
    }

    const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReview = {
      id,
      institutionId,
      cycleId,
      staffId,
      evaluatorStaffId: body.evaluatorStaffId || null,
      reviewerId: body.evaluatorStaffId || body.reviewerId || session.staffId,
      formTemplateId: formTemplateId || null,
      period: period || "Quarterly",
      status: "self_assessment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(performanceReviews).values(newReview).run();

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create performance review" },
      { status: 400 }
    );
  }
}, "performance:manage");
