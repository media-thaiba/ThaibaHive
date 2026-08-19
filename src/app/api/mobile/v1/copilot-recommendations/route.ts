import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { aiCopilotRecommendations } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || "inst_101";

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
