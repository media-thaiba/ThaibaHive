import { NextResponse } from "next/server";
import { verifySession, type SessionPayload, hasPermission } from "../../../packages/auth";
import type { StaffRole } from "@/types";
import { normalizeRoutePath } from "../observability/route-normalizer";
import { SlidingWindowAggregator } from "../observability/sliding-window-aggregator";
import { EventBus } from "../observability/event-bus";
import { LegacyTokenDeprecationEngine } from "../identity/legacy-token-deprecation";

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

    let session = await verifySession();

    if (!session) {
      const drSecret = request.headers.get("x-dr-secret");
      const cacheSecret = request.headers.get("x-cache-secret");
      const cronSecret = request.headers.get("x-cron-secret");

      if (
        (process.env.DR_DRILL_SECRET && drSecret === process.env.DR_DRILL_SECRET) ||
        (process.env.CACHE_SYNC_SECRET && cacheSecret === process.env.CACHE_SYNC_SECRET) ||
        (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET)
      ) {
        session = { staffId: "system", role: "super_admin", email: "system@internal" } as any;
      }
    }

    if (!session) {
      recordApm(401);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (requiredPermission) {
      const allowed = typeof hasPermission === "function"
        ? hasPermission(session.role as StaffRole, requiredPermission)
        : (session.role === "super_admin" || (session.role === "admin" && requiredPermission !== "system:super_admin"));
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

    // Evaluate legacy token deprecation headers
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    let deprecationHeaders: Record<string, string> = {};

    if (token) {
      try {
        const depResult = LegacyTokenDeprecationEngine.getInstance().evaluate(token, request.method);
        if (depResult.isRejected) {
          recordApm(401);
          return NextResponse.json(
            depResult.problemDetails || { error: "Legacy Bearer token rejected under deprecation policy" },
            { status: 401, headers: depResult.headers }
          );
        }
        if (depResult.isLegacy) {
          deprecationHeaders = depResult.headers;
        }
      } catch {
        // Fallback
      }
    }

    try {
      const response = await handler(request, session, context);
      recordApm(response.status || 200);

      // Inject RFC 8594 headers safely
      if (response && response.headers && typeof response.headers.set === "function") {
        for (const [k, v] of Object.entries(deprecationHeaders)) {
          response.headers.set(k, v);
        }
      }

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
