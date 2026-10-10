import { db, sql } from "@/db";
import { aiTokenBudgets } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export interface AIUsageLog {
  institutionId: string;
  staffId: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
}

export async function logAIUsage(log: AIUsageLog): Promise<void> {
  try {
    const budget = await db
      .select()
      .from(aiTokenBudgets)
      .where(eq(aiTokenBudgets.institutionId, log.institutionId))
      .get();

    if (budget) {
      await db
        .update(aiTokenBudgets)
        .set({
          usedInputTokens: sql`${aiTokenBudgets.usedInputTokens} + ${log.inputTokens}`,
          usedOutputTokens: sql`${aiTokenBudgets.usedOutputTokens} + ${log.outputTokens}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(aiTokenBudgets.institutionId, log.institutionId))
        .run();
    }
  } catch {
    // Non-blocking logging
  }
}