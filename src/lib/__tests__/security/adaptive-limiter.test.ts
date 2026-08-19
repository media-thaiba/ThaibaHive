/**
 * Unit Tests for AdaptiveRateLimiter and QuotaResolver
 * Sprint-038 / AGS-003
 */

import { AdaptiveRateLimiter } from "../../security/adaptive-limiter";
import { QuotaResolver } from "../../security/quota-resolver";

describe("QuotaResolver (AGS-003)", () => {
  it("should calculate appropriate role multipliers", () => {
    expect(QuotaResolver.getRoleMultiplier("super_admin")).toBe(3.0);
    expect(QuotaResolver.getRoleMultiplier("admin")).toBe(2.0);
    expect(QuotaResolver.getRoleMultiplier("staff")).toBe(1.0);
    expect(QuotaResolver.getRoleMultiplier(undefined)).toBe(0.5);
  });

  it("should calculate appropriate risk multipliers based on threat tiers", () => {
    expect(QuotaResolver.getRiskMultiplier(10)).toBe(1.0); // Low risk
    expect(QuotaResolver.getRiskMultiplier(35)).toBe(0.75); // Medium risk
    expect(QuotaResolver.getRiskMultiplier(65)).toBe(0.50); // High risk (50% capacity)
    expect(QuotaResolver.getRiskMultiplier(90)).toBe(0.10); // Critical threat (10% capacity)
  });

  it("should apply DPoP cryptographic attestation boost", () => {
    const withoutDPoP = QuotaResolver.resolveEffectiveRule({ role: "staff", tier: "query", hasDPoP: false });
    const withDPoP = QuotaResolver.resolveEffectiveRule({ role: "staff", tier: "query", hasDPoP: true });

    expect(withDPoP.maxRequests).toBeGreaterThan(withoutDPoP.maxRequests);
  });
});

describe("AdaptiveRateLimiter Pipeline (AGS-003)", () => {
  let limiter: AdaptiveRateLimiter;

  beforeEach(() => {
    limiter = new AdaptiveRateLimiter(null); // Local fallback mode for unit test
  });

  it("should apply severe quota reduction (10% capacity) for critical risk sessions (score > 80)", async () => {
    const res = await limiter.evaluateRequest({
      ip: "10.0.0.5",
      role: "staff",
      riskScore: 95,
      tenantId: "tenant-1",
    });

    expect(res.riskPenaltyApplied).toBe(true);
    expect(res.totalLimit).toBeLessThanOrEqual(30); // 10% of 300 base query limit
  });

  it("should throttle high-risk sessions with 50% quota reduction", async () => {
    const lowRiskRes = await limiter.evaluateRequest({
      ip: "10.0.0.1",
      role: "staff",
      riskScore: 10,
      tenantId: "tenant-1",
    });

    const highRiskRes = await limiter.evaluateRequest({
      ip: "10.0.0.2",
      role: "staff",
      riskScore: 70,
      tenantId: "tenant-1",
    });

    expect(highRiskRes.totalLimit).toBeLessThan(lowRiskRes.totalLimit);
    expect(highRiskRes.riskPenaltyApplied).toBe(true);
  });
});
