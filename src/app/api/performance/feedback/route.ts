import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRequests, staff, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { feedbackRequestCreateSchema } from "@/lib/validation/schemas";
import { eq, or, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const reviewId = url.searchParams.get("reviewId");

  const conditions = [];
  if (reviewId) {
    conditions.push(eq(feedbackRequests.reviewId, reviewId));
  } else {
    // Return requests involving caller as requester or peer
    conditions.push(
      or(
        eq(feedbackRequests.requesterStaffId, session.staffId),
        eq(feedbackRequests.peerStaffId, session.staffId)
      )
    );
  }

  const feedback = await db
    .select({
      id: feedbackRequests.id,
      institutionId: feedbackRequests.institutionId,
      reviewId: feedbackRequests.reviewId,
      requesterStaffId: feedbackRequests.requesterStaffId,
      peerStaffId: feedbackRequests.peerStaffId,
      feedbackText: feedbackRequests.feedbackText,
      rating: feedbackRequests.rating,
      status: feedbackRequests.status,
      submittedAt: feedbackRequests.submittedAt,
      createdAt: feedbackRequests.createdAt,
      peerFirstName: staff.firstName,
      peerLastName: staff.lastName,
    })
    .from(feedbackRequests)
    .leftJoin(staff, eq(feedbackRequests.peerStaffId, staff.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .all();

  return NextResponse.json({ feedback });
}, "performance:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();

    // If submitting feedback for an existing request
    if (body.requestId) {
      const existing = await db
        .select()
        .from(feedbackRequests)
        .where(eq(feedbackRequests.id, body.requestId))
        .get();

      if (!existing) {
        return NextResponse.json({ error: "Feedback request not found" }, { status: 404 });
      }

      if (existing.peerStaffId !== session.staffId && session.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden: Only the requested peer can submit this feedback" }, { status: 403 });
      }

      const updated = await db
        .update(feedbackRequests)
        .set({
          feedbackText: body.feedbackText || existing.feedbackText,
          rating: body.rating ?? existing.rating,
          status: "submitted",
          submittedAt: new Date().toISOString(),
        })
        .where(eq(feedbackRequests.id, body.requestId))
        .returning()
        .get();

      return NextResponse.json({ feedback: updated });
    }

    // Creating a new 360-degree feedback request
    const validated = feedbackRequestCreateSchema.parse(body);

    let institutionId = body.institutionId;
    if (!institutionId) {
      const inst = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, session.staffId))
        .get();
      institutionId = inst?.institutionId || "inst_default";
    }

    const id = `fbr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newFeedback = {
      id,
      institutionId,
      reviewId: validated.reviewId,
      requesterStaffId: session.staffId,
      peerStaffId: validated.peerStaffId,
      feedbackText: validated.feedbackText || null,
      rating: validated.rating || null,
      status: validated.feedbackText ? "submitted" : "pending",
      submittedAt: validated.feedbackText ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(feedbackRequests).values(newFeedback).run();

    return NextResponse.json({ feedback: newFeedback }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process feedback request" },
      { status: 400 }
    );
  }
}, "performance:evaluate");
