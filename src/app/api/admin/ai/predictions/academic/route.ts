import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { runAcademicPredictions } from "@/lib/ai/academic-prediction-service";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));
  const studentId = searchParams.get("studentId") || undefined;

  const predictions = await runAcademicPredictions(institutionId, studentId);

  return NextResponse.json({
    success: true,
    institutionId,
    count: predictions.length,
    predictions,
  });
}, "analytics:predict");
