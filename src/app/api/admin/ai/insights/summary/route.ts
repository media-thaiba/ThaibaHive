import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { generateExecutiveBriefing } from "@/lib/ai/executive-summarizer";
import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const userInstScope = await getUserInstitutionScope();
  const institutionId = requestedInst || userInstScope || "inst_default";

  const briefing = await generateExecutiveBriefing(institutionId);

  return NextResponse.json({
    success: true,
    institutionId,
    briefing,
  });
}, "analytics:predict");
