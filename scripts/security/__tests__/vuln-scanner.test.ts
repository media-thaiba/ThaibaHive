import { parseAuditOutput } from "../vuln-scanner";

describe("VulnScanner", () => {
  test("passes when audit json contains no vulnerabilities", () => {
    const emptyAuditJson = "";
    const report = parseAuditOutput(emptyAuditJson);
    expect(report.passed).toBe(true);
    expect(report.criticalCount).toBe(0);
    expect(report.highCount).toBe(0);
  });

  test("flags critical and high CVEs accurately", () => {
    const mockAuditLine1 = JSON.stringify({
      type: "auditAdvisory",
      data: {
        advisory: {
          id: "CVE-2026-9999",
          module_name: "vulnerable-lib",
          severity: "critical",
          title: "Remote code execution vulnerability",
        },
      },
    });

    const mockAuditLine2 = JSON.stringify({
      type: "auditAdvisory",
      data: {
        advisory: {
          id: "CVE-2026-8888",
          module_name: "moderate-lib",
          severity: "moderate",
          title: "Prototype pollution",
        },
      },
    });

    const report = parseAuditOutput(`${mockAuditLine1}\n${mockAuditLine2}`);
    expect(report.passed).toBe(false);
    expect(report.criticalCount).toBe(1);
    expect(report.moderateCount).toBe(1);
  });

  test("ignores allowlisted vulnerabilities", () => {
    const mockAuditLine = JSON.stringify({
      type: "auditAdvisory",
      data: {
        advisory: {
          id: "CVE-2026-9999",
          module_name: "vulnerable-lib",
          severity: "high",
          title: "High severity advisory",
        },
      },
    });

    const report = parseAuditOutput(mockAuditLine, ["CVE-2026-9999"]);
    expect(report.passed).toBe(true);
    expect(report.highCount).toBe(0);
    expect(report.allowlistedCount).toBe(1);
  });

  test("parses modern pnpm audit JSON format with advisories map", () => {
    const mockPnpmJson = JSON.stringify({
      advisories: {
        "1001": {
          id: 1001,
          module_name: "prod-vuln-pkg",
          severity: "high",
          title: "SQL Injection",
          vulnerable_versions: "<2.0.0",
        },
        "1002": {
          id: 1002,
          module_name: "prod-vuln-mod",
          severity: "moderate",
          title: "ReDoS",
          vulnerable_versions: "<1.0.4",
        },
      },
      metadata: {
        vulnerabilities: { info: 0, low: 0, moderate: 1, high: 1, critical: 0 },
      },
    });

    const report = parseAuditOutput(mockPnpmJson);
    expect(report.passed).toBe(false);
    expect(report.totalVulnerabilities).toBe(2);
    expect(report.highCount).toBe(1);
    expect(report.moderateCount).toBe(1);
    expect(report.criticalCount).toBe(0);
  });
});
