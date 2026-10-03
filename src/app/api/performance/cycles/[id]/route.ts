import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceCycles, performanceReviews } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Cycle ID is required" }, { status: 400 });
  }

  const cycle = await db
    .select()
    .from(performanceCycles)
    .where(eq(performanceCycles.id, id))
    .get();

  if (!cycle) {
    return NextResponse.json({ error: "Performance cycle not found" }, { status: 404 });
  }

  // Count reviews by status in this cycle
  const reviewStats = await db
    .select({
      status: performanceReviews.status,
      count: sql<number>`count(*)`,
    })
    .from(performanceReviews)
    .where(eq(performanceReviews.cycleId, id))
    .groupBy(performanceReviews.status)
    .all();

  return NextResponse.json({
    cycle,
    stats: reviewStats,
  });
}, "performance:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  try {
    const params = context?.params ? await context.params : {};
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Cycle ID is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(performanceCycles)
      .where(eq(performanceCycles.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Performance cycle not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.title) updateData.title = body.title;
    if (body.status) updateData.status = body.status;
    if (body.startDate) updateData.startDate = body.startDate;
    if (body.endDate) updateData.endDate = body.endDate;
    if (body.selfAssessmentDeadline) updateData.selfAssessmentDeadline = body.selfAssessmentDeadline;
    if (body.managerReviewDeadline) updateData.managerReviewDeadline = body.managerReviewDeadline;

    const updated = await db
      .update(performanceCycles)
      .set(updateData)
      .where(eq(performanceCycles.id, id))
      .returning()
      .get();

    return NextResponse.json({ cycle: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update performance cycle" },
      { status: 400 }
    );
  }
}, "performance:manage");
