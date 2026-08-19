import { academicAdvisorAgent } from "@/lib/services/academic-advisor-agent";
import { financialControllerAgent } from "@/lib/services/financial-controller-agent";
import {  } from "@/lib/services/compliance-auditor-agent";
import { agentSwarmOrchestrator } from "@/lib/services/agent-swarm-orchestrator";
import { timeSeriesDecompositionEngine } from "@/lib/services/time-series-decomposition-engine";
import { crossRegionalIntelligenceService } from "@/lib/services/cross-regional-intelligence-service";
import { copilotRemediationBridge } from "@/lib/services/copilot-remediation-bridge";

jest.mock("@/lib/services/remediation-ticket-service", () => ({
  RemediationTicketService: {
    createTicket: jest.fn().mockResolvedValue({
      id: "rem_tk_e2e_999",
      title: "[AI Copilot Triggered] E2E Remediation Plan",
      status: "auto_assigned",
    }),
  },
}));

jest.mock("@/lib/services/compliance-audit-vault", () => ({
  ComplianceAuditVault: {
    appendRecord: jest.fn().mockResolvedValue({
      id: "vault_e2e_999",
      recordHash: "f5a894762c2f829f0c5b36709848cf6d226a2d987f2e56997426a88b598b92b6",
    }),
  },
}));

describe("Sprint-011 End-to-End Multi-Agent Swarm & Copilot Integration", () => {
  it("executes complete multi-agent reasoning, swarm communication, decomposition, and remediation workflow", async () => {
    const tenantId = "inst_e2e_101";

    // 1. Swarm Registration
    await agentSwarmOrchestrator.registerAgent({
      id: academicAdvisorAgent.agentId,
      tenantId,
      agentType: "academic_advisor",
      domain: "academics",
      name: academicAdvisorAgent.name,
      capabilities: ["academic_intervention"],
      isActive: true,
    });

    await agentSwarmOrchestrator.registerAgent({
      id: financialControllerAgent.agentId,
      tenantId,
      agentType: "financial_controller",
      domain: "finance",
      name: financialControllerAgent.name,
      capabilities: ["budget_reallocation"],
      isActive: true,
    });

    // 2. Inter-Agent Communication Bus Message
    const msgRes = await agentSwarmOrchestrator.dispatchInterAgentMessage({
      tenantId,
      correlationId: "corr_e2e_001",
      senderAgentId: academicAdvisorAgent.agentId,
      recipientAgentId: financialControllerAgent.agentId,
      messageType: "QUERY_REMEDIATION_BUDGET",
      payload: { query: "Assess financial budget for Grade 10 math remediation" },
    });
    expect(msgRes.success).toBe(true);

    // 3. Academic Advisor Copilot Reasoning
    const academicRec = await academicAdvisorAgent.analyzeAndRecommend(tenantId, [
      { studentId: "std_e2e_1", name: "Test Student", gradeLevel: "Grade 10", recentExamScoreAvg: 45.0, attendancePercentage: 62.0, hasChronicAbsenteeismAlert: true },
    ]);
    expect(academicRec.confidenceScore).toBe(0.88);

    // 4. Financial Controller Copilot Reasoning (High deficit -> requires human approval)
    const financialRec = await financialControllerAgent.analyzeAndRecommend(tenantId, {
      campusId: tenantId,
      campusName: "North Campus",
      targetBudget: 1000000,
      currentRealization: 750000,
      unspentDepartmentalFunds: [{ departmentName: "Sports", amount: 60000 }],
      projectedDeficitPercent: 25.0,
    });
    expect(financialRec.humanApprovalStatus).toBe("REQUIRES_HUMAN_APPROVAL");

    // 5. Time-Series Decomposition Engine
    const observedSeries = [100, 120, 110, 130, 105, 125, 115, 135, 110, 130, 120, 140];
    const tsResult = await timeSeriesDecompositionEngine.runDecomposition(tenantId, "fee_collections", observedSeries);
    expect(tsResult.components.trend.length).toBe(12);

    // 6. Cross-Regional Intelligence Synthesis
    const briefing = crossRegionalIntelligenceService.synthesizeExecutiveBriefing(
      "reg_north_01",
      [
        { campusId: tenantId, campusName: "North Campus", attendanceAvg: 82, academicPassRate: 85, feeRealizationRate: 75, complianceScore: 92 },
      ],
      [academicRec, financialRec]
    );
    expect(briefing.recommendations.length).toBe(2);

    // 7. Remediation Bridge Execution
    const bridgeRes = await copilotRemediationBridge.executeApprovedRecommendation(tenantId, academicRec, "usr_principal", "principal");
    expect(bridgeRes.success).toBe(true);
    expect(bridgeRes.ticketId).toBe("rem_tk_e2e_999");
    expect(bridgeRes.auditRecordHash).toBeDefined();
  });
});
