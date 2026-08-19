import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { runAcademicPredictions } from "@/lib/ai/academic-prediction-service";
import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const userInstScope = await getUserInstitutionScope();
  const institutionId = requestedInst || userInstScope || "inst_default";
  const studentId = searchParams.get("studentId") || undefined;

  const predictions = await runAcademicPredictions(institutionId, studentId);

  return NextResponse.json({
    success: true,
    institutionId,
    count: predictions.length,
    predictions,
  });
}, "analytics:predict");
