import { describe, it, expect, beforeEach } from "@jest/globals";
import { TokenTracker } from "../metering/token-tracker";

describe("TokenTracker Multi-Tenant Metering", () => {
  let tracker: TokenTracker;
  const testTenantId = "test-inst-" + Date.now();

  beforeEach(() => {
    tracker = new TokenTracker();
  });

  it("checks budget for new tenant with default 1,000,000 limit", async () => {
    const budget = await tracker.checkBudget(testTenantId);

    expect(budget.monthlyLimit).toBe(1_000_000);
    expect(budget.usedTotal).toBe(0);
    expect(budget.remaining).toBe(1_000_000);
    expect(budget.percentageUsed).toBe(0);
    expect(budget.isWarning).toBe(false);
    expect(budget.isExhausted).toBe(false);
  });

  it("records token usage and updates budget remaining", async () => {
    await tracker.recordUsage(testTenantId, 1500, 500, 100);

    const summary = await tracker.getUsageSummary(testTenantId);
    expect(summary.usedInputTokens).toBe(1500);
    expect(summary.usedOutputTokens).toBe(500);
    expect(summary.usedCachedTokens).toBe(100);
    expect(summary.usedTotalTokens).toBe(2000);
    expect(summary.remainingTokens).toBe(998_000);
  });

  it("triggers warning status when usage exceeds 80%", async () => {
    const heavyTenantId = "heavy-inst-" + Date.now();
    await tracker.recordUsage(heavyTenantId, 600_000, 250_000, 0); // 850k / 1M = 85%

    const budget = await tracker.checkBudget(heavyTenantId);
    expect(budget.isWarning).toBe(true);
    expect(budget.isExhausted).toBe(false);
  });

  it("triggers exhausted status when usage reaches 100%", async () => {
    const exhaustedTenantId = "exhausted-inst-" + Date.now();
    await tracker.recordUsage(exhaustedTenantId, 800_000, 300_000, 0); // 1.1M / 1M = 110%

    const budget = await tracker.checkBudget(exhaustedTenantId);
    expect(budget.isExhausted).toBe(true);
    expect(budget.remaining).toBe(0);
  });
});
