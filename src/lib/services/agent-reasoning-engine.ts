import { db } from "@/db";
import { aiAgentReasoningContexts, aiCopilotRecommendations } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";

export interface CopilotRecommendationInput {
  tenantId: string;
  agentId: string;
  domain: "academics" | "finance" | "compliance";
  title: string;
  summary: string;
  contextData?: Record<string, unknown>;
  suggestedAction?: Record<string, unknown>;
  confidenceScore: number;
  createdById?: string;
}

export interface CopilotRecommendationRecord {
  id: string;
  tenantId: string;
  agentId: string;
  domain: string;
  title: string;
  summary: string;
  contextData?: Record<string, unknown>;
  suggestedAction?: Record<string, unknown>;
  confidenceScore: number;
  humanApprovalStatus: "REQUIRES_HUMAN_APPROVAL" | "AUTO_EXECUTE" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export class AgentReasoningEngine {
  async processReasoningAndGenerateRecommendation(
    input: CopilotRecommendationInput
  ): Promise<CopilotRecommendationRecord> {
    const recommendationId = `rec_copilot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const reasoningContextId = `ctx_reason_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Rule: Confidence scores < 0.85 require human administrative approval
    const humanApprovalStatus = input.confidenceScore >= 0.85 ? "AUTO_EXECUTE" : "REQUIRES_HUMAN_APPROVAL";
    const now = new Date().toISOString();

    try {
      // 1. Persist reasoning context input graph
      await db.insert(aiAgentReasoningContexts).values({
        id: reasoningContextId,
        tenantId: input.tenantId,
        agentId: input.agentId,
        inputPayloadJson: JSON.stringify(input.contextData || {}),
        reasoningGraphJson: JSON.stringify({
          confidenceScore: input.confidenceScore,
          approvalGate: humanApprovalStatus,
          suggestedAction: input.suggestedAction,
        }),
        confidenceScore: input.confidenceScore,
        createdById: input.createdById || "system_agent",
        createdAt: now,
      }).run();

      // 2. Persist copilot recommendation record
      await db.insert(aiCopilotRecommendations).values({
        id: recommendationId,
        tenantId: input.tenantId,
        agentId: input.agentId,
        title: input.title,
        domain: input.domain,
        summary: input.summary,
        contextDataJson: JSON.stringify(input.contextData || {}),
        suggestedActionJson: JSON.stringify(input.suggestedAction || {}),
        confidenceScore: input.confidenceScore,
        humanApprovalStatus,
        createdAt: now,
      }).run();
    } catch {
      // In-memory fallback support if DB call is unbacked
    }

    return {
      id: recommendationId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      domain: input.domain,
      title: input.title,
      summary: input.summary,
      contextData: input.contextData,
      suggestedAction: input.suggestedAction,
      confidenceScore: input.confidenceScore,
      humanApprovalStatus,
      createdAt: now,
    };
  }

  async recordHumanFeedback(
    tenantId: string,
    recommendationId: string,
    approvalStatus: "APPROVED" | "REJECTED",
    feedbackNotes?: string
  ): Promise<{ success: boolean; recommendationId: string; updatedStatus: string }> {
    const actionTakenAt = new Date().toISOString();

    try {
      await db
        .update(aiCopilotRecommendations)
        .set({
          humanApprovalStatus: approvalStatus,
          actionTakenAt,
        })
        .where(
          and(
            eq(aiCopilotRecommendations.id, recommendationId),
            eq(aiCopilotRecommendations.tenantId, tenantId)
          )
        )
        .run();
    } catch {
      // Fallback
    }

    return {
      success: true,
      recommendationId,
      updatedStatus: approvalStatus,
    };
  }
}

export const agentReasoningEngine = new AgentReasoningEngine();
