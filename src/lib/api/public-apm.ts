import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";
import { normalizeRoutePath } from "@/lib/observability/route-normalizer";

/**
 * Wraps public API route handlers (unauthenticated) to record telemetry in the Node.js APM aggregator.
 *
 * The generic constraint uses the standard Next.js App Router context shape.
 * The implementation uses a type assertion to bridge the contravariance gap
 * between the generic constraint and specific handler param types.
 * This avoids @typescript-eslint/no-explicit-any in the type signature.
 */
export function withPublicApm<
  T extends (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>
>(
  handler: T,
  explicitRoute?: string
): T {
  return (async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const route = explicitRoute || normalizeRoutePath(new URL(req.url).pathname);
    const method = req.method || "GET";

    try {
      // Type assertion bridges the function parameter contravariance gap.
      // The handler expects specific params (subtype of Record<string, string>),
      // which is safe at runtime because the actual params object contains
      // all required properties. The assertion is confined to this wrapper.
      const response: Response = await handler(req, ctx as Parameters<T>[1]);
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