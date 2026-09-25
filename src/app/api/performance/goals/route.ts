import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceGoals, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { performanceGoalCreateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const reviewId = url.searchParams.get("reviewId");
  const staffId = url.searchParams.get("staffId") || session.staffId;

  const conditions = [];
  if (reviewId) conditions.push(eq(performanceGoals.reviewId, reviewId));
  if (staffId) conditions.push(eq(performanceGoals.staffId, staffId));

  const goals = await db
    .select()
    .from(performanceGoals)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .all();

  return NextResponse.json({ goals });
}, "performance:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const validated = performanceGoalCreateSchema.parse(body);

    const staffId = body.staffId || session.staffId;

    let institutionId = body.institutionId;
    if (!institutionId) {
      const inst = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, staffId))
        .get();
      institutionId = inst?.institutionId || "inst_default";
    }

    const id = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newGoal = {
      id,
      institutionId,
      staffId,
      reviewId: validated.reviewId || null,
      title: validated.title,
      description: validated.description || null,
      targetDate: validated.targetDate,
      progressPercentage: validated.progressPercentage ?? 0,
      status: "in_progress",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(performanceGoals).values(newGoal).run();

    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create goal" },
      { status: 400 }
    );
  }
}, "performance:evaluate");
