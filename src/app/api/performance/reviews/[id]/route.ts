import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceReviews, performanceGoals, feedbackRequests, staff, performanceCycles } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
  }

  const review = await db
    .select({
      id: performanceReviews.id,
      institutionId: performanceReviews.institutionId,
      cycleId: performanceReviews.cycleId,
      staffId: performanceReviews.staffId,
      evaluatorStaffId: performanceReviews.evaluatorStaffId,
      status: performanceReviews.status,
      period: performanceReviews.period,
      rating: performanceReviews.rating,
      selfScore: performanceReviews.selfScore,
      managerScore: performanceReviews.managerScore,
      finalScore: performanceReviews.finalScore,
      grade: performanceReviews.grade,
      selfComments: performanceReviews.selfComments,
      managerComments: performanceReviews.managerComments,
      hrComments: performanceReviews.hrComments,
      achievements: performanceReviews.achievements,
      areasForImprovement: performanceReviews.areasForImprovement,
      goals: performanceReviews.goals,
      ratingsJson: performanceReviews.ratingsJson,
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
    .where(eq(performanceReviews.id, id))
    .get();

  if (!review) {
    return NextResponse.json({ error: "Performance review not found" }, { status: 404 });
  }

  // Fetch associated goals
  const goals = await db
    .select()
    .from(performanceGoals)
    .where(eq(performanceGoals.reviewId, id))
    .all();

  // Fetch feedback requests
  const feedback = await db
    .select({
      id: feedbackRequests.id,
      peerStaffId: feedbackRequests.peerStaffId,
      feedbackText: feedbackRequests.feedbackText,
      rating: feedbackRequests.rating,
      status: feedbackRequests.status,
      submittedAt: feedbackRequests.submittedAt,
      peerFirstName: staff.firstName,
      peerLastName: staff.lastName,
    })
    .from(feedbackRequests)
    .leftJoin(staff, eq(feedbackRequests.peerStaffId, staff.id))
    .where(eq(feedbackRequests.reviewId, id))
    .all();

  return NextResponse.json({
    review,
    goals,
    feedback,
  });
}, "performance:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  try {
    const params = context?.params ? await context.params : {};
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(performanceReviews)
      .where(eq(performanceReviews.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Performance review not found" }, { status: 404 });
    }

    if (existing.status === "completed" || existing.status === "signed_off") {
      return NextResponse.json({ error: "Cannot modify a completed review" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.selfComments !== undefined) updateData.selfComments = body.selfComments;
    if (body.managerComments !== undefined) updateData.managerComments = body.managerComments;
    if (body.hrComments !== undefined) updateData.hrComments = body.hrComments;
    if (body.achievements !== undefined) updateData.achievements = body.achievements;
    if (body.areasForImprovement !== undefined) updateData.areasForImprovement = body.areasForImprovement;
    if (body.goals !== undefined) updateData.goals = typeof body.goals === "string" ? body.goals : JSON.stringify(body.goals);
    if (body.ratingsJson !== undefined) updateData.ratingsJson = typeof body.ratingsJson === "string" ? body.ratingsJson : JSON.stringify(body.ratingsJson);

    const updated = await db
      .update(performanceReviews)
      .set(updateData)
      .where(eq(performanceReviews.id, id))
      .returning()
      .get();

    return NextResponse.json({ review: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update performance review" },
      { status: 400 }
    );
  }
}, "performance:evaluate");
