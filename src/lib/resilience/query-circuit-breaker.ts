export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  serviceName?: string;
  name?: string; // alias for serviceName
  maxFailureRate?: number;
  maxMedianLatencyMs?: number;
  cooldownPeriodSec?: number;
  failureThreshold?: number; // simplified threshold mode
  resetTimeoutMs?: number; // maps to cooldownPeriodSec in ms
  halfOpenMaxCalls?: number;
}

export class QueryCircuitBreaker {
  private serviceName: string;
  private maxFailureRate: number;
  private maxMedianLatencyMs: number;
  private cooldownPeriodSec: number;
  private failureThreshold: number;
  private bypassTokens: Set<string> = new Set();

  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private successCount: number = 0;
  private latencies: number[] = [];
  private trippedAt: Date | null = null;
  private cooldownUntil: Date | null = null;

  constructor(config: CircuitBreakerConfig) {
    this.serviceName = config.name || config.serviceName || "default";
    this.maxFailureRate = config.maxFailureRate || 0.2;
    this.maxMedianLatencyMs = config.maxMedianLatencyMs || 2000;
    this.cooldownPeriodSec = config.resetTimeoutMs
      ? config.resetTimeoutMs / 1000
      : config.cooldownPeriodSec || 60;
    this.failureThreshold = config.failureThreshold || 5;
  }

  public async execute<T>(
    fn: () => Promise<T>,
    fallbackFn?: () => Promise<T>,
    bypass: boolean = false
  ): Promise<T> {
    if (bypass) {
      return await fn();
    }

    this.checkCooldownTransition();

    if (this.state === "OPEN") {
      if (fallbackFn) {
        return await fallbackFn();
      }
      throw new Error(`CircuitBreaker [${this.serviceName}] is OPEN. Fast failing request.`);
    }

    const startTime = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - startTime;
      this.recordSuccess(durationMs);
      return result;
    } catch (error) {
      this.recordFailure();
      if (fallbackFn) {
        return await fallbackFn();
      }
      throw error;
    }
  }

  public recordSuccess(latencyMs: number) {
    this.successCount += 1;
    this.latencies.push(latencyMs);
    if (this.latencies.length > 50) this.latencies.shift();

    if (this.state === "HALF_OPEN") {
      // Recovery check
      if (this.successCount >= 3) {
        this.resetCircuitBreaker();
      }
    } else if (this.state === "CLOSED") {
      this.evaluateState();
    }
  }

  public recordFailure() {
    this.failureCount += 1;
    if (this.state === "HALF_OPEN") {
      this.tripCircuit();
    } else if (this.state === "CLOSED") {
      this.evaluateState();
    }
  }

  public resetCircuitBreaker() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.latencies = [];
    this.trippedAt = null;
    this.cooldownUntil = null;
  }

  public tripCircuit() {
    this.state = "OPEN";
    this.trippedAt = new Date();
    this.cooldownUntil = new Date(Date.now() + this.cooldownPeriodSec * 1000);
  }

  /** Generates an instance-scoped bypass token for emergency access */
  public generateBypassToken(): string {
    const token = `bypass_${this.serviceName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.bypassTokens.add(token);
    return token;
  }

  /** Validates that a bypass token belongs to THIS circuit breaker instance */
  public validateBypassToken(token: string): boolean {
    return this.bypassTokens.has(token);
  }

  public getState(): {
    serviceName: string;
    state: CircuitState;
    failureRate: number;
    medianLatencyMs: number;
    trippedAt: string | null;
    cooldownUntil: string | null;
  } {
    this.checkCooldownTransition();
    const total = this.failureCount + this.successCount;
    const failureRate = total > 0 ? this.failureCount / total : 0.0;
    const medianLatencyMs = this.calculateMedianLatency();

    return {
      serviceName: this.serviceName,
      state: this.state,
      failureRate: Math.round(failureRate * 100) / 100,
      medianLatencyMs,
      trippedAt: this.trippedAt ? this.trippedAt.toISOString() : null,
      cooldownUntil: this.cooldownUntil ? this.cooldownUntil.toISOString() : null,
    };
  }

  private evaluateState() {
    // Trip immediately if failureThreshold is reached
    if (this.failureThreshold > 0 && this.failureCount >= this.failureThreshold) {
      this.tripCircuit();
      return;
    }

    const total = this.failureCount + this.successCount;
    if (total >= 5) {
      const failureRate = this.failureCount / total;
      const medianLatencyMs = this.calculateMedianLatency();

      if (failureRate >= this.maxFailureRate || medianLatencyMs >= this.maxMedianLatencyMs) {
        this.tripCircuit();
      }
    }
  }

  private checkCooldownTransition() {
    if (this.state === "OPEN" && this.cooldownUntil && new Date() >= this.cooldownUntil) {
      this.state = "HALF_OPEN";
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  private calculateMedianLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}
