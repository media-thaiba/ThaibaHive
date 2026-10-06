import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiCopilotRecommendations } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId") || searchParams.get("institutionId"));

  try {
    const records = await db
      .select()
      .from(aiCopilotRecommendations)
      .where(eq(aiCopilotRecommendations.tenantId, tenantId))
      .all();

    return NextResponse.json({
      success: true,
      data: records,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mobile copilot recommendations" },
      { status: 500 }
    );
  }
}, "copilot:view");
