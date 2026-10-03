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

/** Header names live here so consumers never inline the literals (anti-drift). */
export const CSP_HEADER_NAME = "Content-Security-Policy";
export const NONCE_REQUEST_HEADER_NAME = "x-nonce";

/** Fresh per-request CSP nonce (crypto.getRandomValues via WebCrypto). */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

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

/**
 * Builds the CSP.
 *
 * - With a `nonce` (proxy, per request): script-src drops `'unsafe-inline'` in
 *   favour of `'nonce-…' 'strict-dynamic'`; Next.js stamps the nonce onto its
 *   framework/inline scripts during dynamic rendering (root layout is
 *   `force-dynamic`). Dev keeps `'unsafe-eval'` (React debugging uses eval).
 * - Without a `nonce` (next.config fallback for responses that bypass the
 *   proxy, e.g. matcher-excluded static docs): previous `'unsafe-inline'`
 *   policy so those documents keep working.
 *
 * `style-src` keeps `'unsafe-inline'` in every variant: Radix/Tailwind emit
 * inline `style=` attributes (positioning, custom properties) which nonce
 * cannot cover (`style-src-attr` would need `'unsafe-inline'` anyway).
 * `https://unpkg.com` is the Swagger UI stylesheet host used by /docs.
 * `worker-src 'self'` keeps the PWA service worker (public/sw.js) registrable
 * under `'strict-dynamic'`.
 */
export function buildContentSecurityPolicy(isProd: boolean, nonce?: string): string {
  const scriptSrc = nonce
    ? [
        "script-src 'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(isProd ? [] : ["'unsafe-eval'"]),
      ].join(" ")
    : isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws: wss:",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "report-uri /api/system/csp-report",
    "report-to csp-endpoint",
  ].join("; ");
}

function resolveIsProd(isProd?: boolean): boolean {
  return isProd ?? process.env.NODE_ENV === "production";
}

/** `next.config.ts` headers() entry shape: every static security header + CSP fallback. */
export function securityHeaderPairs(isProd?: boolean): { key: string; value: string }[] {
  const pairs = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
  pairs.push({
    key: CSP_HEADER_NAME,
    value: buildContentSecurityPolicy(resolveIsProd(isProd)),
  });
  return pairs;
}

/** proxy.ts injection: applies the full shared header set onto a response (with the per-request nonce when given). */
export function applySecurityHeaders(
  response: { headers: { set(key: string, value: string): unknown } },
  isProd?: boolean,
  nonce?: string
): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set(
    CSP_HEADER_NAME,
    buildContentSecurityPolicy(resolveIsProd(isProd), nonce)
  );
}
