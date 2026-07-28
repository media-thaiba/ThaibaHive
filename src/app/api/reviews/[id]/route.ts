import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceReviews, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { performanceReviewUpdateSchema } from "@/lib/validation/schemas";
import { isManagedBy } from "@/lib/auth/department-scope";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;

  const review = await db
    .select({
      id: performanceReviews.id,
      staffId: performanceReviews.staffId,
      reviewerId: performanceReviews.reviewerId,
      period: performanceReviews.period,
      rating: performanceReviews.rating,
      goals: performanceReviews.goals,
      achievements: performanceReviews.achievements,
      areasForImprovement: performanceReviews.areasForImprovement,
      managerComments: performanceReviews.managerComments,
      status: performanceReviews.status,
      completedAt: performanceReviews.completedAt,
      createdAt: performanceReviews.createdAt,
      updatedAt: performanceReviews.updatedAt,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffEmployeeId: staff.employeeId,
    })
    .from(performanceReviews)
    .leftJoin(staff, eq(performanceReviews.staffId, staff.id))
    .where(eq(performanceReviews.id, id))
    .get();

  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Staff can only see their own reviews (unless admin/HOD)
  if (!["super_admin", "admin", "hod"].includes(session.role)) {
    if (review.staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ review });
}, "reviews:read");

export const PATCH = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;

  const existing = await db
    .select()
    .from(performanceReviews)
    .where(eq(performanceReviews.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = performanceReviewUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const isStaff = session.role === "staff";
  const isReviewer = existing.reviewerId === session.staffId;
  const isOwner = existing.staffId === session.staffId;
  const isAdmin = ["super_admin", "admin"].includes(session.role);
  const isHod = session.role === "hod" && (await isManagedBy(session.staffId, session.role, existing.staffId));

  // Staff can only update their own draft/submitted review with self-eval fields
  if (isStaff && isOwner) {
    if (existing.status !== "draft" && existing.status !== "submitted") {
      return NextResponse.json(
        { error: "Cannot update a completed review" },
        { status: 400 }
      );
    }
    // Staff can only update self-eval fields
    const allowedUpdates: Record<string, unknown> = {};
    if (data.goals !== undefined) allowedUpdates.goals = data.goals;
    if (data.achievements !== undefined) allowedUpdates.achievements = data.achievements;
    if (data.areasForImprovement !== undefined) allowedUpdates.areasForImprovement = data.areasForImprovement;
    if (data.status === "submitted" && existing.status === "draft") {
      allowedUpdates.status = "submitted";
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    allowedUpdates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(performanceReviews)
      .set(allowedUpdates)
      .where(eq(performanceReviews.id, id))
      .returning()
      .get();

    return NextResponse.json({ review: updated });
  }

  // Reviewer/HOD/Admin can update manager fields
  if (isReviewer || isAdmin || isHod) {
    const allowedUpdates: Record<string, unknown> = {};

    if (data.rating !== undefined) allowedUpdates.rating = data.rating;
    if (data.managerComments !== undefined) allowedUpdates.managerComments = data.managerComments;
    if (data.status !== undefined) allowedUpdates.status = data.status;
    if (data.status === "completed") {
      allowedUpdates.completedAt = new Date().toISOString();
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    allowedUpdates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(performanceReviews)
      .set(allowedUpdates)
      .where(eq(performanceReviews.id, id))
      .returning()
      .get();

    return NextResponse.json({ review: updated });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}, "reviews:update");
