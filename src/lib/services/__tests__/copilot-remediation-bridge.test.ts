import { CopilotRemediationBridge } from "../copilot-remediation-bridge";
import { CopilotRecommendationRecord } from "../agent-reasoning-engine";

jest.mock("../remediation-ticket-service", () => ({
  RemediationTicketService: {
    createTicket: jest.fn().mockResolvedValue({
      id: "rem_tk_bridge_101",
      title: "[AI Copilot Triggered] Remediation Plan",
      status: "auto_assigned",
    }),
  },
}));

jest.mock("../compliance-audit-vault", () => ({
  ComplianceAuditVault: {
    appendRecord: jest.fn().mockResolvedValue({
      id: "vault_101",
      recordHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }),
  },
}));

describe("Sprint-011 Copilot Autonomous Remediation Bridge", () => {
  let bridge: CopilotRemediationBridge;

  beforeEach(() => {
    bridge = new CopilotRemediationBridge();
  });

  it("bridges approved copilot recommendation into ticket creation and audit vault logging", async () => {
    const rec: CopilotRecommendationRecord = {
      id: "rec_1001",
      tenantId: "inst_101",
      agentId: "agent_academic_advisor",
      domain: "academics",
      title: "Grade 10 Math Remediation",
      summary: "Peer tutoring recommended",
      suggestedAction: {
        actionType: "create_remediation_ticket",
        category: "academics",
        severity: "medium",
      },
      confidenceScore: 0.92,
      humanApprovalStatus: "APPROVED",
      createdAt: new Date().toISOString(),
    };

    const res = await bridge.executeApprovedRecommendation("inst_101", rec, "usr_admin", "admin");

    expect(res.success).toBe(true);
    expect(res.ticketId).toBe("rem_tk_bridge_101");
    expect(res.auditRecordHash).toBeDefined();
  });
});
