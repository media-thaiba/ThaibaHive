/**
 * Rate Limiting & Gateway Security Types
 * Sprint-038: Distributed Adaptive Rate Limiting & API Gateway Security Shield
 */

export type RateLimitTier = "public" | "auth" | "mutation" | "query" | "export" | "admin" | "custom";

export type RateLimitDimension = "ip" | "tenant" | "user" | "role" | "dpop" | "compound";

export interface RateLimitRule {
  windowMs: number; // e.g. 60_000 for 1 minute
  maxRequests: number; // Max allowable requests per window
  burstAllowance?: number; // Optional burst token allowance
  refillRatePerSecond?: number; // Tokens added per second for token-bucket
}

export interface RateLimitContext {
  ip: string;
  tenantId?: string;
  userId?: string;
  role?: string;
  dpopThumbprint?: string;
  routeCategory?: RateLimitTier;
  riskScore?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  totalLimit: number;
  remaining: number;
  resetMs: number; // Unix timestamp in ms when window resets
  retryAfterSeconds: number;
  dimension: RateLimitDimension;
  key: string;
  riskPenaltyApplied?: boolean;
}

export interface SlidingWindowBucket {
  timestamps: number[];
  expiresAt: number;
}

export interface TokenBucketState {
  tokens: number;
  lastRefillMs: number;
}
