import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  SECURITY_HEADERS,
  PERMISSIONS_POLICY_VALUE,
  HSTS_VALUE,
  buildContentSecurityPolicy,
  securityHeaderPairs,
  applySecurityHeaders,
  generateCspNonce,
  CSP_HEADER_NAME,
  NONCE_REQUEST_HEADER_NAME,
} from "../security/security-headers";

const nextConfigSource = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
const middlewarePath = existsSync(join(process.cwd(), "src", "middleware.ts"))
  ? join(process.cwd(), "src", "middleware.ts")
  : join(process.cwd(), "src", "proxy.ts");
const proxySource = readFileSync(middlewarePath, "utf8");

describe("shared security header module (single source of truth)", () => {
  test("SECURITY_HEADERS exposes the full static set", () => {
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("1; mode=block");
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toBe(HSTS_VALUE);
    expect(SECURITY_HEADERS["Reporting-Endpoints"]).toBe('csp-endpoint="/api/system/csp-report"');
    expect(SECURITY_HEADERS["Permissions-Policy"]).toBe(PERMISSIONS_POLICY_VALUE);
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(7);
  });

  test("HSTS is preload-ready", () => {
    expect(HSTS_VALUE).toContain("max-age=31536000");
    expect(HSTS_VALUE).toContain("includeSubDomains");
    expect(HSTS_VALUE).toContain("preload");
  });

  test("Permissions-Policy keeps camera/geolocation for self (biometrics/geo) and denies payment", () => {
    expect(PERMISSIONS_POLICY_VALUE).toContain("camera=(self)");
    expect(PERMISSIONS_POLICY_VALUE).toContain("microphone=()");
    expect(PERMISSIONS_POLICY_VALUE).toContain("geolocation=(self)");
    expect(PERMISSIONS_POLICY_VALUE).toContain("payment=()");
  });
});

describe("Content-Security-Policy builder", () => {
  const prodCsp = buildContentSecurityPolicy(true);
  const devCsp = buildContentSecurityPolicy(false);

  test("contains the mandatory hardening directives", () => {
    expect(prodCsp).toContain("default-src 'self'");
    expect(prodCsp).toContain("frame-ancestors 'none'");
    expect(prodCsp).toContain("base-uri 'self'");
    expect(prodCsp).toContain("object-src 'none'");
    expect(prodCsp).toContain("img-src 'self' data: https: blob:");
    expect(prodCsp).toContain("connect-src 'self' https://thaiba-hive.vercel.app https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.upstash.io");
    expect(devCsp).toContain("connect-src 'self' https: ws: wss: http://localhost:* ws://localhost:*");
    expect(prodCsp).toContain("report-uri /api/system/csp-report");
    expect(prodCsp).toContain("report-to csp-endpoint");
  });

  test("production omits unsafe-eval, development keeps it", () => {
    expect(prodCsp).not.toContain("'unsafe-eval'");
    expect(devCsp).toContain("'unsafe-eval'");
  });

  test("has no empty directives (no doubled separators)", () => {
    expect(prodCsp).not.toContain(";;");
    expect(prodCsp).not.toMatch(/;\s*;/);
    expect(prodCsp.trim()).not.toMatch(/;\s*$/);
  });
});

describe("nonce-based CSP (O4-R per-request policy)", () => {
  const scriptSrcOf = (csp: string) =>
    csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src")) ?? "";

  test("production nonce policy drops unsafe-inline for scripts and adds strict-dynamic", () => {
    const csp = buildContentSecurityPolicy(true, "test-nonce");
    const scriptSrc = scriptSrcOf(csp);
    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  test("development nonce policy keeps unsafe-eval (React debugging) but not unsafe-inline scripts", () => {
    const scriptSrc = scriptSrcOf(buildContentSecurityPolicy(false, "dev-nonce"));
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).toContain("'nonce-dev-nonce'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test("style-src keeps unsafe-inline (Radix/Tailwind inline style attributes)", () => {
    const csp = buildContentSecurityPolicy(true, "n1");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  test("policy without nonce (config fallback) keeps the legacy unsafe-inline script policy", () => {
    const scriptSrc = scriptSrcOf(buildContentSecurityPolicy(true));
    expect(scriptSrc).toBe("script-src 'self' 'unsafe-inline'");
  });

  test("generateCspNonce returns unique, non-trivial values", () => {
    const a = generateCspNonce();
    const b = generateCspNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a).not.toBe(b);
  });

  test("applySecurityHeaders stamps the nonce into the response CSP", () => {
    const store = new Map<string, string>();
    applySecurityHeaders(
      { headers: { set: (key, value) => void store.set(key.toLowerCase(), value) } },
      true,
      "resp-nonce"
    );
    const value = store.get(CSP_HEADER_NAME.toLowerCase()) ?? "";
    expect(value).toContain("'nonce-resp-nonce'");
    const scriptSrc = value
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test("exported header names keep proxy source free of inline literals", () => {
    expect(CSP_HEADER_NAME).toBe("Content-Security-Policy");
    expect(NONCE_REQUEST_HEADER_NAME).toBe("x-nonce");
    expect(proxySource).not.toContain(CSP_HEADER_NAME);
  });
});

describe("securityHeaderPairs (next.config.ts consumer)", () => {
  test("returns CSP plus every static security header", () => {
    const pairs = securityHeaderPairs(true);
    const keys = pairs.map((p) => p.key);
    expect(keys).toHaveLength(Object.keys(SECURITY_HEADERS).length + 1);
    expect(keys).toContain("Content-Security-Policy");
    for (const key of Object.keys(SECURITY_HEADERS)) {
      expect(keys).toContain(key);
    }
    const csp = pairs.find((p) => p.key === "Content-Security-Policy");
    expect(csp?.value).toBe(buildContentSecurityPolicy(true));
  });
});

describe("applySecurityHeaders (proxy.ts consumer)", () => {
  test("applies the full shared set onto a response", () => {
    const store = new Map<string, string>();
    applySecurityHeaders(
      { headers: { set: (key, value) => void store.set(key.toLowerCase(), value) } },
      true
    );
    expect(store.size).toBe(Object.keys(SECURITY_HEADERS).length + 1);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(store.get(key.toLowerCase())).toBe(value);
    }
    expect(store.get("content-security-policy")).toBe(buildContentSecurityPolicy(true));
  });
});

describe("anti-drift guards (consolidation invariants)", () => {
  test("next.config.ts consumes the shared module and declares no inline header literals", () => {
    expect(nextConfigSource).toContain("securityHeaderPairs");
    expect(nextConfigSource).not.toContain('"Content-Security-Policy"');
    expect(nextConfigSource).not.toContain('"X-Frame-Options"');
    expect(nextConfigSource).not.toContain("cspDirective");
  });

  test("middleware/proxy entry consumes the shared module and declares no inline header literals", () => {
    expect(proxySource).toContain("applySecurityHeaders");
    expect(proxySource).not.toContain('"Content-Security-Policy"');
    expect(proxySource).not.toContain('"X-Frame-Options"');
    expect(proxySource).not.toContain('"Permissions-Policy"');
    expect(proxySource).not.toContain("Strict-Transport-Security");
  });
});
