/**
 * Adaptive Risk-Aware Limiting Pipeline
 * Sprint-038 / AGS-003
 */

import { RateLimitContext, RateLimitResult, RateLimitTier } from "./rate-limit-types";
import { QuotaResolver } from "./quota-resolver";
import { RedisRateLimiterAdapter, IRedisRateLimitClient } from "./rate-limit-redis";

export class AdaptiveRateLimiter {
  private static instance: AdaptiveRateLimiter | null = null;
  private adapter: RedisRateLimiterAdapter;

  constructor(redisClient?: IRedisRateLimitClient | null) {
    this.adapter = new RedisRateLimiterAdapter(redisClient);
  }

  public static getInstance(redisClient?: IRedisRateLimitClient | null): AdaptiveRateLimiter {
    if (!AdaptiveRateLimiter.instance) {
      AdaptiveRateLimiter.instance = new AdaptiveRateLimiter(redisClient);
    }
    return AdaptiveRateLimiter.instance;
  }

  public getAdapter(): RedisRateLimiterAdapter {
    return this.adapter;
  }

  /**
   * Builds compound rate limit key incorporating tenant, role, DPoP thumbprint, and route category.
   */
  public buildCompoundKey(context: RateLimitContext, tier: RateLimitTier): string {
    const tenant = context.tenantId || "global";
    const role = context.role || "public";
    const dpopJkt = context.dpopThumbprint ? `dpop:${context.dpopThumbprint}` : "no-dpop";
    const userOrIp = context.userId ? `user:${context.userId}` : `ip:${context.ip || "unknown"}`;

    return `adaptive:${tenant}:${role}:${dpopJkt}:${userOrIp}:${tier}`;
  }

  /**
   * Evaluates incoming request adaptively using resolved quotas and risk multipliers.
   */
  public async evaluateRequest(
    context: RateLimitContext,
    tier: RateLimitTier = "query",
    nowMs: number = Date.now()
  ): Promise<RateLimitResult> {
    const hasDPoP = Boolean(context.dpopThumbprint && context.dpopThumbprint.length > 0);
    const resolved = QuotaResolver.resolveEffectiveRule({
      role: context.role,
      tier,
      riskScore: context.riskScore,
      hasDPoP,
    });

    // Critical threat tier (score > 80): Immediate 0 quota drop
    if (resolved.maxRequests === 0) {
      return {
        allowed: false,
        totalLimit: 0,
        remaining: 0,
        resetMs: nowMs + 60_000,
        retryAfterSeconds: 60,
        dimension: "compound",
        key: this.buildCompoundKey(context, tier),
        riskPenaltyApplied: true,
      };
    }

    const key = this.buildCompoundKey(context, tier);
    const result = await this.adapter.evaluate(key, resolved, "compound", nowMs);

    return {
      ...result,
      riskPenaltyApplied: resolved.riskPenaltyApplied,
    };
  }

  public reset(): void {
    this.adapter.reset();
  }
}
