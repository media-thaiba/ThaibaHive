/**
 * Gateway Circuit Breaker Manual Override API Route
 * Sprint-038 / AGS-012
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { withDPoP } from "@/lib/identity/dpop-middleware";
import { GatewayCircuitBreaker } from "@/lib/security/circuit-breaker";
import { CircuitBreakerOverrideSchema } from "@/lib/validation/gateway-schemas";

export const POST = withDPoP(
  requireAuth(async (request: Request, session) => {
    try {
      const body = await request.json();
      const parsed = CircuitBreakerOverrideSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
      }

      const breaker = GatewayCircuitBreaker.getInstance();
      const operator = session?.email || "admin";

      if (parsed.data.action === "TRIP") {
        breaker.manualTrip(`Manual emergency trip by ${operator}: ${parsed.data.reason || "Manual mitigation"}`);
      } else {
        breaker.manualReset();
      }

      return NextResponse.json({
        success: true,
        state: breaker.getState(),
        action: parsed.data.action,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to execute circuit breaker override" }, { status: 500 });
    }
  }, "system:security:manage"),
  { required: false }
);
