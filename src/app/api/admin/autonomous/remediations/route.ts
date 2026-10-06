import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { SelfHealingHealthService } from "@/lib/services/self-healing-health-service";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const rawInst = searchParams.get("institutionId") || searchParams.get("tenantId") || undefined;
  const resolvedInst = await resolveRequestInstitution(session, rawInst);
  const institutionId = resolvedInst === "global" ? undefined : resolvedInst;

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
