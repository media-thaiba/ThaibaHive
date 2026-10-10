import { db } from "@/db";
import { aiTokenBudgets } from "@thaiba/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface BudgetCheckResult {
  monthlyLimit: number;
  usedTotal: number;
  remaining: number;
  percentageUsed: number;
  isWarning: boolean;
  isExhausted: boolean;
}

export interface UsageSummary {
  institutionId: string;
  monthlyLimit: number;
  usedInputTokens: number;
  usedOutputTokens: number;
  usedCachedTokens: number;
  usedTotalTokens: number;
  remainingTokens: number;
  percentageUsed: number;
  billingCycleStart: string;
  isWarning: boolean;
  isExhausted: boolean;
  updatedAt: string;
}

interface InMemBudget {
  monthlyLimit: number;
  usedInputTokens: number;
  usedOutputTokens: number;
  usedCachedTokens: number;
  billingCycleStart: string;
  updatedAt: string;
}

export class TokenTracker {
  private inMemStore = new Map<string, InMemBudget>();
  private inMemoryCache = new Map<string, { budget: BudgetCheckResult; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5000;

  async recordUsage(
    institutionId: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens = 0
  ): Promise<void> {
    if (!institutionId) return;

    this.inMemoryCache.delete(institutionId);
    const now = new Date().toISOString();
    const cycleStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // 1. In-memory store update
    const current = this.inMemStore.get(institutionId) || {
      monthlyLimit: 1_000_000,
      usedInputTokens: 0,
      usedOutputTokens: 0,
      usedCachedTokens: 0,
      billingCycleStart: cycleStart,
      updatedAt: now,
    };

    current.usedInputTokens += inputTokens;
    current.usedOutputTokens += outputTokens;
    current.usedCachedTokens += cachedTokens;
    current.updatedAt = now;
    this.inMemStore.set(institutionId, current);

    // 2. Database persistence
    try {
      const existing = await db
        .select()
        .from(aiTokenBudgets)
        .where(eq(aiTokenBudgets.institutionId, institutionId))
        .get();

      if (existing) {
        await db
          .update(aiTokenBudgets)
          .set({
            usedInputTokens: sql`${aiTokenBudgets.usedInputTokens} + ${inputTokens}`,
            usedOutputTokens: sql`${aiTokenBudgets.usedOutputTokens} + ${outputTokens}`,
            usedCachedTokens: sql`${aiTokenBudgets.usedCachedTokens} + ${cachedTokens}`,
            updatedAt: now,
          })
          .where(eq(aiTokenBudgets.institutionId, institutionId));
      } else {
        await db.insert(aiTokenBudgets).values({
          id: randomUUID(),
          institutionId,
          monthlyTokenLimit: current.monthlyLimit,
          usedInputTokens: current.usedInputTokens,
          usedOutputTokens: current.usedOutputTokens,
          usedCachedTokens: current.usedCachedTokens,
          billingCycleStart: cycleStart,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {
      // Gracefully continue with in-memory store in test/ephemeral setups
    }
  }

  async checkBudget(institutionId: string): Promise<BudgetCheckResult> {
    if (!institutionId) {
      return {
        monthlyLimit: 1_000_000,
        usedTotal: 0,
        remaining: 1_000_000,
        percentageUsed: 0,
        isWarning: false,
        isExhausted: false,
      };
    }

    const cached = this.inMemoryCache.get(institutionId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.budget;
    }

    let monthlyLimit = 1_000_000;
    let usedInput = 0;
    let usedOutput = 0;

    try {
      const budget = await db
        .select()
        .from(aiTokenBudgets)
        .where(eq(aiTokenBudgets.institutionId, institutionId))
        .get();

      if (budget) {
        monthlyLimit = budget.monthlyTokenLimit;
        usedInput = budget.usedInputTokens;
        usedOutput = budget.usedOutputTokens;
      } else if (this.inMemStore.has(institutionId)) {
        const mem = this.inMemStore.get(institutionId)!;
        monthlyLimit = mem.monthlyLimit;
        usedInput = mem.usedInputTokens;
        usedOutput = mem.usedOutputTokens;
      }
    } catch {
      if (this.inMemStore.has(institutionId)) {
        const mem = this.inMemStore.get(institutionId)!;
        monthlyLimit = mem.monthlyLimit;
        usedInput = mem.usedInputTokens;
        usedOutput = mem.usedOutputTokens;
      }
    }

    const usedTotal = usedInput + usedOutput;
    const remaining = Math.max(0, monthlyLimit - usedTotal);
    const percentageUsed = monthlyLimit > 0 ? (usedTotal / monthlyLimit) * 100 : 0;

    const result: BudgetCheckResult = {
      monthlyLimit,
      usedTotal,
      remaining,
      percentageUsed,
      isWarning: percentageUsed >= 80 && percentageUsed < 100,
      isExhausted: percentageUsed >= 100,
    };

    this.inMemoryCache.set(institutionId, { budget: result, timestamp: Date.now() });
    return result;
  }

  async getUsageSummary(institutionId: string): Promise<UsageSummary> {
    let monthlyLimit = 1_000_000;
    let usedInput = 0;
    let usedOutput = 0;
    let usedCached = 0;
    const now = new Date().toISOString();
    let cycleStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    let updatedAt = now;

    try {
      const budget = await db
        .select()
        .from(aiTokenBudgets)
        .where(eq(aiTokenBudgets.institutionId, institutionId))
        .get();

      if (budget) {
        monthlyLimit = budget.monthlyTokenLimit;
        usedInput = budget.usedInputTokens;
        usedOutput = budget.usedOutputTokens;
        usedCached = budget.usedCachedTokens;
        cycleStart = budget.billingCycleStart;
        updatedAt = budget.updatedAt;
      } else if (this.inMemStore.has(institutionId)) {
        const mem = this.inMemStore.get(institutionId)!;
        monthlyLimit = mem.monthlyLimit;
        usedInput = mem.usedInputTokens;
        usedOutput = mem.usedOutputTokens;
        usedCached = mem.usedCachedTokens;
        cycleStart = mem.billingCycleStart;
        updatedAt = mem.updatedAt;
      }
    } catch {
      if (this.inMemStore.has(institutionId)) {
        const mem = this.inMemStore.get(institutionId)!;
        monthlyLimit = mem.monthlyLimit;
        usedInput = mem.usedInputTokens;
        usedOutput = mem.usedOutputTokens;
        usedCached = mem.usedCachedTokens;
        cycleStart = mem.billingCycleStart;
        updatedAt = mem.updatedAt;
      }
    }

    const usedTotal = usedInput + usedOutput;
    const remaining = Math.max(0, monthlyLimit - usedTotal);
    const percentageUsed = monthlyLimit > 0 ? (usedTotal / monthlyLimit) * 100 : 0;

    return {
      institutionId,
      monthlyLimit,
      usedInputTokens: usedInput,
      usedOutputTokens: usedOutput,
      usedCachedTokens: usedCached,
      usedTotalTokens: usedTotal,
      remainingTokens: remaining,
      percentageUsed: Math.round(percentageUsed * 10) / 10,
      billingCycleStart: cycleStart,
      isWarning: percentageUsed >= 80 && percentageUsed < 100,
      isExhausted: percentageUsed >= 100,
      updatedAt,
    };
  }
}

export const aiTokenTracker = new TokenTracker();
