import { agentReasoningEngine, CopilotRecommendationRecord } from "./agent-reasoning-engine";

export interface ComplianceAuditAuditState {
  campusId: string;
  frameworkCode: string;
  overallComplianceScore: number;
  vaultIntegrityStatus: "VALIDATED" | "TAMPER_DETECTED" | "UNCHECKED";
  pendingCertificationsCount: number;
  missingSafetyLogsCount: number;
}

export class ComplianceAuditorAgent {
  readonly agentId = "agent_compliance_auditor";
  readonly agentType = "compliance_auditor";
  readonly domain = "compliance";
  readonly name = "Compliance Auditor Copilot";

  async analyzeAndRecommend(
    tenantId: string,
    state: ComplianceAuditAuditState,
    customQuery?: string
  ): Promise<CopilotRecommendationRecord> {
    const isVaultCompromised = state.vaultIntegrityStatus === "TAMPER_DETECTED";
    const isScoreLow = state.overallComplianceScore < 85;

    const title = `Compliance Audit Briefing — Framework ${state.frameworkCode}`;
    const summary = `Compliance Score: ${state.overallComplianceScore.toFixed(1)}%. Vault Integrity: ${state.vaultIntegrityStatus}. ${state.pendingCertificationsCount} pending staff privacy certifications.`;
    const confidenceScore = isVaultCompromised ? 0.99 : 0.91;

    const actionItems: string[] = [];
    if (isVaultCompromised) {
      actionItems.push("URGENT: Investigate WORM audit vault hash mismatch immediately.");
    }
    if (state.pendingCertificationsCount > 0) {
      actionItems.push(`Notify ${state.pendingCertificationsCount} staff members for annual privacy re-certification.`);
    }
    if (state.missingSafetyLogsCount > 0) {
      actionItems.push(`Complete ${state.missingSafetyLogsCount} missing quarterly facility safety log entries.`);
    }

    const suggestedAction = {
      actionType: "compliance_audit_remediation",
      category: "compliance",
      severity: isVaultCompromised ? "critical" : isScoreLow ? "high" : "medium",
      frameworkCode: state.frameworkCode,
      vaultStatus: state.vaultIntegrityStatus,
      remediationActionChecklist: actionItems,
    };

    return agentReasoningEngine.processReasoningAndGenerateRecommendation({
      tenantId,
      agentId: this.agentId,
      domain: this.domain,
      title,
      summary,
      contextData: {
        campusId: state.campusId,
        frameworkCode: state.frameworkCode,
        score: state.overallComplianceScore,
        customQuery,
      },
      suggestedAction,
      confidenceScore,
    });
  }
}

export const complianceAuditorAgent = new ComplianceAuditorAgent();
