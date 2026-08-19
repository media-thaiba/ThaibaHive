/**
 * Quota Resolver with Role Tiers and Risk Modifiers
 * Sprint-038 / AGS-003
 */

import { RateLimitRule, RateLimitTier } from "./rate-limit-types";
import { DEFAULT_TIER_RULES } from "./rate-limiter";
import { EventBus } from "../observability/event-bus";

export interface QuotaResolutionOptions {
  role?: string;
  tier?: RateLimitTier;
  riskScore?: number;
  hasDPoP?: boolean;
}

export class QuotaResolver {
  /**
   * Multiplier based on user role.
   * Super Admins and Admins receive higher capacity, while public unauthenticated requests get baseline.
   */
  public static getRoleMultiplier(role?: string): number {
    switch (role) {
      case "super_admin":
        return 3.0;
      case "admin":
        return 2.0;
      case "principal":
        return 1.5;
      case "hod":
        return 1.25;
      case "staff":
        return 1.0;
      default:
        return 0.5; // Anonymous / public
    }
  }

  /**
   * Risk modifier:
   * Continuous risk score (0-100) from Sprint-037 risk engine.
   * 0 - 20 (Low): 100% capacity (1.0)
   * 21 - 50 (Medium): 75% capacity (0.75)
   * 51 - 80 (High): 50% capacity (0.50)
   * 81 - 100 (Critical): 10% capacity (0.10)
   */
  public static getRiskMultiplier(riskScore: number = 0): number {
    if (riskScore <= 20) return 1.0;
    if (riskScore <= 50) return 0.75;
    if (riskScore <= 80) return 0.50;
    return 0.10; // Critical threat: 10% minimal capacity
  }

  /**
   * Resolves effective rate limit rule taking into account base tier, role, risk score, and DPoP cryptographic attestation.
   */
  public static resolveEffectiveRule(options: QuotaResolutionOptions): RateLimitRule & { riskPenaltyApplied: boolean } {
    const tier = options.tier || "query";
    const baseRule = DEFAULT_TIER_RULES[tier] || DEFAULT_TIER_RULES.query;

    const roleMult = this.getRoleMultiplier(options.role);
    const riskMult = this.getRiskMultiplier(options.riskScore ?? 0);
    const dpopBoost = options.hasDPoP ? 1.2 : 1.0; // Verified cryptographic DPoP sessions get +20% capacity

    const effectiveMult = roleMult * riskMult * dpopBoost;
    const computedMax = Math.max(1, Math.floor(baseRule.maxRequests * effectiveMult));
    const computedBurst = Math.max(1, Math.floor((baseRule.burstAllowance ?? Math.ceil(baseRule.maxRequests * 0.25)) * effectiveMult));
    const riskPenaltyApplied = (options.riskScore ?? 0) > 20;

    if (riskPenaltyApplied) {
      try {
        EventBus.getInstance().publishEvent({
          eventSource: "security_adaptive_rate_limiter",
          severity: (options.riskScore ?? 0) > 80 ? "critical" : "warning",
          message: `Adaptive rate limit penalty applied: riskScore=${options.riskScore}, tier=${tier}, effectiveMax=${computedMax}`,
          timestamp: new Date().toISOString(),
        } as any);
      } catch {
        // Fallback non-blocking
      }
    }

    return {
      windowMs: baseRule.windowMs,
      maxRequests: computedMax,
      burstAllowance: computedBurst,
      riskPenaltyApplied,
    };
  }
}
