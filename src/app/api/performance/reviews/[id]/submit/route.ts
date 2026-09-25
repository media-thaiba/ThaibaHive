import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { ReviewWorkflowService } from "@/lib/performance/review-workflow-service";
import { getUserInstitutionScope } from "@/lib/auth";

export const POST = requireAuth(async (request: Request, session, context) => {
  try {
    const params = context?.params ? await context.params : {};
    const reviewId = params.id || request.url.split("/reviews/")[1]?.split("/submit")[0];
    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    const institutionId = (await getUserInstitutionScope()) || undefined;
    const body = await request.json();

    const result = await ReviewWorkflowService.submitReviewStage({
      reviewId,
      institutionId,
      stage: body.stage,
      ratings: body.ratings || [],
      comments: body.comments || body.selfComments || body.managerComments || body.hrComments,
      recommendedGrade: body.recommendedGrade,
      submittingStaffId: session.staffId,
      userRole: session.role,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review submission failed";
    const status = message.includes("Anti-self-approval") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}, "performance:evaluate");
