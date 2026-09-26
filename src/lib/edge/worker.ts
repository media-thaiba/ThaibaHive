import { EdgeRequest, EdgeResponse, EdgeContext, TenantContext } from "./types";
import { parseTenantContext } from "./tenant-context";
import { checkRateLimit } from "./rate-limiter";
import { getCachedResponse, setCachedResponse } from "../cache/edge-cache";
import { routeDatabaseQuery } from "../database/edge-router";
import { recordEdgeMetrics } from "../monitoring/edge-analytics";

export async function handleEdgeRequest(
  req: EdgeRequest,
  ctx: EdgeContext
): Promise<EdgeResponse> {
  const startTime = Date.now();
  let tenant: TenantContext | null = null;

  try {
    // 1. JWT / Tenant Context Verification
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      tenant = await parseTenantContext(token);
    }

    const tenantId = tenant?.tenantId || "anonymous";

    // 2. Distributed Rate Limiting
    const clientIp = ctx.clientIp || "127.0.0.1";
    const limiterKey = tenant ? `tenant:${tenantId}` : `ip:${clientIp}`;
    const rateLimit = await checkRateLimit(limiterKey, tenant ? 100 : 20); // 100/min for authed, 20/min for anonymous

    if (!rateLimit.allowed) {
      recordEdgeMetrics(tenantId, ctx.region, req.url, Date.now() - startTime, false, true);
      return {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.resetSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
        body: JSON.stringify({ error: "Too many requests. Please try again later." }),
      };
    }

    // 3. Request caching checks (Only for GET/read-heavy endpoints)
    const isCacheable = req.method === "GET" || (req.method === "POST" && req.url.includes("/graphql") && !req.body?.includes("mutation"));
    const cacheKey = `${tenantId}:${req.url}:${req.body || ""}`;

    if (isCacheable) {
      const cached = await getCachedResponse(cacheKey);
      if (cached) {
        const latency = Date.now() - startTime;
        recordEdgeMetrics(tenantId, ctx.region, req.url, latency, true, false);
        return {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Edge-Cache": "HIT",
            "X-Edge-Region": ctx.region,
            "X-Edge-Latency": `${latency}ms`,
          },
          body: cached,
        };
      }
    }

    // 4. Geographically-aware routing check
    // If it's a direct DB read operation request, select closest replica endpoint
    let targetUrl = req.url;
    if (req.url.includes("/api/db/query")) {
      const replica = await routeDatabaseQuery(ctx.region, req.method !== "GET");
      targetUrl = `${replica}${req.url.substring(req.url.indexOf("/api"))}`;
    }

    // 5. Mock / Real Origin fetch simulation (Fallback to standard fetch/forward)
    // Add context headers before forwarding
    const forwardHeaders: Record<string, string> = { ...req.headers };
    if (tenant) {
      forwardHeaders["x-tenant-id"] = tenant.tenantId;
      forwardHeaders["x-user-id"] = tenant.userId;
      forwardHeaders["x-user-role"] = tenant.role;
      forwardHeaders["x-user-permissions"] = tenant.permissions.join(",");
    }
    forwardHeaders["x-forwarded-for"] = clientIp;
    forwardHeaders["x-edge-region"] = ctx.region;

    // Execute origin request forwarding
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.body,
    });

    const bodyText = await response.text();

    // Cache the response if successful and cacheable
    if (isCacheable && response.status === 200) {
      await setCachedResponse(cacheKey, bodyText, 60); // 60 seconds default TTL
    }

    const latency = Date.now() - startTime;
    recordEdgeMetrics(tenantId, ctx.region, req.url, latency, false, false);

    const resHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });
    resHeaders["X-Edge-Cache"] = "MISS";
    resHeaders["X-Edge-Region"] = ctx.region;
    resHeaders["X-Edge-Latency"] = `${latency}ms`;

    return {
      status: response.status,
      headers: resHeaders,
      body: bodyText,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    recordEdgeMetrics(tenant?.tenantId || "anonymous", ctx.region, req.url, latency, false, false);
    return {
      status: 500,
      headers: { "Content-Type": "application/json", "X-Edge-Region": ctx.region },
      body: JSON.stringify({ error: "Internal Edge Server Error", message: error.message }),
    };
  }
}
