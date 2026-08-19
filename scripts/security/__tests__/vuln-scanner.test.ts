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
});
