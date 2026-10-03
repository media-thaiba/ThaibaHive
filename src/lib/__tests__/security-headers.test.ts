import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  SECURITY_HEADERS,
  PERMISSIONS_POLICY_VALUE,
  HSTS_VALUE,
  buildContentSecurityPolicy,
  securityHeaderPairs,
  applySecurityHeaders,
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
    expect(prodCsp).toContain("connect-src 'self' https: ws: wss:");
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
