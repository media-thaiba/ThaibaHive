import { RemediationTicketService } from "@/lib/services/remediation-ticket-service";
import { ComplianceAuditVault } from "@/lib/services/compliance-audit-vault";
import { CopilotRecommendationRecord } from "@/lib/services/agent-reasoning-engine";

export class CopilotRemediationBridge {
  async executeApprovedRecommendation(
    tenantId: string,
    recommendation: CopilotRecommendationRecord,
    actorId: string,
    actorRole: string
  ): Promise<{ success: boolean; ticketId?: string; auditRecordHash?: string }> {
    let ticketId: string | undefined;

    // 1. If recommendation suggested creating a remediation ticket, invoke Sprint-010 RemediationTicketService
    if (recommendation.suggestedAction && (recommendation.suggestedAction as { actionType?: string }).actionType === "create_remediation_ticket") {
      const actionDetails = recommendation.suggestedAction as {
        category?: "attendance" | "finance" | "academics" | "operations";
        severity?: "critical" | "high" | "medium" | "low";
        affectedStudentIds?: string[];
      };

      const ticket = await RemediationTicketService.createTicket({
        institutionId: tenantId,
        title: `[AI Copilot Triggered] ${recommendation.title}`,
        severity: actionDetails.severity || "medium",
        category: actionDetails.category || "academics",
        affectedStudentId: actionDetails.affectedStudentIds?.[0],
        autoAssign: true,
      });
      ticketId = ticket.id;
    }

    // 2. Record execution in Sprint-010 Cryptographic SHA-256 WORM Audit Vault
    const vaultRecord = await ComplianceAuditVault.appendRecord({
      tenantId,
      eventType: "COPILOT_RECOMMENDATION_EXECUTED",
      payload: {
        recommendationId: recommendation.id,
        agentId: recommendation.agentId,
        title: recommendation.title,
        domain: recommendation.domain,
        confidenceScore: recommendation.confidenceScore,
        ticketId,
      },
      actorId,
      actorRole,
    });

    return {
      success: true,
      ticketId,
      auditRecordHash: vaultRecord.recordHash,
    };
  }
}

export const copilotRemediationBridge = new CopilotRemediationBridge();
