import {
  db,
  purchaseRequests,
  purchaseApprovalTiers,
  purchaseApprovalLogs,
  eq,
  and,
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
   * Process a purchase approval action with cryptographic Merkle chain verification.
   *
   * Hardening invariants:
   * - The tier level is derived server-side from prior "approved" logs; a
   *   client-supplied tierLevel can neither skip tiers nor impersonate one.
   * - Role enforcement is mandatory: an unknown active tier is an error,
   *   never a bypass. Only super_admin may act outside configured roles.
   * - No tier matches the amount → fail closed (except super_admin).
   * - Log insert + status update run in one transaction with an optimistic
   *   status guard, so concurrent approvals cannot fork the Merkle chain.
   */
  async processApproval(payload: ApprovalActionPayload) {
    const isSuperAdmin = payload.approverRole === "super_admin";

    return db.transaction(async (tx) => {
      // 1. Fetch purchase request (tenant-scoped when a concrete institution is active)
      const [request] = await tx
        .select()
        .from(purchaseRequests)
        .where(
          payload.institutionId && payload.institutionId !== "global"
            ? and(
                eq(purchaseRequests.id, payload.purchaseRequestId),
                eq(purchaseRequests.institutionId, payload.institutionId)
              )
            : eq(purchaseRequests.id, payload.purchaseRequestId)
        );

      if (!request) {
        throw new Error(`Purchase request not found: ${payload.purchaseRequestId}`);
      }

      if (request.status === "approved" || request.status === "rejected") {
        throw new Error(`Purchase request is already in terminal state: ${request.status}`);
      }

      // 2. Fetch required tiers for the amount — fail closed when none match,
      // otherwise an out-of-range amount would skip every role gate.
      const allTiers = await tx
        .select()
        .from(purchaseApprovalTiers)
        .where(eq(purchaseApprovalTiers.institutionId, payload.institutionId))
        .orderBy(asc(purchaseApprovalTiers.tierLevel));
      const amount = request.estimatedCost || 0;
      const requiredTiers = allTiers.filter((t) => {
        const minOk = amount >= t.minAmount;
        const maxOk = t.maxAmount === null || t.maxAmount === undefined || amount <= t.maxAmount;
        return minOk && maxOk;
      });

      if (requiredTiers.length === 0 && !isSuperAdmin) {
        throw new Error(
          `Forbidden: No approval tier matches amount ${amount} for this institution — configure tiers before approving`
        );
      }

      // 3. Fetch previous logs to get previous Merkle audit hash
      const pastLogs = await tx
        .select()
        .from(purchaseApprovalLogs)
        .where(eq(purchaseApprovalLogs.purchaseRequestId, payload.purchaseRequestId))
        .orderBy(desc(purchaseApprovalLogs.actionTimestamp));

      const prevAuditHash =
        pastLogs.length > 0
          ? pastLogs[0].merkleAuditHash
          : "0000000000000000000000000000000000000000000000000000000000000000";

      // 4. Server-derived next tier: count prior approvals, never trust the
      // client's tierLevel for progression (validated below when supplied).
      const approvedCount = pastLogs.filter((l) => l.action === "approved").length;
      if (requiredTiers.length > 0 && approvedCount >= requiredTiers.length) {
        throw new Error(
          `Purchase request already received all ${requiredTiers.length} required approvals`
        );
      }
      const activeTier = requiredTiers[approvedCount];
      const currentTierLevel = activeTier ? activeTier.tierLevel : approvedCount + 1;

      if (payload.tierLevel != null && activeTier && payload.tierLevel !== activeTier.tierLevel) {
        throw new Error(
          `Tier mismatch: expected tier ${activeTier.tierLevel}, received ${payload.tierLevel}`
        );
      }

      // 5. Mandatory role gate against the derived active tier
      if (activeTier && activeTier.requiredRole !== payload.approverRole && !isSuperAdmin) {
        throw new Error(
          `Role mismatch: Tier ${currentTierLevel} requires ${activeTier.requiredRole}, received ${payload.approverRole}`
        );
      }

      // 6. Compute SHA-256 Merkle hash
      const timestamp = new Date().toISOString();
      const hashData = `${prevAuditHash}:${payload.purchaseRequestId}:${currentTierLevel}:${payload.approverId}:${payload.action}:${timestamp}`;
      const merkleAuditHash = createHash("sha256").update(hashData).digest("hex");

      // 7. Record log
      const logId = `log-${randomUUID()}`;
      const [logEntry] = await tx
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

      // 8. Update purchase request status with an optimistic guard so a
      // concurrent approval rolls the log insert back instead of forking
      // the hash chain.
      let nextStatus = request.status;
      if (payload.action === "rejected") {
        nextStatus = "rejected";
      } else if (payload.action === "approved") {
        const isFinalTier =
          requiredTiers.length > 0
            ? approvedCount + 1 >= requiredTiers.length
            : isSuperAdmin;
        nextStatus = isFinalTier ? "approved" : `pending_tier_${currentTierLevel + 1}`;
      } else if (payload.action === "escalated") {
        nextStatus = `escalated_tier_${currentTierLevel + 1}`;
      }

      const [updatedRequest] = await tx
        .update(purchaseRequests)
        .set({
          status: nextStatus,
          approvedAt: nextStatus === "approved" ? timestamp : undefined,
          updatedAt: timestamp,
        })
        .where(
          and(
            eq(purchaseRequests.id, payload.purchaseRequestId),
            eq(purchaseRequests.status, request.status),
            ...(payload.institutionId && payload.institutionId !== "global"
              ? [eq(purchaseRequests.institutionId, payload.institutionId)]
              : [])
          )
        )
        .returning();

      if (!updatedRequest) {
        throw new Error(
          "Purchase request status changed by a concurrent request — approval not recorded"
        );
      }

      return {
        request: updatedRequest,
        log: logEntry,
        merkleAuditHash,
      };
    });
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
