import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { QueryCircuitBreaker } from "@/lib/resilience/query-circuit-breaker";

const globalCircuitBreaker = new QueryCircuitBreaker({
  serviceName: "database-query-pool",
  maxFailureRate: 0.2,
  maxMedianLatencyMs: 2000,
  cooldownPeriodSec: 60,
});

export const GET = requireAuth(async () => {
  try {
    const circuitState = globalCircuitBreaker.getState();
    return NextResponse.json({ circuitState }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch circuit breaker status" },
      { status: 500 }
    );
  }
}, "resilience:manage");

export const POST = requireAuth(async (request: Request) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const { action } = body;

  if (action === "reset") {
    globalCircuitBreaker.resetCircuitBreaker();
    return NextResponse.json({ message: "Circuit breaker reset to CLOSED", state: globalCircuitBreaker.getState() }, { status: 200 });
  }

  if (action === "trip") {
    globalCircuitBreaker.tripCircuit();
    return NextResponse.json({ message: "Circuit breaker manually tripped to OPEN", state: globalCircuitBreaker.getState() }, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid action. Supported: reset, trip" }, { status: 400 });
}, "resilience:manage");
