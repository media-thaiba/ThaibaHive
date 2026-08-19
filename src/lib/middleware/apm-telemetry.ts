/**
 * @module ApmTelemetryMiddleware
 * Request-scoped latency tracking and telemetry header injection for Next.js Edge middleware.
 * Zero-overhead, Edge-safe design using pure Web Standard APIs only.
 */

import type { NextResponse, NextRequest } from "next/server";

export interface ApmContext {
  startTime: number;
  pathname: string;
  method: string;
}

/**
 * Initialize APM request context at the beginning of middleware pipeline.
 * Pure Web-standard: works across Edge and Node.js runtimes.
 */
export function startApmTracking(request: NextRequest): ApmContext {
  return {
    startTime: typeof performance !== "undefined" ? performance.now() : Date.now(),
    pathname: request.nextUrl?.pathname || "/",
    method: request.method || "GET",
  };
}

/**
 * Complete APM request tracking and inject response headers.
 * Safe for Edge runtime (no Node-only or database dependencies).
 */
export function completeApmTracking(
  context: ApmContext,
  response: NextResponse
): NextResponse {
  // Respect emergency kill switch
  if (process.env.APM_TELEMETRY_ENABLED === "false") {
    return response;
  }

  const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const durationMs = Number((endTime - context.startTime).toFixed(2));

  // Inject response latency header
  response.headers.set("x-response-time", `${durationMs}ms`);

  return response;
}
