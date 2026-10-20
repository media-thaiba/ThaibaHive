import { db } from "@/db";
import { institutions, purchaseRequests } from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";

/**
 * In-memory serialization mutex keyed by scope (e.g. `inst:${institutionId}`, `expense:${id}`).
 * Guarantees that concurrent budget calculations, status transitions, and disbursement ledger
 * writes execute sequentially without race conditions.
 */
const financeLocks = new Map<string, Promise<void>>();

export async function withFinanceLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = financeLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  financeLocks.set(key, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (financeLocks.get(key) === nextLock) {
      financeLocks.delete(key);
    }
  }
}

export interface BudgetCheckResult {
  allowed: boolean;
  allocated: number;
  totalSpent: number;
  totalPending: number;
  remaining: number;
  error?: string;
}

/**
 * Validates whether an institution has sufficient remaining allocated budget
 * for a proposed purchase amount. If allocatedBudget <= 0 or not configured,
 * budget is treated as unconstrained.
 */
export async function checkInstitutionBudget(
  institutionId: string,
  additionalAmount: number,
  excludePurchaseId?: string
): Promise<BudgetCheckResult> {
  const institution = await db
    .select({ allocatedBudget: institutions.allocatedBudget })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .get();

  const allocated = Number(institution?.allocatedBudget ?? 0);

  // If no positive budget is allocated, allocation constraints are unconfigured
  if (allocated <= 0) {
    return {
      allowed: true,
      allocated: 0,
      totalSpent: 0,
      totalPending: 0,
      remaining: 0,
    };
  }

  // Active spent purchases: approved, ordered, received
  const spentConditions = [
    eq(purchaseRequests.institutionId, institutionId),
    inArray(purchaseRequests.status, ["approved", "ordered", "received"]),
  ];
  if (excludePurchaseId) {
    spentConditions.push(ne(purchaseRequests.id, excludePurchaseId));
  }

  const spentResult = await db
    .select({ totalCost: sql<number>`coalesce(sum(${purchaseRequests.estimatedCost}), 0)` })
    .from(purchaseRequests)
    .where(and(...spentConditions))
    .get();

  const totalSpent = Number(spentResult?.totalCost ?? 0);

  // Active pending commitments: pending_hod, pending_accounts, pending_purchase
  const pendingConditions = [
    eq(purchaseRequests.institutionId, institutionId),
    inArray(purchaseRequests.status, ["pending_hod", "pending_accounts", "pending_purchase"]),
  ];
  if (excludePurchaseId) {
    pendingConditions.push(ne(purchaseRequests.id, excludePurchaseId));
  }

  const pendingResult = await db
    .select({ totalCost: sql<number>`coalesce(sum(${purchaseRequests.estimatedCost}), 0)` })
    .from(purchaseRequests)
    .where(and(...pendingConditions))
    .get();

  const totalPending = Number(pendingResult?.totalCost ?? 0);
  const remaining = allocated - totalSpent - totalPending;

  if (additionalAmount > remaining) {
    return {
      allowed: false,
      allocated,
      totalSpent,
      totalPending,
      remaining: Math.max(0, remaining),
      error: `Insufficient budget: purchase request of ₹${additionalAmount.toLocaleString()} exceeds remaining allocated budget of ₹${Math.max(0, remaining).toLocaleString()}`,
    };
  }

  return {
    allowed: true,
    allocated,
    totalSpent,
    totalPending,
    remaining: Math.max(0, remaining - additionalAmount),
  };
}

export function isTerminalExpenseStatus(status: string): boolean {
  return ["disbursed", "rejected", "cancelled"].includes(status);
}

export function isTerminalPurchaseStatus(status: string): boolean {
  return ["received", "rejected", "cancelled"].includes(status);
}
