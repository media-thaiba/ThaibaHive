import { db } from "@/db";
import { auditLogs, auditMerkleRoots } from "@thaiba/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  canonicalizePayload,
  computePreimageString,
  computeAuditBlockHash,
  computeAuditHmac,
  GENESIS_PREV_HASH,
} from "./canonical";
import { computeMerkleRoot } from "./merkle";
import { AuditEntry } from "./types";
import crypto from "crypto";

interface QueuedAuditItem {
  id: string;
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: any;
  canonicalPayloadJSON: string;
  sequenceNumber: number;
  previousHash: string;
  currentHash: string;
  signature: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
  nonce: string;
}

export class CryptographicAuditWriter {
  private queue: QueuedAuditItem[] = [];
  private lastStatesByTenant: Map<string, { sequenceNumber: number; currentHash: string }> = new Map();
  private tenantLogChains: Map<string, Promise<any>> = new Map();
  private isFlushing = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private batchSize = 100;
  private flushIntervalMs = 50;

  constructor() {
    this.startPeriodicFlush();
  }

  public clear(): void {
    this.queue = [];
    this.lastStatesByTenant.clear();
    this.tenantLogChains.clear();
  }

  private startPeriodicFlush() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush().catch((err) => {
          console.error("[@thaiba/audit] Periodic flush failed:", err);
        });
      }
    }, this.flushIntervalMs);
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Retrieves the latest sequence number and currentHash head for a tenant
   */
  async getLastHead(tenantId: string, runner: any = db): Promise<{ sequenceNumber: number; currentHash: string }> {
    if (runner === db && this.lastStatesByTenant.has(tenantId)) {
      return this.lastStatesByTenant.get(tenantId)!;
    }

    try {
      const query = runner
        .select({
          sequenceNumber: auditLogs.sequenceNumber,
          currentHash: auditLogs.currentHash,
        })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(desc(auditLogs.sequenceNumber))
        .limit(1);

      const rows = await (query.all ? query.all() : query);
      if (rows && rows.length > 0) {
        const head = {
          sequenceNumber: rows[0].sequenceNumber,
          currentHash: rows[0].currentHash,
        };
        if (runner === db) this.lastStatesByTenant.set(tenantId, head);
        return head;
      }
    } catch {
      // Return genesis if table or records not yet initialized
    }

    const genesis = { sequenceNumber: 0, currentHash: GENESIS_PREV_HASH };
    if (runner === db) this.lastStatesByTenant.set(tenantId, genesis);
    return genesis;
  }

  /**
   * Backward-compatible alias for getLastHead returning only hash
   */
  async getLastHash(tenantId: string): Promise<string> {
    const head = await this.getLastHead(tenantId);
    return head.currentHash;
  }

  setLastHash(tenantId: string, hash: string) {
    const current = this.lastStatesByTenant.get(tenantId) || { sequenceNumber: 0, currentHash: hash };
    this.lastStatesByTenant.set(tenantId, { ...current, currentHash: hash });
  }

  /**
   * Enqueues or synchronously commits an audit log entry.
   * If a transaction handle `tx` is provided, executes synchronously through `tx` (Invariant B).
   */
  async log(
    params: {
      tenantId?: string;
      userId?: string | null;
      action: string;
      entityType: string;
      entityId?: string | null;
      payload?: any;
      ipAddress?: string | null;
      userAgent?: string | null;
      timestamp?: string;
    },
    tx?: any
  ): Promise<AuditEntry & { sequenceNumber: number; signature: string }> {
    const tenantId = params.tenantId || "default";
    const timestamp = params.timestamp || new Date().toISOString();
    const id = `aud_${crypto.randomUUID()}`;
    const nonce = "0";

    if (tx) {
      // Transactional write: query latest sequence head strictly inside tx
      const lastHead = await this.getLastHead(tenantId, tx);
      const sequenceNumber = lastHead.sequenceNumber + 1;
      const previousHash = lastHead.currentHash;

      const canonicalPayloadJSON = canonicalizePayload(params.payload);
      const currentHash = computeAuditBlockHash({
        sequenceNumber,
        previousHash,
        tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        canonicalPayloadJSON,
        timestamp,
      });

      const signature = computeAuditHmac(currentHash);

      await tx.insert(auditLogs).values({
        id,
        tenantId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        payload: canonicalPayloadJSON,
        sequenceNumber,
        previousHash,
        currentHash,
        signature,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        timestamp,
      });

      // Clear in-memory cache to force next non-tx query to refresh
      this.lastStatesByTenant.delete(tenantId);

      return {
        id,
        tenantId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        payload: params.payload,
        sequenceNumber,
        previousHash,
        currentHash,
        signature,
        timestamp,
        nonce,
      };
    }

    // Queued non-transactional log execution serialized by tenant mutex chain
    const prevLock = this.tenantLogChains.get(tenantId) || Promise.resolve();
    const currentLock = prevLock.then(async () => {
      return this._executeLog(params);
    });

    this.tenantLogChains.set(tenantId, currentLock.catch(() => {}));
    return currentLock;
  }

  private async _executeLog(params: {
    tenantId?: string;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
    timestamp?: string;
  }): Promise<AuditEntry & { sequenceNumber: number; signature: string }> {
    const tenantId = params.tenantId || "default";
    const timestamp = params.timestamp || new Date().toISOString();
    const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const nonce = "0";

    const lastHead = await this.getLastHead(tenantId, db);
    const sequenceNumber = lastHead.sequenceNumber + 1;
    const previousHash = lastHead.currentHash;

    const canonicalPayloadJSON = canonicalizePayload(params.payload);
    const currentHash = computeAuditBlockHash({
      sequenceNumber,
      previousHash,
      tenantId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      canonicalPayloadJSON,
      timestamp,
    });

    const signature = computeAuditHmac(currentHash);

    // Update in-memory state head
    this.lastStatesByTenant.set(tenantId, { sequenceNumber, currentHash });

    const queuedItem: QueuedAuditItem = {
      id,
      tenantId,
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      payload: params.payload,
      canonicalPayloadJSON,
      sequenceNumber,
      previousHash,
      currentHash,
      signature,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      timestamp,
      nonce,
    };

    this.queue.push(queuedItem);

    if (this.queue.length >= this.batchSize) {
      this.flush().catch((err) => {
        console.error("[@thaiba/audit] Batch threshold flush failed:", err);
      });
    }

    return {
      id,
      tenantId,
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      payload: params.payload,
      sequenceNumber,
      previousHash,
      currentHash,
      signature,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      timestamp,
      nonce,
    };
  }

  /**
   * Flushes currently queued audit entries, persisting records and batch Merkle roots
   */
  async flush(): Promise<number> {
    if (this.isFlushing || this.queue.length === 0) return 0;
    this.isFlushing = true;

    const itemsToProcess = [...this.queue];
    this.queue = [];

    try {
      // 1. Group items by tenantId
      const tenantBatches: Record<string, QueuedAuditItem[]> = {};
      for (const item of itemsToProcess) {
        if (!tenantBatches[item.tenantId]) {
          tenantBatches[item.tenantId] = [];
        }
        tenantBatches[item.tenantId].push(item);
      }

      // 2. Process each tenant's batch separately
      for (const [tenantId, batchItems] of Object.entries(tenantBatches)) {
        for (const item of batchItems) {
          await db.insert(auditLogs).values({
            id: item.id,
            tenantId: item.tenantId,
            userId: item.userId,
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId,
            payload: item.canonicalPayloadJSON,
            sequenceNumber: item.sequenceNumber,
            previousHash: item.previousHash,
            currentHash: item.currentHash,
            signature: item.signature,
            ipAddress: item.ipAddress,
            userAgent: item.userAgent,
            timestamp: item.timestamp,
          });
        }

        // Build RFC 6962 Merkle Root for the batch
        const blockHashes = batchItems.map((i) => i.currentHash);
        const rootHash = computeMerkleRoot(blockHashes);
        const rootId = `mrk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

        await db.insert(auditMerkleRoots).values({
          id: rootId,
          tenantId,
          rootHash,
          startAuditId: batchItems[0].id,
          endAuditId: batchItems[batchItems.length - 1].id,
          leafCount: batchItems.length,
          treeDepth: Math.ceil(Math.log2(batchItems.length)) + 1,
          createdAt: new Date().toISOString(),
        });
      }
      return itemsToProcess.length;
    } catch (err) {
      console.error("[@thaiba/audit] Flush error, re-queueing items:", err);
      this.queue = [...itemsToProcess, ...this.queue];
      return 0;
    } finally {
      this.isFlushing = false;
    }
  }
}

export const cryptoAuditWriter = new CryptographicAuditWriter();
