import { NextResponse } from "next/server";
import { verifySession, resolveInstitutionScopeForSession, type SessionPayload, hasPermission, TenantMismatchError } from "@thaiba/auth";
import type { StaffRole } from "@/types";
import { normalizeRoutePath } from "../observability/route-normalizer";
import { SlidingWindowAggregator } from "../observability/sliding-window-aggregator";
import { EventBus } from "../observability/event-bus";
import { LegacyTokenDeprecationEngine } from "../identity/legacy-token-deprecation";
import crypto from "crypto";

function timingSafeSecretMatch(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const bufA = Buffer.from(provided, "utf-8");
  const bufB = Buffer.from(expected, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

type HandlerWithSession = (
  request: Request,
  session: SessionPayload,
  params?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function requireAuth(
  handler: HandlerWithSession,
  requiredPermission?: string
) {
  return async (
    request: Request,
    ...rest: unknown[]
  ) => {
    const context = rest[0] as { params: Promise<Record<string, string>> } | undefined;
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

      // SEC-03: Path-scoped machine identity with role: "system" (never unrestricted super_admin)
      const cronRoutes = (process.env.CRON_SECRET_ROUTES || "/api/system/update,/api/media/reconcile,/api/cron,/api/system/cleanup-nonces").split(",").map((s) => s.trim()).filter(Boolean);
      const isCronPathAllowed = cronRoutes.some((allowed) => normalizedPath.startsWith(allowed));
      const isDrPathAllowed = normalizedPath.startsWith("/api/system/dr") || normalizedPath.startsWith("/api/dr");
      const isCachePathAllowed = normalizedPath.startsWith("/api/system/cache") || normalizedPath.startsWith("/api/cache");

      if (
        (timingSafeSecretMatch(drSecret, process.env.DR_DRILL_SECRET) && isDrPathAllowed) ||
        (timingSafeSecretMatch(cacheSecret, process.env.CACHE_SYNC_SECRET) && isCachePathAllowed) ||
        (timingSafeSecretMatch(cronSecret, process.env.CRON_SECRET) && isCronPathAllowed)
      ) {
        session = {
          staffId: "system",
          role: "system",
          email: "system@internal",
          employeeId: "system",
          name: "System",
          tokenVersion: 1,
          institutionId: "global",
        };
      }
    }

    if (!session) {
      recordApm(401);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (requiredPermission) {
      const allowed = typeof hasPermission === "function"
        ? hasPermission(session.role as StaffRole, requiredPermission)
        : (session.role === "super_admin" || session.role === "system" || (session.role === "admin" && requiredPermission !== "system:super_admin"));
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

    // Server-side tenant scope resolution: always verified in real-time from DB
    // memberships, never trusted blindly from JWT claims, request params, or client body.
    // Admins resolve to "global" (the sanctioned unscoped bypass); mapped staff resolve
    // to their verified active institution membership.
    if (typeof resolveInstitutionScopeForSession === "function") {
      try {
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
        const scope = await resolveInstitutionScopeForSession(session, host);
        if (!scope) {
          if (session.role !== "super_admin" && session.role !== "admin" && session.role !== "system") {
            console.warn(
              JSON.stringify({
                event: "unmapped_institution_scope_blocked",
                severity: "error",
                staffId: session.staffId,
                role: session.role,
                url: request.url,
                timestamp: new Date().toISOString(),
              })
            );
            recordApm(403);
            return NextResponse.json(
              { error: "Forbidden: No institution assigned or access denied to tenant" },
              { status: 403 }
            );
          }
          session.institutionId = "global";
        } else {
          session.institutionId = scope;
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "institution_scope_resolution_failed",
            staffId: session.staffId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          })
        );
        recordApm(500);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      const response = await handler(
        request,
        session,
        context as { params: Promise<Record<string, string>> } | undefined
      );
      recordApm(response.status || 200);

      // Inject RFC 8594 headers safely
      if (response && response.headers && typeof response.headers.set === "function") {
        for (const [k, v] of Object.entries(deprecationHeaders)) {
          response.headers.set(k, v);
        }
      }

      return response;
    } catch (error) {
      if (
        (error as any)?.name === "TenantMismatchError" ||
        (error instanceof Error && (error.name === "TenantMismatchError" || error.message.startsWith("Forbidden:")))
      ) {
        const forbiddenMsg = error instanceof Error ? error.message : "Forbidden";
        console.warn(
          JSON.stringify({
            event: "tenant_mismatch_blocked",
            staffId: session.staffId,
            role: session.role,
            url: request.url,
            error: forbiddenMsg,
            timestamp: new Date().toISOString(),
          })
        );
        recordApm(403);
        return NextResponse.json({ error: forbiddenMsg }, { status: 403 });
      }

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

export { resolveRequestInstitution, resolveScopedInstitutionId, TenantMismatchError } from "@thaiba/auth";
