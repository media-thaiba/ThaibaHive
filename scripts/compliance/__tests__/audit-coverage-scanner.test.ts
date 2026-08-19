import { AuditCoverageScanner } from "../audit-coverage-scanner";

describe("AuditCoverageScanner", () => {
  it("scans and computes compliance audit coverage across API routes", () => {
    const scanner = new AuditCoverageScanner();
    const result = scanner.scan();

    expect(result.scannedFiles).toBeGreaterThan(0);
    expect(result.mutationRoutes).toBeGreaterThan(0);
    expect(result.coveragePct).toBe(100);
    expect(result.violations.length).toBe(0);
  });
});
