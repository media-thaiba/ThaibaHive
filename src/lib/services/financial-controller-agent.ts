import { agentReasoningEngine, CopilotRecommendationRecord } from "./agent-reasoning-engine";

export interface CampusFinancialLedgerSummary {
  campusId: string;
  campusName: string;
  targetBudget: number;
  currentRealization: number;
  unspentDepartmentalFunds: { departmentName: string; amount: number }[];
  projectedDeficitPercent: number;
}

export class FinancialControllerAgent {
  readonly agentId = "agent_financial_controller";
  readonly agentType = "financial_controller";
  readonly domain = "finance";
  readonly name = "Financial Controller Copilot";

  async analyzeAndRecommend(
    tenantId: string,
    summary: CampusFinancialLedgerSummary,
    customQuery?: string
  ): Promise<CopilotRecommendationRecord> {
    const deficitAmount = summary.targetBudget - summary.currentRealization;
    const isCritical = summary.projectedDeficitPercent > 15;

    const title = `Financial Optimization Plan — ${summary.campusName}`;
    let description = `Current realization is $${summary.currentRealization.toLocaleString()} of $${summary.targetBudget.toLocaleString()} target (Deficit: ${summary.projectedDeficitPercent.toFixed(1)}%).`;
    const confidenceScore = isCritical ? 0.82 : 0.89; // Requires human approval if critical deficit

    const topUnspent = summary.unspentDepartmentalFunds.sort((a, b) => b.amount - a.amount)[0];

    if (topUnspent && topUnspent.amount > 0) {
      description += ` Recommend reallocating $${topUnspent.amount.toLocaleString()} unspent funds from ${topUnspent.departmentName} to balance realization.`;
    }

    const suggestedAction = {
      actionType: "financial_reallocation_recommendation",
      category: "finance",
      severity: isCritical ? "critical" : "medium",
      targetCampusId: summary.campusId,
      estimatedRecoveryAmount: topUnspent ? topUnspent.amount : Math.max(0, deficitAmount * 0.5),
      recommendedSteps: [
        "Issue early fee installment reminders",
        topUnspent ? `Reallocate surplus funds from ${topUnspent.departmentName}` : "Review non-essential procurement line items",
      ],
    };

    return agentReasoningEngine.processReasoningAndGenerateRecommendation({
      tenantId,
      agentId: this.agentId,
      domain: this.domain,
      title,
      summary: description,
      contextData: {
        campusId: summary.campusId,
        projectedDeficitPercent: summary.projectedDeficitPercent,
        customQuery,
      },
      suggestedAction,
      confidenceScore,
    });
  }
}

export const financialControllerAgent = new FinancialControllerAgent();
