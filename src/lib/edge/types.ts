export interface EdgeRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface EdgeResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface EdgeContext {
  region: string;
  clientIp: string;
  userAgent?: string;
  timestamp: number;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
}

export interface RateLimiterResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}
