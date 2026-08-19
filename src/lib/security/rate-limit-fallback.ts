/**
 * Local In-Memory Fallback Store for Rate Limiting
 * Sprint-038 / AGS-002
 */

import { RateLimitRule, RateLimitResult, RateLimitDimension } from "./rate-limit-types";
import { SlidingWindowLimiter } from "./sliding-window";

export class LocalFallbackStore {
  private limiter: SlidingWindowLimiter;
  private fallbackActive: boolean = false;
  private fallbackActivationCount: number = 0;
  private lastActivationTimestamp: number = 0;

  constructor() {
    this.limiter = new SlidingWindowLimiter(30_000);
  }

  public activateFallback(reason: string): void {
    if (!this.fallbackActive) {
      this.fallbackActive = true;
      this.fallbackActivationCount++;
      this.lastActivationTimestamp = Date.now();
      if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
        console.warn(`[RateLimitFallback] Activated local fallback store: ${reason}`);
      }
    }
  }

  public deactivateFallback(): void {
    this.fallbackActive = false;
  }

  public isFallbackActive(): boolean {
    return this.fallbackActive;
  }

  public getStats() {
    return {
      fallbackActive: this.fallbackActive,
      fallbackActivationCount: this.fallbackActivationCount,
      lastActivationTimestamp: this.lastActivationTimestamp,
    };
  }

  public evaluate(
    key: string,
    rule: RateLimitRule,
    dimension: RateLimitDimension = "compound",
    nowMs: number = Date.now()
  ): RateLimitResult {
    return this.limiter.evaluateWindow(key, rule, dimension, nowMs);
  }

  public reset(): void {
    this.limiter.reset();
    this.fallbackActive = false;
  }

  public destroy(): void {
    this.limiter.destroy();
  }
}
