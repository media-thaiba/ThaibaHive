/**
 * Unit Tests for LocalFallbackStore
 * Sprint-038 / AGS-002
 */

import { LocalFallbackStore } from "../../security/rate-limit-fallback";

describe("LocalFallbackStore (AGS-002)", () => {
  let fallback: LocalFallbackStore;

  beforeEach(() => {
    fallback = new LocalFallbackStore();
  });

  afterEach(() => {
    fallback.destroy();
  });

  it("should activate and track fallback stats correctly", () => {
    expect(fallback.isFallbackActive()).toBe(false);
    fallback.activateFallback("Simulated connection timeout");
    expect(fallback.isFallbackActive()).toBe(true);

    const stats = fallback.getStats();
    expect(stats.fallbackActive).toBe(true);
    expect(stats.fallbackActivationCount).toBe(1);
    expect(stats.lastActivationTimestamp).toBeGreaterThan(0);

    fallback.deactivateFallback();
    expect(fallback.isFallbackActive()).toBe(false);
  });

  it("should enforce rate limits locally during fallback mode", () => {
    fallback.activateFallback("Redis offline");
    const rule = { windowMs: 5000, maxRequests: 2 };
    const key = "test-fallback-key";
    const now = Date.now();

    const r1 = fallback.evaluate(key, rule, "compound", now);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = fallback.evaluate(key, rule, "compound", now + 10);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = fallback.evaluate(key, rule, "compound", now + 20);
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);
  });
});
