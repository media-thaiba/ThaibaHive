import {
  db,
  purchaseRequests,
  purchaseApprovalTiers,
  purchaseApprovalLogs,
  eq,
  asc,
  desc,
} from "@/db";
import { createHash, randomUUID } from "crypto";

export interface ApprovalActionPayload {
  purchaseRequestId: string;
  institutionId: string;
  approverId: string;
  approverRole: string;
  action: "approved" | "rejected" | "escalated" | "delegated";
  comments?: string;
  tierLevel?: number;
}

export class PurchaseApprovalEngine {
  private static instance: PurchaseApprovalEngine;

  private constructor() {}

  public static getInstance(): PurchaseApprovalEngine {
    if (!PurchaseApprovalEngine.instance) {
      PurchaseApprovalEngine.instance = new PurchaseApprovalEngine();
    }
    return PurchaseApprovalEngine.instance;
  }

  /**
   * Configure a new approval tier for an institution
   */
  async createTier(input: {
    institutionId: string;
    tierLevel: number;
    name: string;
    minAmount?: number;
    maxAmount?: number;
    requiredRole: string;
    requiresSequentialApproval?: boolean;
    autoEscalateHours?: number;
  }) {
    const id = `tier-${randomUUID()}`;
    const [tier] = await db
      .insert(purchaseApprovalTiers)
      .values({
        id,
        institutionId: input.institutionId,
        tierLevel: input.tierLevel,
        name: input.name,
        minAmount: input.minAmount ?? 0,
        maxAmount: input.maxAmount,
        requiredRole: input.requiredRole,
        requiresSequentialApproval: input.requiresSequentialApproval ?? true,
        autoEscalateHours: input.autoEscalateHours ?? 48,
      })
      .returning();
    return tier;
  }

  /**
   * Get all tiers configured for an institution
   */
  async getTiers(institutionId: string) {
    return db
      .select()
      .from(purchaseApprovalTiers)
      .where(eq(purchaseApprovalTiers.institutionId, institutionId))
      .orderBy(asc(purchaseApprovalTiers.tierLevel));
  }

  /**
   * Determine required approval tiers for a given purchase request amount
   */
  async getRequiredTiersForAmount(institutionId: string, amount: number) {
    const allTiers = await this.getTiers(institutionId);
    return allTiers.filter((t) => {
      const minOk = amount >= t.minAmount;
      const maxOk = t.maxAmount === null || t.maxAmount === undefined || amount <= t.maxAmount;
      return minOk && maxOk;
    });
  }

  /**
   * Process a purchase approval action with cryptographic Merkle chain verification
   */
  async processApproval(payload: ApprovalActionPayload) {
    // 1. Fetch purchase request
    const [request] = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, payload.purchaseRequestId));

    if (!request) {
      throw new Error(`Purchase request not found: ${payload.purchaseRequestId}`);
    }

    if (request.status === "approved" || request.status === "rejected") {
      throw new Error(`Purchase request is already in terminal state: ${request.status}`);
    }

    // 2. Fetch required tiers
    const requiredTiers = await this.getRequiredTiersForAmount(
      payload.institutionId,
      request.estimatedCost || 0
    );

    // 3. Fetch previous logs to get previous Merkle audit hash
    const pastLogs = await db
      .select()
      .from(purchaseApprovalLogs)
      .where(eq(purchaseApprovalLogs.purchaseRequestId, payload.purchaseRequestId))
      .orderBy(desc(purchaseApprovalLogs.actionTimestamp));

    const prevAuditHash =
      pastLogs.length > 0
        ? pastLogs[0].merkleAuditHash
        : "0000000000000000000000000000000000000000000000000000000000000000";

    const currentTierLevel = payload.tierLevel || (pastLogs.length + 1);

    // 4. Validate approver role against required tier
    const activeTier = requiredTiers.find((t) => t.tierLevel === currentTierLevel);
    if (activeTier && activeTier.requiredRole !== payload.approverRole && payload.approverRole !== "super_admin") {
      throw new Error(
        `Role mismatch: Tier ${currentTierLevel} requires ${activeTier.requiredRole}, received ${payload.approverRole}`
      );
    }

    // 5. Compute SHA-256 Merkle hash
    const timestamp = new Date().toISOString();
    const hashData = `${prevAuditHash}:${payload.purchaseRequestId}:${currentTierLevel}:${payload.approverId}:${payload.action}:${timestamp}`;
    const merkleAuditHash = createHash("sha256").update(hashData).digest("hex");

    // 6. Record log
    const logId = `log-${randomUUID()}`;
    const [logEntry] = await db
      .insert(purchaseApprovalLogs)
      .values({
        id: logId,
        institutionId: payload.institutionId,
        purchaseRequestId: payload.purchaseRequestId,
        tierLevel: currentTierLevel,
        approverId: payload.approverId,
        action: payload.action,
        comments: payload.comments,
        merkleAuditHash,
        prevAuditHash,
        actionTimestamp: timestamp,
      })
      .returning();

    // 7. Update purchase request status
    let nextStatus = request.status;
    if (payload.action === "rejected") {
      nextStatus = "rejected";
    } else if (payload.action === "approved") {
      const isFinalTier =
        requiredTiers.length === 0 ||
        currentTierLevel >= Math.max(...requiredTiers.map((t) => t.tierLevel));
      nextStatus = isFinalTier ? "approved" : `pending_tier_${currentTierLevel + 1}`;
    } else if (payload.action === "escalated") {
      nextStatus = `escalated_tier_${currentTierLevel + 1}`;
    }

    const [updatedRequest] = await db
      .update(purchaseRequests)
      .set({
        status: nextStatus,
        approvedAt: nextStatus === "approved" ? timestamp : undefined,
        updatedAt: timestamp,
      })
      .where(eq(purchaseRequests.id, payload.purchaseRequestId))
      .returning();

    return {
      request: updatedRequest,
      log: logEntry,
      merkleAuditHash,
    };
  }

  /**
   * Verify cryptographic audit trail integrity for a purchase request
   */
  async verifyAuditTrail(purchaseRequestId: string): Promise<{
    isValid: boolean;
    tamperedAt?: string;
    totalLogs: number;
  }> {
    const logs = await db
      .select()
      .from(purchaseApprovalLogs)
      .where(eq(purchaseApprovalLogs.purchaseRequestId, purchaseRequestId))
      .orderBy(asc(purchaseApprovalLogs.actionTimestamp));

    let expectedPrev = "0000000000000000000000000000000000000000000000000000000000000000";

    for (const log of logs) {
      if (log.prevAuditHash && log.prevAuditHash !== expectedPrev) {
        return { isValid: false, tamperedAt: log.id, totalLogs: logs.length };
      }

      const hashData = `${log.prevAuditHash || expectedPrev}:${log.purchaseRequestId}:${log.tierLevel}:${log.approverId}:${log.action}:${log.actionTimestamp}`;
      const calculated = createHash("sha256").update(hashData).digest("hex");

      if (calculated !== log.merkleAuditHash) {
        return { isValid: false, tamperedAt: log.id, totalLogs: logs.length };
      }

      expectedPrev = log.merkleAuditHash;
    }

    return { isValid: true, totalLogs: logs.length };
  }
}

export const purchaseApprovalEngine = PurchaseApprovalEngine.getInstance();
