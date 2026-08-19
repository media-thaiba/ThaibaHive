/**
 * Unified Rate Limiting Orchestrator
 * Sprint-038: Distributed Adaptive Rate Limiting
 */

import { RateLimitRule, RateLimitResult, RateLimitTier, RateLimitContext } from "./rate-limit-types";
import { SlidingWindowLimiter } from "./sliding-window";

export const DEFAULT_TIER_RULES: Record<RateLimitTier, RateLimitRule> = {
  public: {
    windowMs: 60_000,
    maxRequests: 60, // 60 req/min
    burstAllowance: 15,
  },
  auth: {
    windowMs: 60_000,
    maxRequests: 15, // 15 auth attempts/min
    burstAllowance: 5,
  },
  mutation: {
    windowMs: 60_000,
    maxRequests: 120, // 120 writes/min
    burstAllowance: 30,
  },
  query: {
    windowMs: 60_000,
    maxRequests: 300, // 300 queries/min
    burstAllowance: 50,
  },
  export: {
    windowMs: 60_000,
    maxRequests: 10, // 10 exports/min
    burstAllowance: 2,
  },
  admin: {
    windowMs: 60_000,
    maxRequests: 600, // 600 req/min
    burstAllowance: 100,
  },
  custom: {
    windowMs: 60_000,
    maxRequests: 100,
    burstAllowance: 20,
  },
};

export class RateLimiter {
  private static instance: RateLimiter | null = null;
  private inMemoryLimiter: SlidingWindowLimiter;

  constructor() {
    this.inMemoryLimiter = new SlidingWindowLimiter();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Constructs a compound rate limit key from request context.
   */
  public buildCompoundKey(context: RateLimitContext, tier: RateLimitTier): string {
    const tenant = context.tenantId || "global";
    const role = context.role || "public";
    const dpopJkt = context.dpopThumbprint || "no-dpop";
    const ip = context.ip || "unknown-ip";

    if (context.userId || context.dpopThumbprint) {
      return `ratelimit:${tenant}:${role}:${dpopJkt}:${context.userId || ip}:${tier}`;
    }

    return `ratelimit:${tenant}:anon:${ip}:${tier}`;
  }

  /**
   * Evaluates request against configured tier rules.
   */
  public evaluate(
    context: RateLimitContext,
    tier: RateLimitTier = "query",
    customRule?: RateLimitRule
  ): RateLimitResult {
    const rule = customRule || DEFAULT_TIER_RULES[tier] || DEFAULT_TIER_RULES.query;
    const key = this.buildCompoundKey(context, tier);

    return this.inMemoryLimiter.evaluateWindow(key, rule, "compound");
  }

  public reset(): void {
    this.inMemoryLimiter.reset();
  }
}
