/**
 * Unit tests for TypeScript AST Gateway Coverage Scanner
 * Sprint-039 / TIF-015 (TD-018)
 */

import { runGatewayCoverageScan } from "../gateway-coverage-scanner";

describe("TypeScript AST Gateway Coverage Scanner (TIF-015)", () => {
  it("executes AST analysis across platform routes and passes cleanly", () => {
    const result = runGatewayCoverageScan();

    expect(result.passed).toBe(true);
    expect(result.missingModules.length).toBe(0);
    expect(result.secretViolations.length).toBe(0);
    expect(result.unshieldedRoutes.length).toBe(0);
    expect(result.totalRoutesChecked).toBeGreaterThan(350);
  });
});
