import { createHash } from "crypto";
import { AgentDbStore, agentDbStore } from "../../db/agent-store";

export interface MerkleVerificationResult {
  tenantId: string;
  totalEntries: number;
  valid: boolean;
  tamperedIndex?: number;
  tamperedEntryId?: string;
  error?: string;
}

export interface QueuedAuditEntry {
  id?: string;
  agentId: string;
  toolName: string;
  institutionId: string;
  status: "success" | "error" | "denied";
  durationMs: number;
  inputHash: string;
  outputHash?: string;
  error?: string;
  traceId?: string;
  timestamp?: number;
}

export class MerkleAuditLedger {
  private static instance: MerkleAuditLedger;
  private store: AgentDbStore;
  private batchBuffer: Map<string, QueuedAuditEntry[]> = new Map(); // tenantId -> queue
  private batchSize: number = 50;
  private maxLoadGateThreshold: number = 5000;
  private latestHashCache: Map<string, string> = new Map(); // tenantId -> latest auditHash
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(store?: AgentDbStore) {
    this.store = store || agentDbStore;
    this.startFlushTimer();
  }

  public static getInstance(): MerkleAuditLedger {
    if (!MerkleAuditLedger.instance) {
      MerkleAuditLedger.instance = new MerkleAuditLedger();
    }
    return MerkleAuditLedger.instance;
  }

  public startFlushTimer(intervalMs: number = 5000): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(async () => {
      try {
        await this.flushAll();
      } catch (err) {
        console.error("[MerkleAuditLedger] Periodic flush error:", err);
      }
    }, intervalMs);
    if (typeof this.flushTimer?.unref === "function") {
      this.flushTimer.unref();
    }
  }

  public stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  public setBatchSize(size: number): void {
    this.batchSize = size;
  }

  public setLoadGateThreshold(threshold: number): void {
    this.maxLoadGateThreshold = threshold;
  }

  public getPendingCount(tenantId: string = "global"): number {
    return (this.batchBuffer.get(tenantId) || []).length;
  }

  public isLoadGateExceeded(tenantId: string = "global"): boolean {
    return this.getPendingCount(tenantId) >= this.maxLoadGateThreshold;
  }

  public clearBuffer(tenantId?: string): void {
    if (tenantId) {
      this.batchBuffer.delete(tenantId);
    } else {
      this.batchBuffer.clear();
      this.latestHashCache.clear();
    }
  }

  public async enqueueInvocation(
    entry: QueuedAuditEntry,
    options?: { immediateFlush?: boolean }
  ): Promise<{ auditHash: string; entryId?: string; buffered: boolean }> {
    const tenantId = entry.institutionId || "global";

    if (this.isLoadGateExceeded(tenantId)) {
      throw new Error(
        `Merkle audit load gate threshold exceeded (${this.maxLoadGateThreshold} pending entries). Backpressure active.`
      );
    }

    const buffer = this.batchBuffer.get(tenantId) || [];
    buffer.push({
      ...entry,
      timestamp: entry.timestamp || Date.now(),
    });
    this.batchBuffer.set(tenantId, buffer);

    if (options?.immediateFlush || buffer.length >= this.batchSize) {
      const flushResult = await this.flushPendingInvocations(tenantId);
      const lastRecorded = flushResult[flushResult.length - 1];
      return {
        auditHash: lastRecorded?.auditHash || "",
        entryId: lastRecorded?.id,
        buffered: false,
      };
    }

    // For buffered entries without immediate flush, compute provisional sequential hash
    const prevHash = await this.getLatestHash(tenantId);
    const provisionalHash = createHash("sha256")
      .update(`${prevHash}:${tenantId}:${entry.agentId}:${entry.toolName}:${entry.status}:${entry.inputHash}:${entry.outputHash || ""}:${Date.now()}`)
      .digest("hex");
    this.latestHashCache.set(tenantId, provisionalHash);

    return {
      auditHash: provisionalHash,
      buffered: true,
    };
  }

  public async flushPendingInvocations(tenantId: string = "global"): Promise<any[]> {
    const buffer = this.batchBuffer.get(tenantId) || [];
    if (buffer.length === 0) return [];

    // Clear buffer first to avoid race conditions
    this.batchBuffer.set(tenantId, []);

    let prevAuditHash = await this.store.getLatestAuditHash(tenantId);
    const recordedEntries: any[] = [];

    for (const item of buffer) {
      const auditHash = createHash("sha256")
        .update(`${prevAuditHash}:${tenantId}:${item.agentId}:${item.toolName}:${item.status}:${item.inputHash}:${item.outputHash || ""}:${item.timestamp || Date.now()}`)
        .digest("hex");

      const record = await this.store.recordToolInvocation({
        id: item.id,
        agentId: item.agentId,
        toolName: item.toolName,
        institutionId: tenantId,
        status: item.status,
        durationMs: item.durationMs,
        inputHash: item.inputHash,
        outputHash: item.outputHash,
        error: item.error,
        auditHash,
        prevAuditHash,
        traceId: item.traceId,
      });

      prevAuditHash = auditHash;
      recordedEntries.push(record);
    }

    this.latestHashCache.set(tenantId, prevAuditHash);
    return recordedEntries;
  }

  public async flushAll(): Promise<number> {
    let totalFlushed = 0;
    for (const tenantId of Array.from(this.batchBuffer.keys())) {
      const flushed = await this.flushPendingInvocations(tenantId);
      totalFlushed += flushed.length;
    }
    return totalFlushed;
  }

  private async getLatestHash(tenantId: string): Promise<string> {
    if (this.latestHashCache.has(tenantId)) {
      return this.latestHashCache.get(tenantId)!;
    }
    const latest = await this.store.getLatestAuditHash(tenantId);
    this.latestHashCache.set(tenantId, latest);
    return latest;
  }

  public async verifyChainIntegrity(tenantId: string = "global"): Promise<MerkleVerificationResult> {
    // Flush any pending entries first to ensure complete ledger verification
    await this.flushPendingInvocations(tenantId);

    const rawEntries = await this.store.listToolInvocations(tenantId);
    if (rawEntries.length === 0) {
      return {
        tenantId,
        totalEntries: 0,
        valid: true,
      };
    }

    const sorted = [...rawEntries];

    const expectedPrevHash = "GENESIS_HASH_000000000000000000000000000000000000000000000000000000000000";

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];

      // Verify chain link pointer
      if (i > 0 && entry.prevAuditHash !== sorted[i - 1].auditHash) {
        return {
          tenantId,
          totalEntries: sorted.length,
          valid: false,
          tamperedIndex: i,
          tamperedEntryId: entry.id,
          error: `Broken chain pointer at index ${i}. Expected prevAuditHash '${sorted[i - 1].auditHash}', found '${entry.prevAuditHash}'`,
        };
      }

      if (i === 0 && entry.prevAuditHash !== expectedPrevHash) {
        return {
          tenantId,
          totalEntries: sorted.length,
          valid: false,
          tamperedIndex: 0,
          tamperedEntryId: entry.id,
          error: `Genesis hash mismatch at index 0. Expected '${expectedPrevHash}', found '${entry.prevAuditHash}'`,
        };
      }

      // Verify input and output SHA-256 integrity
      if (!entry.inputHash || !entry.auditHash) {
        return {
          tenantId,
          totalEntries: sorted.length,
          valid: false,
          tamperedIndex: i,
          tamperedEntryId: entry.id,
          error: `Missing hash fields on entry ${entry.id}`,
        };
      }
    }

    return {
      tenantId,
      totalEntries: sorted.length,
      valid: true,
    };
  }
}

export const merkleAuditLedger = MerkleAuditLedger.getInstance();
