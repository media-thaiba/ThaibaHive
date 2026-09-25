import { db } from "@/db";
import { performanceReviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface MetricRating {
  metricId: string;
  score: number;
  comments?: string;
}

export interface ReviewSubmitOptions {
  reviewId: string;
  institutionId?: string;
  stage: "self_assessment" | "manager_review" | "hr_approval" | "signed_off";
  ratings?: MetricRating[];
  comments?: string;
  recommendedGrade?: string;
  submittingStaffId?: string;
  userRole?: string;
}

export class ReviewWorkflowService {
  static calculateFinalScore(ratings?: MetricRating[]): number {
    if (!ratings || ratings.length === 0) return 0;
    const total = ratings.reduce((sum, r) => sum + r.score, 0);
    return Math.round((total / ratings.length) * 100) / 100;
  }

  static calculateGrade(score: number): string {
    if (score >= 4.5) return "A+";
    if (score >= 4.0) return "A";
    if (score >= 3.0) return "B";
    if (score >= 2.0) return "C";
    return "D";
  }

  static async submitReviewStage(options: ReviewSubmitOptions) {
    const { reviewId, institutionId, stage, ratings = [], comments, recommendedGrade, submittingStaffId, userRole } = options;

    const query = db
      .select()
      .from(performanceReviews)
      .where(eq(performanceReviews.id, reviewId));

    const existing = await query.get();

    if (!existing) {
      throw new Error("Performance review record not found");
    }

    if (institutionId && existing.institutionId && existing.institutionId !== institutionId) {
      throw new Error("Performance review belongs to a different institution");
    }

    if (existing.status === "completed" || existing.status === "signed_off") {
      throw new Error("Review is locked for edits in current state");
    }

    // Anti-Self-Approval Guard:
    if (submittingStaffId && userRole !== "super_admin") {
      if ((stage === "manager_review" || stage === "hr_approval") && submittingStaffId === existing.staffId) {
        throw new Error("Anti-self-approval: Reviewee cannot evaluate or approve their own performance review");
      }
    }

    const calculatedScore = this.calculateFinalScore(ratings);
    const assignedGrade = recommendedGrade || this.calculateGrade(calculatedScore);

    let nextStatus = existing.status;
    const updatePayload: Record<string, unknown> = {
      ratingsJson: JSON.stringify(ratings),
      updatedAt: new Date().toISOString(),
    };

    if (stage === "self_assessment") {
      nextStatus = "manager_review";
      updatePayload.selfScore = calculatedScore;
      updatePayload.selfComments = comments || existing.selfComments;
      updatePayload.status = nextStatus;
      updatePayload.submittedAt = new Date().toISOString();
    } else if (stage === "manager_review") {
      nextStatus = "hr_approval";
      updatePayload.managerScore = calculatedScore;
      updatePayload.managerComments = comments || existing.managerComments;
      updatePayload.finalScore = calculatedScore;
      updatePayload.grade = assignedGrade;
      updatePayload.status = nextStatus;
    } else if (stage === "hr_approval") {
      nextStatus = "completed";
      updatePayload.hrComments = comments || existing.hrComments;
      updatePayload.status = nextStatus;
      updatePayload.approvedAt = new Date().toISOString();
    } else if (stage === "signed_off") {
      nextStatus = "signed_off";
      updatePayload.status = nextStatus;
    }

    await db
      .update(performanceReviews)
      .set(updatePayload)
      .where(eq(performanceReviews.id, reviewId))
      .run();

    return {
      success: true,
      reviewId,
      previousStatus: existing.status,
      newStatus: nextStatus,
      computedFinalScore: calculatedScore,
      grade: assignedGrade,
    };
  }
}
