import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { aiTokenTracker } from "@/lib/ai/metering/token-tracker";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/usage
 * Returns token consumption and budget limits for the authenticated tenant.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const usage = await aiTokenTracker.getUsageSummary(institutionId);

  return NextResponse.json({
    success: true,
    usage,
  });
}, "ai:usage:view");
