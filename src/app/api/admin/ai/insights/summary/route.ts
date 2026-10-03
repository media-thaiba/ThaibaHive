import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { generateExecutiveBriefing } from "@/lib/ai/executive-summarizer";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));

  const briefing = await generateExecutiveBriefing(institutionId);

  return NextResponse.json({
    success: true,
    institutionId,
    briefing,
  });
}, "analytics:predict");
