import * as fs from "fs";
import * as path from "path";

describe("B8 Tenant Parameter Isolation Regression Guard (AST / Route Scanner)", () => {
  const ALLOW_LIST: Record<string, string> = {
    // Public non-authenticated submission / entry endpoints
    "src/app/api/public/enquiries/route.ts": "Public enquiry submission allows prospective students to target an institution code",
    "src/app/api/features/route.ts": "Public feature flag query by institutionId for client initialization",
    "src/app/api/auth/switch-institution/route.ts": "Dedicated institution switcher validates and reissues scoped session tokens",
    "src/app/api/auth/oidc/login/route.ts": "Public unauthenticated OIDC SP-initiated SSO login flow specifying tenantId for IDP routing",
    "src/app/api/auth/saml/sso/route.ts": "Public unauthenticated SAML SP-initiated SSO redirect specifying target tenantId for SAML AuthnRequest",
  };

  function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else if (file.endsWith(".ts") && !file.includes("__tests__")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it("fails if any API route reads institutionId/tenantId without importing tenant scope helper", () => {
    const apiFiles = walk("src/app/api");
    const violations: Array<{ file: string; line: number; code: string }> = [];

    console.log(`[B8 Guard] Scanned ${apiFiles.length} API routes against ${Object.keys(ALLOW_LIST).length} allow-listed endpoints.`);
    console.log(`[B8 Guard] Allow-list size: ${Object.keys(ALLOW_LIST).length}`);

    for (const file of apiFiles) {
      const normalizedPath = file.replace(/\\/g, "/");
      if (ALLOW_LIST[normalizedPath]) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      const hasHelperImport =
        content.includes("resolveRequestInstitution") ||
        content.includes("resolveScopedInstitutionId") ||
        content.includes("resolveTenantInstitutionId");

      lines.forEach((line, idx) => {
        const hasQueryTenant =
          line.includes('searchParams.get("institutionId")') ||
          line.includes("searchParams.get('institutionId')") ||
          line.includes('searchParams.get("tenantId")') ||
          line.includes("searchParams.get('tenantId')");

        const hasBodyTenant =
          line.includes("body.institutionId") ||
          line.includes("data.institutionId") ||
          line.includes("parsed.institutionId") ||
          line.includes("parsed.data.institutionId") ||
          line.includes("body.tenantId") ||
          line.includes("data.tenantId");

        if ((hasQueryTenant || hasBodyTenant) && !hasHelperImport) {
          violations.push({
            file: normalizedPath,
            line: idx + 1,
            code: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => `  - ${v.file}:${v.line} -> ${v.code}`)
        .join("\n");
      throw new Error(
        `B8 Tenant Bypass Violation: The following routes access client-supplied institutionId/tenantId without using a tenant resolution helper:\n${formatted}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
