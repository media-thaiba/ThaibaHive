/**
 * Client-side access to the per-request CSP nonce (O4-R).
 *
 * The root layout (force-dynamic server component) reads the `x-nonce`
 * request header injected by src/proxy.ts and exposes it via
 * `<meta name="csp-nonce">`. Client code that creates documents with inline
 * scripts (print windows, srcDoc iframes) must tag those scripts with this
 * nonce — under the strict CSP they are otherwise blocked.
 *
 * Returns "" outside the browser or when the proxy did not run (e.g. tests);
 * callers should no-op or fall back gracefully on empty nonces.
 */
export function getClientCspNonce(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector('meta[name="csp-nonce"]')?.getAttribute("content") ?? "";
}
