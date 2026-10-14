/**
 * SIS Sync Run Engine
 *
 * Orchestrates resumable, idempotent sync executions (dry_run | full | delta).
 * Enforces strict single-flight run concurrency per connector:
 * if a run is already active ('running'), concurrent requests receive 409 Conflict with Retry-After.
 */

import { db } from "@/db";
import { sisSyncRuns, sisConnectors } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { ConnectorRegistry } from "./connector-registry";
import { getSisAdapter } from "./adapters";
import { RecordMapper } from "./record-mapper";
import type { SisSyncTriggerInput } from "@/lib/validation/schemas";

export class ConnectorRunConflictError extends Error {
  public readonly retryAfterSeconds: number;
  public readonly activeRunId: string;

  constructor(message: string, activeRunId: string, retryAfterSeconds = 60) {
    super(message);
    this.name = "ConnectorRunConflictError";
    this.activeRunId = activeRunId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface SisSyncRunRecord {
  id: string;
  institutionId: string;
  connectorId: string;
  mode: "dry_run" | "full" | "delta";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  checkpointJson: string | null;
  readCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errorSummary: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const inMemoryRuns = new Map<string, SisSyncRunRecord>();

export class SyncRunEngine {
  private static useMemory = false;

  public static setUseMemory(enabled: boolean): void {
    this.useMemory = enabled;
  }

  public static clearMemory(): void {
    inMemoryRuns.clear();
  }

  /**
   * Triggers a new sync run for a connector.
   * Enforces Gate 17: exactly one live run per connector. Throws ConnectorRunConflictError if busy.
   */
  public static async triggerRun(
    institutionId: string,
    connectorId: string,
    input: SisSyncTriggerInput
  ): Promise<SisSyncRunRecord> {
    const connector = await ConnectorRegistry.getConnector(institutionId, connectorId);
    if (!connector) {
      throw new Error(`Connector '${connectorId}' not found for institution '${institutionId}'`);
    }

    if (!connector.enabled) {
      throw new Error(`Connector '${connectorId}' is disabled.`);
    }

    // Check for existing running execution (Gate 17 concurrency guard)
    const activeRun = await this.getActiveRunForConnector(connectorId);
    if (activeRun) {
      throw new ConnectorRunConflictError(
        `A sync run is already in progress for connector '${connectorId}'.`,
        activeRun.id,
        60
      );
    }

    const now = new Date().toISOString();
    const id = `sisr_${randomUUID()}`;

    const newRun: SisSyncRunRecord = {
      id,
      institutionId,
      connectorId,
      mode: input.mode || "full",
      status: "running",
      checkpointJson: input.checkpoint || null,
      readCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errorSummary: null,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryRuns.set(id, newRun);
      // Update connector lastSyncAt
      await ConnectorRegistry.updateConnector(institutionId, connectorId, {});
      return newRun;
    }

    try {
      await db.insert(sisSyncRuns).values({
        id: newRun.id,
        institutionId: newRun.institutionId,
        connectorId: newRun.connectorId,
        mode: newRun.mode,
        status: newRun.status,
        checkpointJson: newRun.checkpointJson,
        readCount: newRun.readCount,
        createdCount: newRun.createdCount,
        updatedCount: newRun.updatedCount,
        skippedCount: newRun.skippedCount,
        failedCount: newRun.failedCount,
        errorSummary: newRun.errorSummary,
        startedAt: sql`(current_timestamp)`,
        createdAt: sql`(current_timestamp)`,
        updatedAt: sql`(current_timestamp)`,
      });

      // Update connector lastSyncAt in DB
      await db
        .update(sisConnectors)
        .set({
          lastSyncAt: sql`(current_timestamp)`,
          updatedAt: sql`(current_timestamp)`,
        })
        .where(eq(sisConnectors.id, connectorId));

      return newRun;
    } catch {
      inMemoryRuns.set(id, newRun);
      return newRun;
    }
  }

  /**
   * Retrieves an active 'running' run for a connector, if any.
   */
  public static async getActiveRunForConnector(
    connectorId: string
  ): Promise<SisSyncRunRecord | null> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      for (const run of inMemoryRuns.values()) {
        if (run.connectorId === connectorId && run.status === "running") {
          return run;
        }
      }
      return null;
    }

    try {
      const rows = await db
        .select()
        .from(sisSyncRuns)
        .where(and(eq(sisSyncRuns.connectorId, connectorId), eq(sisSyncRuns.status, "running")))
        .limit(1);

      if (rows.length === 0) return null;
      return rows[0] as SisSyncRunRecord;
    } catch {
      for (const run of inMemoryRuns.values()) {
        if (run.connectorId === connectorId && run.status === "running") {
          return run;
        }
      }
      return null;
    }
  }

  /**
   * Retrieves a run record scoped to an institution.
   */
  public static async getRun(
    institutionId: string,
    runId: string
  ): Promise<SisSyncRunRecord | null> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      const found = inMemoryRuns.get(runId);
      if (found && found.institutionId === institutionId) {
        return found;
      }
      return null;
    }

    try {
      const rows = await db
        .select()
        .from(sisSyncRuns)
        .where(and(eq(sisSyncRuns.id, runId), eq(sisSyncRuns.institutionId, institutionId)))
        .limit(1);

      if (rows.length === 0) return null;
      return rows[0] as SisSyncRunRecord;
    } catch {
      const found = inMemoryRuns.get(runId);
      if (found && found.institutionId === institutionId) {
        return found;
      }
      return null;
    }
  }

  /**
   * Lists sync runs for an institution, optionally filtered by connector.
   */
  public static async listRuns(
    institutionId: string,
    connectorId?: string
  ): Promise<SisSyncRunRecord[]> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return Array.from(inMemoryRuns.values())
        .filter((r) => r.institutionId === institutionId && (!connectorId || r.connectorId === connectorId))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    }

    try {
      const query = db
        .select()
        .from(sisSyncRuns)
        .where(
          connectorId
            ? and(eq(sisSyncRuns.institutionId, institutionId), eq(sisSyncRuns.connectorId, connectorId))
            : eq(sisSyncRuns.institutionId, institutionId)
        )
        .orderBy(desc(sisSyncRuns.startedAt));

      const rows = await query;
      return rows as SisSyncRunRecord[];
    } catch {
      return Array.from(inMemoryRuns.values())
        .filter((r) => r.institutionId === institutionId && (!connectorId || r.connectorId === connectorId))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    }
  }

  /**
   * Completes a run with status 'completed' and final execution metrics.
   */
  public static async completeRun(
    institutionId: string,
    runId: string,
    counts: {
      readCount: number;
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
      failedCount: number;
      checkpointJson?: string | null;
    }
  ): Promise<SisSyncRunRecord | null> {
    const existing = await this.getRun(institutionId, runId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: SisSyncRunRecord = {
      ...existing,
      status: "completed",
      readCount: counts.readCount,
      createdCount: counts.createdCount,
      updatedCount: counts.updatedCount,
      skippedCount: counts.skippedCount,
      failedCount: counts.failedCount,
      checkpointJson: counts.checkpointJson !== undefined ? counts.checkpointJson : existing.checkpointJson,
      finishedAt: now,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryRuns.set(runId, updated);
      return updated;
    }

    try {
      await db
        .update(sisSyncRuns)
        .set({
          status: updated.status,
          readCount: updated.readCount,
          createdCount: updated.createdCount,
          updatedCount: updated.updatedCount,
          skippedCount: updated.skippedCount,
          failedCount: updated.failedCount,
          checkpointJson: updated.checkpointJson,
          finishedAt: sql`(current_timestamp)`,
          updatedAt: sql`(current_timestamp)`,
        })
        .where(and(eq(sisSyncRuns.id, runId), eq(sisSyncRuns.institutionId, institutionId)));

      return updated;
    } catch {
      inMemoryRuns.set(runId, updated);
      return updated;
    }
  }

  /**
   * Fails a run with status 'failed' and an error summary.
   */
  public static async failRun(
    institutionId: string,
    runId: string,
    errorSummary: string
  ): Promise<SisSyncRunRecord | null> {
    const existing = await this.getRun(institutionId, runId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: SisSyncRunRecord = {
      ...existing,
      status: "failed",
      errorSummary,
      finishedAt: now,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryRuns.set(runId, updated);
      return updated;
    }

    try {
      await db
        .update(sisSyncRuns)
        .set({
          status: updated.status,
          errorSummary: updated.errorSummary,
          finishedAt: sql`(current_timestamp)`,
          updatedAt: sql`(current_timestamp)`,
        })
        .where(and(eq(sisSyncRuns.id, runId), eq(sisSyncRuns.institutionId, institutionId)));

      return updated;
    } catch {
      inMemoryRuns.set(runId, updated);
      return updated;
    }
  }

  /**
   * Executes a sync run through its registered adapter and record mapper.
   */
  public static async executeSync(
    institutionId: string,
    runId: string
  ): Promise<SisSyncRunRecord> {
    const run = await this.getRun(institutionId, runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    const connector = await ConnectorRegistry.getConnector(institutionId, run.connectorId);
    if (!connector) throw new Error(`Connector not found: ${run.connectorId}`);

    try {
      const adapter = getSisAdapter(connector.standard);
      const result = await adapter.sync(connector, {
        mode: run.mode as any,
        checkpoint: run.checkpointJson,
      });

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const rec of result.records) {
        try {
          const outcome = await RecordMapper.processRecord(
            institutionId,
            connector.id,
            rec,
            run.id
          );
          if (outcome.action === "create") createdCount++;
          else if (outcome.action === "update") updatedCount++;
          else if (outcome.action === "skip") skippedCount++;
          else failedCount++;
        } catch {
          failedCount++;
        }
      }

      const completed = await this.completeRun(institutionId, run.id, {
        readCount: result.records.length,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        checkpointJson: result.nextCheckpoint,
      });

      return completed!;
    } catch (err: any) {
      await this.failRun(institutionId, run.id, err.message || "Sync execution failed");
      throw err;
    }
  }
}

