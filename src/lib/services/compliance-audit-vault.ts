import { db, complianceAuditVault } from "@thaiba/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export interface AuditRecordPayload {
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actorId: string;
  actorRole: string;
}

export interface VaultVerificationResult {
  tenantId: string;
  status: "VALIDATED" | "TAMPER_DETECTED";
  totalRecords: number;
  lastRecordHash: string;
  tamperedIndex?: number;
  verificationTimeMs: number;
}

export class ComplianceAuditVault {
  /**
   * Calculate SHA-256 hash string for an audit record
   */
  static calculateRecordHash(previousHash: string, payloadJson: string, timestamp: string, actorId: string): string {
    const rawData = `${previousHash}:${payloadJson}:${timestamp}:${actorId}`;
    return crypto.createHash("sha256").update(rawData).digest("hex");
  }

  /**
   * Append new immutable audit record to WORM vault
   */
  static async appendRecord(params: AuditRecordPayload) {
    const timestamp = new Date().toISOString();
    const payloadJson = JSON.stringify(params.payload);

    // Get latest record for tenant to chain hash
    const latestRecord = await db
      .select({ recordHash: complianceAuditVault.recordHash })
      .from(complianceAuditVault)
      .where(eq(complianceAuditVault.tenantId, params.tenantId))
      .orderBy(desc(complianceAuditVault.timestamp))
      .get();

    const previousHash = latestRecord?.recordHash || GENESIS_HASH;
    const recordHash = this.calculateRecordHash(previousHash, payloadJson, timestamp, params.actorId);
    const signature = crypto.createHmac("sha256", "thaiba_vault_secret").update(recordHash).digest("hex");

    const newRecord = {
      id: `vlt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: params.tenantId,
      eventType: params.eventType,
      previousHash,
      recordHash,
      payloadJson,
      signature,
      actorId: params.actorId,
      actorRole: params.actorRole,
      timestamp,
    };

    await db.insert(complianceAuditVault).values(newRecord);
    return newRecord;
  }

  /**
   * Verify mathematical integrity of WORM audit vault hash chain for a tenant
   */
  static async verifyVaultIntegrity(tenantId: string): Promise<VaultVerificationResult> {
    const startTime = Date.now();

    const records = await db
      .select()
      .from(complianceAuditVault)
      .where(eq(complianceAuditVault.tenantId, tenantId))
      .orderBy(complianceAuditVault.timestamp);

    if (records.length === 0) {
      return {
        tenantId,
        status: "VALIDATED",
        totalRecords: 0,
        lastRecordHash: GENESIS_HASH,
        verificationTimeMs: Date.now() - startTime,
      };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];

      // Check previous hash link
      if (rec.previousHash !== expectedPrevHash) {
        return {
          tenantId,
          status: "TAMPER_DETECTED",
          totalRecords: records.length,
          lastRecordHash: rec.recordHash,
          tamperedIndex: i,
          verificationTimeMs: Date.now() - startTime,
        };
      }

      // Recompute record hash
      const computedHash = this.calculateRecordHash(rec.previousHash, rec.payloadJson, rec.timestamp, rec.actorId);
      if (computedHash !== rec.recordHash) {
        return {
          tenantId,
          status: "TAMPER_DETECTED",
          totalRecords: records.length,
          lastRecordHash: rec.recordHash,
          tamperedIndex: i,
          verificationTimeMs: Date.now() - startTime,
        };
      }

      expectedPrevHash = rec.recordHash;
    }

    return {
      tenantId,
      status: "VALIDATED",
      totalRecords: records.length,
      lastRecordHash: records[records.length - 1].recordHash,
      verificationTimeMs: Date.now() - startTime,
    };
  }
}
