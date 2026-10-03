import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { runAttendancePredictions } from "@/lib/ai/attendance-prediction-service";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));

  const predictions = await runAttendancePredictions(institutionId);

  return NextResponse.json({
    success: true,
    institutionId,
    count: predictions.length,
    predictions,
  });
}, "analytics:predict");
