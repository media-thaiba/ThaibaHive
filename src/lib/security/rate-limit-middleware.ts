/**
 * Next.js API Route Middleware Decorator for Adaptive Rate Limiting & Security Shield
 * Sprint-038 / AGS-004 & Sprint-039 / TIF-003
 */

import { NextResponse } from "next/server";
import { RateLimitTier, RateLimitContext } from "./rate-limit-types";
import { AdaptiveRateLimiter } from "./adaptive-limiter";
import { QuarantineManager } from "./quarantine-manager";
import { GatewayMetricsTracker } from "./gateway-metrics";
import { logGatewayThreatEvent } from "./threat-audit-events";

export interface WithRateLimitOptions {
  tier?: RateLimitTier;
  customMaxRequests?: number;
  skipAnonymous?: boolean;
}

type AnyApiHandler = (request: Request, ...args: unknown[]) => Promise<Response>;

/**
 * Extracts client IP from standard proxy headers (CF-Connecting-IP, X-Forwarded-For, X-Real-IP)
 */
export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const ips = xff.split(",");
    if (ips.length > 0 && ips[0].trim()) {
      return ips[0].trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

function setRateLimitHeaders(response: Response, totalLimit: number, remaining: number, resetMs: number): void {
  const limitStr = totalLimit.toString();
  const remainingStr = remaining.toString();
  const resetStr = Math.ceil(resetMs / 1000).toString();

  const h: any = response.headers;
  if (h && typeof h.set === "function") {
    h.set("ratelimit-limit", limitStr);
    h.set("ratelimit-remaining", remainingStr);
    h.set("ratelimit-reset", resetStr);
  } else if (h && typeof h.append === "function") {
    h.append("ratelimit-limit", limitStr);
    h.append("ratelimit-remaining", remainingStr);
    h.append("ratelimit-reset", resetStr);
  } else if (h && typeof h === "object") {
    h["ratelimit-limit"] = limitStr;
    h["ratelimit-remaining"] = remainingStr;
    h["ratelimit-reset"] = resetStr;
  }
}

/**
 * Decorator to attach distributed rate limiting, quarantine checks, and security headers to Next.js API routes.
 */
export function withRateLimit(
  handler: AnyApiHandler,
  options: WithRateLimitOptions = { tier: "query" }
) {
  return async (request: Request, ...args: unknown[]): Promise<Response> => {
    // Feature flag bypass check
    if (process.env.RATE_LIMIT_ENFORCEMENT_ENABLED === "false") {
      return handler(request, ...args);
    }

    const ip = extractClientIp(request);
    const dpopThumbprint = request.headers.get("x-dpop-thumbprint") || undefined;
    const tenantId = request.headers.get("x-tenant-id") || undefined;
    const role = request.headers.get("x-user-role") || undefined;
    const userId = request.headers.get("x-user-id") || undefined;
    const riskScoreHeader = request.headers.get("x-risk-score");
    const riskScore = riskScoreHeader ? parseInt(riskScoreHeader, 10) : 0;

    GatewayMetricsTracker.getInstance().recordRequest();

    // 1. IP / Subnet Quarantine Fast-Path Check (TIF-003)
    const quarantineStatus = QuarantineManager.getInstance().checkQuarantineStatus(ip, tenantId || "default");
    if (quarantineStatus.quarantined) {
      const isSubnet = quarantineStatus.isSubnet;
      const banProblem = isSubnet
        ? {
            type: "https://thaibahive.internal/errors/subnet-quarantined",
            title: "Forbidden - Subnet Quarantined",
            status: 403,
            code: "QUARANTINED_SUBNET",
            detail: `Client IP ${ip} belongs to a quarantined /24 subnet contained due to security threat mitigation policies.`,
            instance: request.url,
            subnet: quarantineStatus.subnetCidr,
          }
        : {
            type: "https://thaibahive.internal/errors/ip-quarantined",
            title: "Forbidden - IP Quarantined",
            status: 403,
            code: "QUARANTINED_IP",
            detail: `Client IP ${ip} has been temporarily quarantined due to security threat mitigation policies.`,
            instance: request.url,
          };

      await logGatewayThreatEvent({
        eventType: isSubnet ? "gateway.subnet.contained" : "gateway.ip.quarantined",
        ipAddress: ip,
        tenantId,
        userId,
        reason: isSubnet ? "Access attempted from contained subnet" : "Access attempted by quarantined IP address",
        threatScore: 100,
      });

      return new NextResponse(JSON.stringify(banProblem), {
        status: 403,
        headers: {
          "content-type": "application/problem+json",
          "retry-after": "3600",
        },
      });
    }

    // 2. Adaptive Rate Limiting Evaluation
    const context: RateLimitContext = {
      ip,
      dpopThumbprint,
      tenantId,
      role,
      userId,
      riskScore: isNaN(riskScore) ? 0 : riskScore,
      routeCategory: options.tier || "query",
    };

    const limiter = AdaptiveRateLimiter.getInstance();
    const result = await limiter.evaluateRequest(context, options.tier || "query");

    if (!result.allowed) {
      GatewayMetricsTracker.getInstance().recordRateLimitViolation();

      await logGatewayThreatEvent({
        eventType: "gateway.ratelimit.exceeded",
        ipAddress: ip,
        tenantId,
        userId,
        reason: `Rate limit quota of ${result.totalLimit} exceeded for tier ${options.tier || "query"}`,
        threatScore: riskScore,
      });

      const problemDetails = {
        type: "https://thaibahive.internal/errors/rate-limit-exceeded",
        title: "Too Many Requests",
        status: 429,
        detail: `Rate limit of ${result.totalLimit} requests per window exceeded. Please retry after ${result.retryAfterSeconds} seconds.`,
        instance: request.url,
        retryAfter: result.retryAfterSeconds,
        riskPenaltyApplied: result.riskPenaltyApplied || false,
      };

      const res = new NextResponse(JSON.stringify(problemDetails), {
        status: 429,
        headers: {
          "content-type": "application/problem+json",
          "retry-after": result.retryAfterSeconds.toString(),
          "ratelimit-limit": result.totalLimit.toString(),
          "ratelimit-remaining": "0",
          "ratelimit-reset": Math.ceil(result.resetMs / 1000).toString(),
        },
      });
      return res;
    }

    const response = await handler(request, ...args);
    setRateLimitHeaders(response, result.totalLimit, result.remaining, result.resetMs);

    return response;
  };
}
