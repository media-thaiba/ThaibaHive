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

  it("does not blanket-exempt /api/mobile/ routes — each must be shielded", () => {
    const result = runGatewayCoverageScan();

    const mobileRoutes = result.inspectedRoutes.filter((r) => r.filePath.includes("api/mobile/"));
    expect(mobileRoutes.length).toBeGreaterThan(0);

    for (const route of mobileRoutes) {
      expect(route.isExempt).toBe(false);
      expect(route.unshieldedMethods).toEqual([]);
    }

    const push = result.inspectedRoutes.find((r) => r.filePath.includes("sync/push"));
    expect(push?.shieldedMethods).toContain("POST");

    const pull = result.inspectedRoutes.find((r) => r.filePath.includes("sync/pull"));
    expect(pull?.shieldedMethods).toContain("GET");

    const mdmEnroll = result.inspectedRoutes.find((r) => r.filePath.includes("mdm/enroll"));
    expect(mdmEnroll?.shieldedMethods).toContain("POST");

    const mdmVerify = result.inspectedRoutes.find((r) => r.filePath.includes("mdm/verify"));
    expect(mdmVerify?.shieldedMethods).toContain("GET");
  });
});
