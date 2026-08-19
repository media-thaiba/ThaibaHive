import { NextResponse } from "next/server";
import { verifySession, type SessionPayload, hasPermission } from "../../../packages/auth";
import type { StaffRole } from "@/types";
import { normalizeRoutePath } from "../observability/route-normalizer";
import { SlidingWindowAggregator } from "../observability/sliding-window-aggregator";
import { EventBus } from "../observability/event-bus";

type HandlerWithSession = (
  request: Request,
  session: SessionPayload,
  params?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function requireAuth(
  handler: HandlerWithSession,
  requiredPermission?: string
) {
  return async (request: Request, context?: any) => {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const urlObj = new URL(request.url);
    const normalizedPath = normalizeRoutePath(urlObj.pathname);
    const method = request.method || "GET";

    const recordApm = (statusCode: number) => {
      if (process.env.APM_TELEMETRY_ENABLED === "false") return;
      const durationMs = Number(((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime).toFixed(2));
      try {
        SlidingWindowAggregator.getInstance().recordRequest(
          normalizedPath,
          method,
          statusCode,
          durationMs
        );
        if (durationMs > 1000) {
          EventBus.getInstance().publishEvent({
            eventSource: "api_route_apm",
            severity: "warning",
            message: `High latency detected on ${method} ${normalizedPath}: ${durationMs}ms (status: ${statusCode})`,
          });
        }
      } catch {
        // Suppress telemetry errors
      }
    };

    const session = await verifySession();

    if (!session) {
      recordApm(401);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (requiredPermission) {
      const allowed = hasPermission(session.role as StaffRole, requiredPermission);
      if (!allowed) {
        console.warn(
          JSON.stringify({
            event: "unauthorized_access_attempt",
            staffId: session.staffId,
            role: session.role,
            requiredPermission,
            url: request.url,
            timestamp: new Date().toISOString(),
          })
        );
        recordApm(403);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    try {
      const response = await handler(request, session, context);
      recordApm(response.status || 200);
      return response;
    } catch (error) {
      recordApm(500);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(
        JSON.stringify({
          event: "api_route_error",
          url: request.url,
          method: request.method,
          error: errorMsg,
          stack,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
