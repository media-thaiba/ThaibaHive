import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";
import { normalizeRoutePath } from "@/lib/observability/route-normalizer";

/**
 * Wraps public API route handlers (unauthenticated) to record telemetry in the Node.js APM aggregator.
 */
export function withPublicApm<T extends (request: Request, ...args: any[]) => Promise<Response>>(
  handler: T,
  explicitRoute?: string
): T {
  return (async (request: Request, ...rest: any[]) => {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const route = explicitRoute || normalizeRoutePath(new URL(request.url).pathname);
    const method = request.method || "GET";

    try {
      const response = await handler(request, ...rest);
      if (process.env.APM_TELEMETRY_ENABLED !== "false") {
        const durationMs = Number(((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime).toFixed(2));
        SlidingWindowAggregator.getInstance().recordRequest(route, method, response.status, durationMs);
      }
      return response;
    } catch (err) {
      if (process.env.APM_TELEMETRY_ENABLED !== "false") {
        const durationMs = Number(((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime).toFixed(2));
        SlidingWindowAggregator.getInstance().recordRequest(route, method, 500, durationMs);
      }
      throw err;
    }
  }) as T;
}
