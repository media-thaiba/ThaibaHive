/**
 * Single source of truth for HTTP security headers (O4 consolidation).
 *
 * Consumed by:
 *  - `next.config.ts` headers()              -> `securityHeaderPairs()`
 *  - middleware entry (`src/proxy.ts` or its
 *    `src/middleware.ts` rename)             -> `applySecurityHeaders()`
 *
 * The two layers must never drift: next.config headers apply to every
 * response (static, error pages, non-proxied), while the proxy re-applies
 * them on requests passing through middleware. Both call this module.
 */

export const REPORTING_ENDPOINTS_VALUE = 'csp-endpoint="/api/system/csp-report"';

export const HSTS_VALUE = "max-age=31536000; includeSubDomains; preload";

/** camera/geolocation stay (self) for biometric attendance & geo features; everything else denied. */
export const PERMISSIONS_POLICY_VALUE =
  "camera=(self), microphone=(), geolocation=(self), payment=()";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": PERMISSIONS_POLICY_VALUE,
  "Strict-Transport-Security": HSTS_VALUE,
  "Reporting-Endpoints": REPORTING_ENDPOINTS_VALUE,
});

export function buildContentSecurityPolicy(isProd: boolean, nonce?: string): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`
    : isProd
      ? "script-src 'self'"
      : "script-src 'self' 'unsafe-eval'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "report-uri /api/system/csp-report",
    "report-to csp-endpoint",
  ].join("; ");
}

function resolveIsProd(isProd?: boolean): boolean {
  return isProd ?? process.env.NODE_ENV === "production";
}

/** `next.config.ts` headers() entry shape: every static security header + CSP. */
export function securityHeaderPairs(isProd?: boolean): { key: string; value: string }[] {
  const pairs = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
  pairs.push({
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(resolveIsProd(isProd)),
  });
  return pairs;
}

/** proxy.ts injection: applies the full shared header set onto a response. */
export function applySecurityHeaders(
  response: { headers: { set(key: string, value: string): unknown } },
  isProd?: boolean,
  nonce?: string
): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(resolveIsProd(isProd), nonce)
  );
}
