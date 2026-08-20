import { PrivacyBudgetManager } from '@/lib/operations/privacy/privacy-budget-manager';

describe('PrivacyBudgetManager', () => {
  let manager: PrivacyBudgetManager;

  beforeEach(() => {
    manager = new PrivacyBudgetManager();
  });

  it('should initialize and track privacy budget accurately', () => {
    const budget = manager.initializeBudget('tenant_alpha', 5.0, 1e-5);
    expect(budget.totalBudgetEpsilon).toBe(5.0);
    expect(budget.consumedEpsilon).toBe(0);
    expect(budget.isExhausted).toBe(false);

    expect(manager.checkBudget('tenant_alpha', 2.0)).toBe(true);

    const updated = manager.consumeBudget('tenant_alpha', 2.5);
    expect(updated.consumedEpsilon).toBe(2.5);
    expect(updated.remainingEpsilon).toBe(2.5);
    expect(updated.isExhausted).toBe(false);
  });

  it('should throw and reject when budget is exhausted', () => {
    manager.initializeBudget('tenant_beta', 1.0, 1e-5);
    manager.consumeBudget('tenant_beta', 0.9);

    expect(manager.checkBudget('tenant_beta', 0.5)).toBe(false);
    expect(() => manager.consumeBudget('tenant_beta', 0.5)).toThrow(/exhausted/);
  });

  it('should allow authorized privacy officer reset', () => {
    manager.initializeBudget('tenant_gamma', 2.0);
    manager.consumeBudget('tenant_gamma', 2.0);
    expect(manager.getBudget('tenant_gamma').isExhausted).toBe(true);

    manager.resetBudget('tenant_gamma', 10.0);
    expect(manager.getBudget('tenant_gamma').isExhausted).toBe(false);
    expect(manager.getBudget('tenant_gamma').remainingEpsilon).toBe(10.0);
  });
});
