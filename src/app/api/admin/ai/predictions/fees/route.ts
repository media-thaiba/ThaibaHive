import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { runFeeForecasting } from "@/lib/ai/fee-forecasting-service";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));
  const studentId = searchParams.get("studentId") || undefined;

  const forecast = await runFeeForecasting(institutionId, studentId);

  return NextResponse.json({
    success: true,
    institutionId,
    forecast,
  });
}, "analytics:predict");
