import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceReviews, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { performanceReviewCreateSchema } from "@/lib/validation/schemas";
import { getManagedStaffIds } from "@/lib/auth/department-scope";
import { eq, desc, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const staffIdFilter = searchParams.get("staffId");
  const status = searchParams.get("status");
  const period = searchParams.get("period");

  const conditions = [];

  if (session.role === "super_admin" || session.role === "admin") {
    // Admin sees all reviews
  } else if (session.role === "hod") {
    const managedIds = await getManagedStaffIds(session.staffId, session.role);
    if (managedIds !== null && managedIds.length > 0) {
      conditions.push(inArray(performanceReviews.staffId, managedIds));
    } else {
      conditions.push(eq(performanceReviews.staffId, session.staffId));
    }
  } else {
    conditions.push(eq(performanceReviews.staffId, session.staffId));
  }

  if (staffIdFilter) conditions.push(eq(performanceReviews.staffId, staffIdFilter));
  if (status) conditions.push(eq(performanceReviews.status, status));
  if (period) conditions.push(eq(performanceReviews.period, period));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const reviews = await db
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
    .where(whereClause)
    .orderBy(desc(performanceReviews.createdAt))
    .all();

  return NextResponse.json({ reviews });
}, "reviews:read");

export const POST = requireAuth(async (request, session) => {
  if (!["super_admin", "admin", "hod"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = performanceReviewCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { staffId, period, goals } = parsed.data;

  // Check for duplicate review in same period
  const existing = await db
    .select({ id: performanceReviews.id })
    .from(performanceReviews)
    .where(
      and(
        eq(performanceReviews.staffId, staffId),
        eq(performanceReviews.period, period)
      )
    )
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "A review for this staff member in this period already exists" },
      { status: 400 }
    );
  }

  const review = await db
    .insert(performanceReviews)
    .values({
      id: crypto.randomUUID(),
      staffId,
      reviewerId: session.staffId,
      period,
      goals: goals || null,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning()
    .get();

  return NextResponse.json({ review }, { status: 201 });
}, "reviews:create");
