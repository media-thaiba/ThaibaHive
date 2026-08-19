import { evaluatePackageLicense } from "../license-compliance-check";

describe("LicenseComplianceChecker", () => {
  test("approves standard permissive OSS licenses (MIT, Apache-2.0, BSD-3-Clause, ISC)", () => {
    expect(evaluatePackageLicense("react", "19.0.0", "MIT").isCompliant).toBe(true);
    expect(evaluatePackageLicense("ts-node", "10.9.2", "Apache-2.0").isCompliant).toBe(true);
    expect(evaluatePackageLicense("drizzle-orm", "0.45.0", "Apache-2.0").isCompliant).toBe(true);
    expect(evaluatePackageLicense("isaacs-glob", "7.0.0", "ISC").isCompliant).toBe(true);
    expect(evaluatePackageLicense("source-map", "0.5.7", "BSD-3-Clause").isCompliant).toBe(true);
  });

  test("flags prohibited copyleft licenses (GPL, AGPL)", () => {
    const gplEntry = evaluatePackageLicense("copyleft-tool", "1.0.0", "GPL-3.0");
    expect(gplEntry.isCompliant).toBe(false);
    expect(gplEntry.reason).toContain("Prohibited copyleft license");

    const agplEntry = evaluatePackageLicense("agpl-db", "2.0.0", "AGPL-3.0");
    expect(agplEntry.isCompliant).toBe(false);
  });

  test("handles compound OR licenses if at least one approved license is present", () => {
    const compoundEntry = evaluatePackageLicense("dual-lib", "1.0.0", "(MIT OR GPL-3.0)");
    expect(compoundEntry.isCompliant).toBe(true);
  });
});
