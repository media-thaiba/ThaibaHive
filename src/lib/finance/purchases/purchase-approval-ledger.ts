import { db, purchaseRequests } from "@/db";
import { eq, and } from "drizzle-orm";
import { purchaseApprovalEngine } from "@/lib/finance/purchases/purchase-approval-engine";

/**
 * Per-request mutex for serializing approval operations.
 * Eliminates race conditions when multiple approvers act on the same request.
 */
const activeLocks = new Map<string, Promise<unknown>>();

export async function withPurchaseApprovalLock<T>(
  purchaseRequestId: string,
  fn: () => Promise<T>
): Promise<T> {
  const previousLock = activeLocks.get(purchaseRequestId) ?? Promise.resolve();

  let releaseLock!: () => void;
  const currentLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  activeLocks.set(purchaseRequestId, currentLock);

  try {
    await previousLock;
    return await fn();
  } finally {
    releaseLock();
    if (activeLocks.get(purchaseRequestId) === currentLock) {
      activeLocks.delete(purchaseRequestId);
    }
  }
}

/**
 * Verifies that a purchase request exists and is in a mutable state.
 * Returns the request if found and mutable, throws 404/409 otherwise.
 */
export async function verifyMutablePurchaseRequest(
  purchaseRequestId: string,
  institutionId?: string
): Promise<{ id: string; status: string; estimatedCost: number; institutionId: string }> {
  const conditions = [eq(purchaseRequests.id, purchaseRequestId)];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(purchaseRequests.institutionId, institutionId));
  }

  const [request] = await db
    .select()
    .from(purchaseRequests)
    .where(and(...conditions));

  if (!request) {
    throw new Error("PURCHASE_REQUEST_NOT_FOUND");
  }

  if (request.status === "approved" || request.status === "rejected") {
    throw new Error("PURCHASE_REQUEST_ALREADY_TERMINAL");
  }

  return {
    id: request.id,
    status: request.status,
    estimatedCost: request.estimatedCost || 0,
    institutionId: request.institutionId,
  };
}

/**
 * Verifies the integrity of the Merkle audit chain for a purchase request.
 * Delegates to the canonical implementation in purchaseApprovalEngine.
 */
export async function verifyAuditTrail(
  purchaseRequestId: string
): Promise<{ isValid: boolean; tamperedAt?: string; totalLogs: number }> {
  return purchaseApprovalEngine.verifyAuditTrail(purchaseRequestId);
}

export { verifyPurchaseApproval } from "@/lib/finance/purchases/purchase-approval-engine";
