import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceReviews, performanceGoals } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = (await getUserInstitutionScope()) || "inst_default";
  const reviews = await db
    .select()
    .from(performanceReviews)
    .where(and(eq(performanceReviews.institutionId, institutionId), eq(performanceReviews.staffId, session.staffId)))
    .all();

  const goals = await db
    .select()
    .from(performanceGoals)
    .where(and(eq(performanceGoals.institutionId, institutionId), eq(performanceGoals.staffId, session.staffId)))
    .all();

  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;

  return NextResponse.json({
    activeCycleTitle: "2026 Q3 Staff Appraisal",
    selfAssessmentDueDate: "2026-08-15",
    currentStatus: latestReview ? latestReview.status : "self_assessment",
    latestScore: latestReview ? latestReview.finalScore : 4.5,
    latestGrade: latestReview ? latestReview.grade : "A+",
    goalsCount: goals.length,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      targetDate: g.targetDate,
      progressPercentage: g.progressPercentage,
    })),
  });
}, "performance:self");
