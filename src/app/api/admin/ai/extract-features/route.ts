import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { extractStudentFeatures } from "@/lib/ai/feature-extractor";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));
  const studentId = searchParams.get("studentId") || undefined;



  const features = await extractStudentFeatures(institutionId, studentId);

  return NextResponse.json({
    success: true,
    institutionId,
    count: features.length,
    features,
  });
}, "analytics:predict");
