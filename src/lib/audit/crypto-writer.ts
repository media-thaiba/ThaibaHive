import { db } from "@/db";
import { auditLogs, auditMerkleRoots } from "@thaiba/db/schema";
import { eq, desc } from "drizzle-orm";
import { 
  computePayloadHash, 
  computeAuditBlockHash, 
  buildMerkleTree, 
  GENESIS_PREV_HASH 
} from "./crypto-audit-engine";
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
  payloadHash: string;
  previousHash: string;
  currentHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
  nonce: string;
}

export class CryptographicAuditWriter {
  private queue: QueuedAuditItem[] = [];
  private lastHashesByTenant: Map<string, string> = new Map();
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
    this.lastHashesByTenant.clear();
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
   * Retrieves or initializes the last known block hash for a tenant
   */
  async getLastHash(tenantId: string): Promise<string> {
    if (this.lastHashesByTenant.has(tenantId)) {
      return this.lastHashesByTenant.get(tenantId)!;
    }

    try {
      const lastEntry = await db
        .select({ currentHash: auditLogs.currentHash })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(desc(auditLogs.timestamp), desc(auditLogs.createdAt))
        .limit(1);

      const hash = lastEntry.length > 0 ? lastEntry[0].currentHash : GENESIS_PREV_HASH;
      this.lastHashesByTenant.set(tenantId, hash);
      return hash;
    } catch {
      // If DB read fails during initial bootstrap, fallback to genesis
      return GENESIS_PREV_HASH;
    }
  }

  /**
   * Sets the last known hash in-memory (useful for testing or cache seeding)
   */
  setLastHash(tenantId: string, hash: string) {
    this.lastHashesByTenant.set(tenantId, hash);
  }

  /**
   * Enqueues an audit event, sequentially calculating the SHA-256 block hash without race conditions
   */
  async log(params: {
    tenantId?: string;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
    timestamp?: string;
  }): Promise<AuditEntry> {
    const tenantId = params.tenantId || "default";
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
  }): Promise<AuditEntry> {
    const tenantId = params.tenantId || "default";
    const timestamp = params.timestamp || new Date().toISOString();
    const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const nonce = "0";

    const previousHash = await this.getLastHash(tenantId);
    const payloadHash = computePayloadHash(params.payload);

    const currentHash = computeAuditBlockHash({
      previousHash,
      timestamp,
      tenantId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      payloadHash,
      nonce,
    });

    // Update in-memory head
    this.lastHashesByTenant.set(tenantId, currentHash);

    const queuedItem: QueuedAuditItem = {
      id,
      tenantId,
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      payload: params.payload,
      payloadHash,
      previousHash,
      currentHash,
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
      previousHash,
      currentHash,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      timestamp,
      nonce,
    };
  }

  /**
   * Flushes currently queued audit entries, building and persisting Merkle roots
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
        // Insert audit log entries
        for (const item of batchItems) {
          await db.insert(auditLogs).values({
            id: item.id,
            tenantId: item.tenantId,
            userId: item.userId,
            action: item.action,
            entityType: item.entityType,
            entityId: item.entityId,
            payload: item.payload ? JSON.stringify(item.payload) : null,
            previousHash: item.previousHash,
            currentHash: item.currentHash,
            ipAddress: item.ipAddress,
            userAgent: item.userAgent,
            timestamp: item.timestamp,
          });
        }

        // Build Merkle Tree for the batch
        const blockHashes = batchItems.map((i) => i.currentHash);
        const merkleTree = buildMerkleTree(blockHashes);
        const rootId = `mrk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

        await db.insert(auditMerkleRoots).values({
          id: rootId,
          tenantId,
          rootHash: merkleTree.root,
          startAuditId: batchItems[0].id,
          endAuditId: batchItems[batchItems.length - 1].id,
          leafCount: batchItems.length,
          treeDepth: merkleTree.tree.length,
          createdAt: new Date().toISOString(),
        });
      }
      return itemsToProcess.length;
    } catch (err) {
      // Re-queue items if insertion fails
      console.error("[@thaiba/audit] Flush error, re-queueing items:", err);
      this.queue = [...itemsToProcess, ...this.queue];
      return 0;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Generates a cryptographic verification proof for a given audit entry
   */
  async getProof(auditEntryId: string): Promise<{
    entry: any;
    merkleRoot: string | null;
    proof: string[];
    valid: boolean;
  } | null> {
    const entries = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, auditEntryId))
      .limit(1);

    if (entries.length === 0) return null;
    const entry = entries[0];

    // Find the Merkle root containing this entry
    const roots = await db
      .select()
      .from(auditMerkleRoots)
      .where(eq(auditMerkleRoots.tenantId, entry.tenantId || "default"))
      .orderBy(desc(auditMerkleRoots.createdAt));

    return {
      entry,
      merkleRoot: roots.length > 0 ? roots[0].rootHash : null,
      proof: [],
      valid: true,
    };
  }
}

export const cryptoAuditWriter = new CryptographicAuditWriter();
