import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { SelfHealingHealthService } from "@/lib/services/self-healing-health-service";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const institutionId = searchParams.get("institutionId") ?? undefined;

  try {
    const health = await SelfHealingHealthService.getSystemHealth(institutionId);
    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch self-healing health metrics" },
      { status: 500 }
    );
  }
}, "autonomy:view");
