type RateLimitEntry = { count: number; resetAt: number };
type RateLimitStore = Map<string, RateLimitEntry>;

function createStore(): RateLimitStore {
  return new Map<string, RateLimitEntry>();
}

const stores: Record<string, RateLimitStore> = {};

function getStore(name: string): RateLimitStore {
  if (!stores[name]) stores[name] = createStore();
  return stores[name];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, max: 5, keyPrefix: "auth" },
  "auth-signup": { windowMs: 60_000, max: 3, keyPrefix: "auth-signup" },
  write: { windowMs: 60_000, max: 30, keyPrefix: "write" },
  read: { windowMs: 60_000, max: 100, keyPrefix: "read" },
  upload: { windowMs: 60_000, max: 10, keyPrefix: "upload" },
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig | keyof typeof DEFAULT_CONFIGS = "write"
): { allowed: boolean; remaining: number; resetMs: number } {
  if (process.env.NODE_ENV !== "production") {
    return { allowed: true, remaining: 999, resetMs: 0 };
  }

  const resolved = typeof config === "string" ? DEFAULT_CONFIGS[config] : config;
  const storeName = resolved.keyPrefix ?? "default";
  const store = getStore(storeName);
  const now = Date.now();
  const key = `${resolved.keyPrefix ?? ""}:${identifier}`;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + resolved.windowMs });
    return { allowed: true, remaining: resolved.max - 1, resetMs: resolved.windowMs };
  }

  if (entry.count >= resolved.max) {
    return { allowed: false, remaining: 0, resetMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: resolved.max - entry.count, resetMs: entry.resetAt - now };
}

export function extractIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitResponse(resetMs: number): Response {
  const retryAfter = Math.ceil(resetMs / 1000);
  return Response.json(
    { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": "varies",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
