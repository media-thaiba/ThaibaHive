import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

describe("B8 Tenant Parameter Isolation Regression Guard (AST Handler-Level Call Scanner)", () => {
  const ALLOW_LIST: Record<string, string> = {
    // Public unauthenticated endpoints where tenant parameter is solely used for routing/discovery
    "src/app/api/public/enquiries/route.ts:POST": "Public enquiry submission allows prospective students to submit an admission enquiry for an institution",
    "src/app/api/auth/switch-institution/route.ts:POST": "Dedicated institution switcher validates membership against staffInstitutions and reissues scoped JWT session",
    "src/app/api/auth/oidc/login/route.ts:GET": "Public unauthenticated OIDC SP-initiated SSO login flow specifying tenantId for IDP routing",
    "src/app/api/auth/saml/sso/route.ts:GET": "Public unauthenticated SAML SP-initiated SSO redirect specifying target tenantId for SAML AuthnRequest",
  };

  const VALID_RESOLVERS = [
    "resolveRequestInstitution",
    "resolveScopedInstitutionId",
    "resolveScopedInstitutions",
    "resolveTenantInstitutionId",
    "resolveInstitutionId",
  ];

  function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else if (file === "route.ts" || file === "route.js") {
        results.push(fullPath);
      }
    }
    return results;
  }

  it("fails if any API route handler reads institutionId/tenantId without calling a resolver inside that same handler", () => {
    const apiFiles = walk("src/app/api");
    const violations: Array<{ file: string; method: string; reason: string }> = [];

    for (const filePath of apiFiles) {
      const normalizedPath = filePath.replace(/\\/g, "/");
      const code = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            const name = decl.name.getText(sourceFile);
            if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(name)) {
              const allowKey = `${normalizedPath}:${name}`;
              if (ALLOW_LIST[allowKey]) {
                continue;
              }

              const handlerText = decl.getText(sourceFile);

              const readsSearchInst =
                /searchParams\.get\(["'](?:institutionId|tenantId)["']\)/.test(handlerText);
              const readsBodyInst =
                /(?:body|data|input|parsed|json)\.(?:institutionId|tenantId)/.test(handlerText) ||
                /(?:institutionId|tenantId)\s*:\s*(?:body|data|input|parsed|json)/.test(handlerText) ||
                /const\s*\{\s*[^}]*(?:institutionId|tenantId)[^}]*\}\s*=\s*(?:body|data|input|parsed|json|parsed\.data|parse\.data|result\.data)/.test(
                  handlerText
                );

              const callsResolver = VALID_RESOLVERS.some((r) =>
                handlerText.includes(`${r}(`)
              );

              if ((readsSearchInst || readsBodyInst) && !callsResolver) {
                violations.push({
                  file: normalizedPath,
                  method: name,
                  reason: readsSearchInst
                    ? "Reads query institutionId/tenantId without calling resolver in handler"
                    : "Reads body/parsed institutionId/tenantId without calling resolver in handler",
                });
              }
            }
          }
        }
      });
    }

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => `  - [${v.method}] ${v.file}: ${v.reason}`)
        .join("\n");
      throw new Error(
        `B8 Handler-Level Tenant Bypass Violation: The following ${violations.length} handlers read client-supplied institutionId/tenantId without calling a resolver inside the handler:\n${formatted}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
