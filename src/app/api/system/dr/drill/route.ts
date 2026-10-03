import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { drillOrchestrator } from "@/lib/dr/drill-orchestrator";
import { DrillScenarioType } from "@/lib/dr/types";

async function getHandler(request: Request, session: any) {
  const authHeader = request.headers.get("x-dr-secret");
  const validSecret = process.env.DR_DRILL_SECRET && authHeader === process.env.DR_DRILL_SECRET;

  if (!session && !validSecret) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    current: drillOrchestrator.getStatus(),
    history: drillOrchestrator.getHistory(),
  });
}

async function postHandler(request: Request, session: any) {
  const authHeader = request.headers.get("x-dr-secret");
  const validSecret = process.env.DR_DRILL_SECRET && authHeader === process.env.DR_DRILL_SECRET;

  if (!session && !validSecret) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden - Super Admin required for DR drill operations" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, scenario } = body;

    if (action === "abort") {
      const aborted = await drillOrchestrator.abortDrill();
      return NextResponse.json({ success: true, aborted, message: "Drill aborted and all faults reverted." });
    }

    if (action === "start") {
      const validScenarios: DrillScenarioType[] = [
        "PRIMARY_OUTAGE",
        "REGIONAL_PARTITION",
        "CACHE_DESYNC",
        "MULTI_TENANT_ISOLATION_DRILL",
      ];

      if (!scenario || !validScenarios.includes(scenario)) {
        return NextResponse.json(
          { error: `Invalid scenario. Expected one of: ${validScenarios.join(", ")}` },
          { status: 400 }
        );
      }

      const result = await drillOrchestrator.runDrill(scenario);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid action. Expected 'start' or 'abort'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to execute DR drill operation", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, "system:manage");
export const POST = requireAuth(postHandler, "system:manage");
