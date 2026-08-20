import { PrivacyBudgetStatus } from './dp-types';

/**
 * Institutional Privacy Budget Manager enforcing hard epsilon/delta boundaries
 */
export class PrivacyBudgetManager {
  private budgets: Map<string, PrivacyBudgetStatus> = new Map();

  /**
   * Initialize or retrieve budget for tenant
   */
  public initializeBudget(
    tenantId: string,
    totalBudgetEpsilon: number = 10.0,
    totalBudgetDelta: number = 1e-5
  ): PrivacyBudgetStatus {
    const existing = this.budgets.get(tenantId);
    if (existing) return existing;

    const status: PrivacyBudgetStatus = {
      tenantId,
      totalBudgetEpsilon,
      consumedEpsilon: 0,
      remainingEpsilon: totalBudgetEpsilon,
      totalBudgetDelta,
      consumedDelta: 0,
      remainingDelta: totalBudgetDelta,
      isExhausted: false,
      totalRoundsCounted: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.budgets.set(tenantId, status);
    return status;
  }

  /**
   * Check if a requested epsilon consumption is permitted
   */
  public checkBudget(tenantId: string, requestedEpsilon: number): boolean {
    const budget = this.budgets.get(tenantId) || this.initializeBudget(tenantId);
    return !budget.isExhausted && budget.remainingEpsilon >= requestedEpsilon;
  }

  /**
   * Consume privacy budget after a training round
   */
  public consumeBudget(tenantId: string, epsilonDelta: number, deltaLoss: number = 0): PrivacyBudgetStatus {
    const budget = this.budgets.get(tenantId) || this.initializeBudget(tenantId);

    if (budget.isExhausted || budget.remainingEpsilon < epsilonDelta) {
      budget.isExhausted = true;
      budget.lastUpdated = new Date().toISOString();
      this.budgets.set(tenantId, budget);
      throw new Error(`Privacy budget exhausted for tenant: ${tenantId}. Remaining: ${budget.remainingEpsilon.toFixed(2)}, Requested: ${epsilonDelta.toFixed(2)}`);
    }

    budget.consumedEpsilon = Number((budget.consumedEpsilon + epsilonDelta).toFixed(4));
    budget.remainingEpsilon = Number(Math.max(0, budget.totalBudgetEpsilon - budget.consumedEpsilon).toFixed(4));
    budget.consumedDelta += deltaLoss;
    budget.totalRoundsCounted += 1;
    budget.isExhausted = budget.remainingEpsilon <= 0.0001;
    budget.lastUpdated = new Date().toISOString();

    this.budgets.set(tenantId, budget);
    return budget;
  }

  /**
   * Reset or re-grant budget (Authorized Privacy Officer only)
   */
  public resetBudget(tenantId: string, newTotalEpsilon?: number): PrivacyBudgetStatus {
    const budget = this.budgets.get(tenantId) || this.initializeBudget(tenantId);
    const total = newTotalEpsilon ?? budget.totalBudgetEpsilon;

    budget.totalBudgetEpsilon = total;
    budget.consumedEpsilon = 0;
    budget.remainingEpsilon = total;
    budget.isExhausted = false;
    budget.totalRoundsCounted = 0;
    budget.lastUpdated = new Date().toISOString();

    this.budgets.set(tenantId, budget);
    return budget;
  }

  /**
   * Get budget status
   */
  public getBudget(tenantId: string): PrivacyBudgetStatus {
    return this.budgets.get(tenantId) || this.initializeBudget(tenantId);
  }

  public getAllBudgets(): PrivacyBudgetStatus[] {
    return Array.from(this.budgets.values());
  }

  public clear(): void {
    this.budgets.clear();
  }
}
