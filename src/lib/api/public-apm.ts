import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";
import { normalizeRoutePath } from "@/lib/observability/route-normalizer";

/**
 * Wraps public API route handlers (unauthenticated) to record telemetry in the Node.js APM aggregator.
 * Preserves the original handler type `T` so Next.js route-type inference (`ParamCheck<RouteContext>`)
 * and direct test invocation (one argument) both continue to work.
 */
export function withPublicApm<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (request: Request, context?: any) => Promise<Response>
>(
  handler: T,
  explicitRoute?: string
): T {
  return (async (req: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: any) => {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const route = explicitRoute || normalizeRoutePath(new URL(req.url).pathname);
    const method = req.method || "GET";

    try {
      const response: Response = await handler(req, context);
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
  }) as unknown as T;
}
