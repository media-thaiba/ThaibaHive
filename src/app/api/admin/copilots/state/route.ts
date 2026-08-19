import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { redisStateManager } from "@/lib/services/redis-state-manager";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || "inst_101";
  const feature = searchParams.get("feature") || "copilot_query";

  try {
    const circuit = await redisStateManager.getCircuitState(tenantId, feature);
    const isRedis = redisStateManager.isRedisConnected();

    return NextResponse.json(
      {
        redisStatus: isRedis ? "CONNECTED" : "IN_MEMORY_FALLBACK",
        mode: isRedis ? "distributed_cluster" : "single_node_fallback",
        tenantId,
        feature,
        circuitState: circuit,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch circuit breaker state" },
      { status: 500 }
    );
  }
}, "copilot:view");

export const POST = requireAuth(async (request: Request) => {
  let body: { tenantId?: string; feature?: string; action?: "reset" | "trip" } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const tenantId = body.tenantId || "inst_101";
  const feature = body.feature || "copilot_query";

  try {
    if (body.action === "reset") {
      await redisStateManager.resetCircuit(tenantId, feature);
    } else if (body.action === "trip") {
      await redisStateManager.recordFailure(tenantId, feature, 1, 300);
    }

    const updated = await redisStateManager.getCircuitState(tenantId, feature);
    return NextResponse.json({ success: true, circuitState: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update circuit breaker state" },
      { status: 500 }
    );
  }
}, "agent:manage");
