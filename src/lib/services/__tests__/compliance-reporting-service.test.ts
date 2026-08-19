import { ComplianceReportingService } from "../compliance-reporting-service";

jest.mock("../compliance-audit-vault", () => {
  return {
    ComplianceAuditVault: {
      verifyVaultIntegrity: jest.fn().mockResolvedValue({
        tenantId: "inst_101",
        status: "VALIDATED",
        totalRecords: 120,
        lastRecordHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        verificationTimeMs: 12,
      }),
    },
  };
});

describe("ComplianceReportingService", () => {
  it("evaluates regulatory framework compliance and calculates score", async () => {
    const report = await ComplianceReportingService.evaluateCompliance("regional_privacy_v1", "inst_101");

    expect(report.frameworkCode).toBe("regional_privacy_v1");
    expect(report.complianceScore).toBe(100);
    expect(report.vaultIntegrityStatus).toBe("VALIDATED");
    expect(report.findings).toHaveLength(4);
  });
});
