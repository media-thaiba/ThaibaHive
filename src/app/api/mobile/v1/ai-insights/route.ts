import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { generateExecutiveBriefing } from "@/lib/ai/executive-summarizer";
import { getUserInstitutionScope } from "@/lib/auth";

export const GET = requireAuth(async (request: Request, session) => {
  const userInstScope = await getUserInstitutionScope();
  const institutionId = userInstScope || "inst_default";

  const briefing = await generateExecutiveBriefing(institutionId);

  return NextResponse.json({
    success: true,
    institutionId,
    summary: briefing.executiveSummary,
    metrics: briefing.metrics,
    anomalies: briefing.anomalies,
    recommendedActions: briefing.recommendedActions,
  });
}, "sync:device");
