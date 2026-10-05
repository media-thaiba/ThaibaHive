import { test, expect } from "@playwright/test";

/**
 * Security headers & nonce CSP browser verification (Round 2 / O4-R).
 * Runs against the production standalone build (`pnpm build`), so the CSP
 * assertions below verify the strict (no unsafe-eval / no unsafe-inline
 * scripts) policy that ships to users.
 */

type Violation = { directive: string; blockedURI: string; sample: string };

function scriptSrcOf(csp: string): string {
  return (
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src")) ?? ""
  );
}

test.describe("Security headers & nonce CSP (O4-R)", () => {
  test.use({ storageState: ".auth/staff.json" });

  test("HTML document ships nonce CSP plus the static hardening headers", async ({ page }) => {
    const response = await page.goto("/marketplace", { waitUntil: "load" });
    expect(response, "marketplace document response").toBeTruthy();
    const headers = response!.headers();

    // --- nonce CSP ---
    const csp = headers["content-security-policy"] ?? "";
    expect(csp, "CSP header present").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("worker-src 'self'");

    const scriptSrc = scriptSrcOf(csp);
    expect(scriptSrc).toContain("script-src 'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");

    // --- static hardening headers ---
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-xss-protection"]).toBe("1; mode=block");
    expect(headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(headers["strict-transport-security"]).toContain("includeSubDomains");
    expect(headers["permissions-policy"]).toContain("camera=(self)");
    expect(headers["permissions-policy"]).toContain("geolocation=(self)");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["reporting-endpoints"]).toContain("/api/system/csp-report");

    // --- Next.js stamped the request nonce onto its framework scripts ---
    const noncedScripts = page.locator("script[nonce]");
    expect(await noncedScripts.count()).toBeGreaterThan(0);

    const metaNonce = await page.locator('meta[name="csp-nonce"]').getAttribute("content");
    expect(metaNonce, "root layout exposes meta[name=csp-nonce]").toBeTruthy();
    const firstScriptNonce = await noncedScripts.first().evaluate((el: HTMLScriptElement) => el.nonce || el.getAttribute("nonce"));
    expect(firstScriptNonce).toBe(metaNonce);
  });

  test("page load produces zero CSP violations", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cspViolations?: Violation[] };
      w.__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        w.__cspViolations?.push({
          directive: e.effectiveDirective,
          blockedURI: e.blockedURI,
          sample: e.sample,
        });
      });
    });

    await page.goto("/marketplace", { waitUntil: "load" });
    // allow lazy hydration + PWA registrar + image loads to fire
    await page.waitForTimeout(2500);

    const violations = await page.evaluate(() => {
      const w = window as unknown as { __cspViolations?: Violation[] };
      return w.__cspViolations ?? [];
    });
    expect(violations, "no securitypolicyviolation events").toEqual([]);
  });

  test("session-scoped and tenant-scoped APIs are never shared-cacheable", async ({ page }) => {
    const paths = [
      "/api/tasks",
      "/api/staff",
      "/api/departments",
      "/api/institutions",
      "/api/canteen/menu",
      "/api/auth/me",
    ];
    for (const path of paths) {
      const res = await page.request.get(path);
      expect(res.status(), `${path} status`).toBe(200);
      const cacheControl = res.headers()["cache-control"] ?? "";
      expect(cacheControl, `${path} Cache-Control`).toContain("no-store");
      expect(cacheControl, `${path} must not be public`).not.toContain("public");
      expect(cacheControl, `${path} must not invite shared revalidation`).not.toContain(
        "s-maxage"
      );
    }
  });
});
