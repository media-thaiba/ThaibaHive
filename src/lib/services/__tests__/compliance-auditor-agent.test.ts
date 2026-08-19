import { ComplianceAuditorAgent, ComplianceAuditAuditState } from "../compliance-auditor-agent";

describe("Sprint-011 Regional Compliance Auditor Copilot Agent", () => {
  let agent: ComplianceAuditorAgent;

  beforeEach(() => {
    agent = new ComplianceAuditorAgent();
  });

  it("generates compliance briefing and action items for validated vault", async () => {
    const state: ComplianceAuditAuditState = {
      campusId: "inst_101",
      frameworkCode: "regional_privacy_v1",
      overallComplianceScore: 94.5,
      vaultIntegrityStatus: "VALIDATED",
      pendingCertificationsCount: 3,
      missingSafetyLogsCount: 1,
    };

    const rec = await agent.analyzeAndRecommend("inst_101", state);

    expect(rec.domain).toBe("compliance");
    expect(rec.title).toContain("regional_privacy_v1");
    expect(rec.suggestedAction).toBeDefined();
    expect(rec.confidenceScore).toBe(0.91);
    expect(rec.humanApprovalStatus).toBe("AUTO_EXECUTE");
  });

  it("flags critical severity when vault tampering is detected", async () => {
    const state: ComplianceAuditAuditState = {
      campusId: "inst_101",
      frameworkCode: "regional_privacy_v1",
      overallComplianceScore: 78.0,
      vaultIntegrityStatus: "TAMPER_DETECTED",
      pendingCertificationsCount: 5,
      missingSafetyLogsCount: 2,
    };

    const rec = await agent.analyzeAndRecommend("inst_101", state);

    expect(rec.confidenceScore).toBe(0.99);
    const action = rec.suggestedAction as { severity: string };
    expect(action.severity).toBe("critical");
  });
});
