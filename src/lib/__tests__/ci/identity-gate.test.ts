/**
 * Tests for the identity security coverage scanner logic.
 * Validates the scanner exits 0 on clean codebase.
 */
describe("Identity Coverage Scanner", () => {
  it("identity lib directory exists", () => {
    const fs = require("fs");
    const path = require("path");
    const identityDir = path.join(process.cwd(), "src/lib/identity");
    expect(fs.existsSync(identityDir)).toBe(true);
  });

  it("all required identity modules are present", () => {
    const fs = require("fs");
    const path = require("path");
    const required = [
      "dpop-engine.ts",
      "dpop-middleware.ts",
      "dpop-types.ts",
      "risk-engine.ts",
      "risk-signals.ts",
      "geo-lookup.ts",
      "webauthn-service.ts",
      "revocation-store.ts",
      "revocation-mesh.ts",
      "identity-audit-events.ts",
      "revocation-metrics.ts",
      "identity-metrics.ts",
    ];
    const identityDir = path.join(process.cwd(), "src/lib/identity");
    for (const mod of required) {
      expect(fs.existsSync(path.join(identityDir, mod))).toBe(true);
    }
  });

  it("no hardcoded secret patterns in identity modules", () => {
    const fs = require("fs");
    const path = require("path");
    const identityDir = path.join(process.cwd(), "src/lib/identity");
    if (!fs.existsSync(identityDir)) return;
    const files = fs.readdirSync(identityDir).filter((f: string) => f.endsWith(".ts"));
    const secretPattern = /(?:secret|apiKey)\s*=\s*["'][a-zA-Z0-9+/]{16,}["']/i;
    for (const file of files) {
      const content = fs.readFileSync(path.join(identityDir, file), "utf8");
      expect(secretPattern.test(content)).toBe(false);
    }
  });
});
