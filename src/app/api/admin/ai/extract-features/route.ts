import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import { extractStudentFeatures } from "@/lib/ai/feature-extractor";
import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(async (request: Request, _session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const userInstScope = await getUserInstitutionScope();
  const institutionId = requestedInst || userInstScope || "inst_default";
  const studentId = searchParams.get("studentId") || undefined;

  const features = await extractStudentFeatures(institutionId, studentId);

  return NextResponse.json({
    success: true,
    institutionId,
    count: features.length,
    features,
  });
}, "analytics:predict");
