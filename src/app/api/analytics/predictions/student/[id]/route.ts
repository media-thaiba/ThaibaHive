import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { InferenceService } from "@/lib/analytics/inference-service";

const inferenceService = new InferenceService();

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const params = context ? await context.params : { id: "stu-001" };
    const studentId = params.id;
    const tenantId = (session as any).institutionId || "inst-001";

    const result = await inferenceService.evaluateStudent({
      studentId,
      tenantId,
      attendanceRate: 0.72,
      assignmentAvgScore: 68,
      examAvgScore: 58,
      lmsLoginCountLast30Days: 8,
      feeOverdueDays: 0,
      disciplinaryEventsCount: 0,
    });

    return NextResponse.json({
      success: true,
      assessment: result.assessment,
      learningPath: result.learningPath,
      inferenceTimeMs: result.inferenceTimeMs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "analytics:read");
