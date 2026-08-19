/**
 * Dual-Store Database Persistence for Quarantines and Allowlists
 * Sprint-039 / TIF-002 & TIF-003 (TD-013)
 */

import { db } from "@/db";
import { ipQuarantines, ipAllowlist } from "@thaiba/db";
import { eq, and, sql } from "drizzle-orm";
import { QuarantineRecord, AllowlistRecord } from "./quarantine-store";
import { GatewayMetricsTracker } from "./gateway-metrics";

export class QuarantineDbStore {
  private static instance: QuarantineDbStore | null = null;
  private isEnabled: boolean = true;

  public static getInstance(): QuarantineDbStore {
    if (!QuarantineDbStore.instance) {
      QuarantineDbStore.instance = new QuarantineDbStore();
    }
    return QuarantineDbStore.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Persists a quarantine record to the database asynchronously.
   */
  public async saveQuarantine(record: QuarantineRecord): Promise<boolean> {
    if (!this.isEnabled) return false;

    const startTime = Date.now();
    try {
      const isSubnet = record.cidrMask === "/24" || (record as any).isSubnet || false;

      await db.insert(ipQuarantines).values({
        id: record.id,
        tenantId: record.tenantId || "default",
        ipAddress: record.ipAddress,
        cidrMask: record.cidrMask || "/32",
        isSubnet: isSubnet ? true : false,
        reason: record.reason,
        threatScore: record.threatScore ?? 100,
        bannedBy: record.bannedBy || "system",
        expiresAt: new Date(record.expiresAt).toISOString(),
        isActive: record.isActive ? true : false,
        createdAt: new Date(record.createdAt).toISOString(),
      }).onConflictDoUpdate({
        target: ipQuarantines.id,
        set: {
          isActive: record.isActive ? true : false,
          isSubnet: isSubnet ? true : false,
          expiresAt: new Date(record.expiresAt).toISOString(),
          reason: record.reason,
          threatScore: record.threatScore ?? 100,
        },
      });

      const durationSec = (Date.now() - startTime) / 1000;
      GatewayMetricsTracker.getInstance().recordDbSyncDuration(durationSec);
      return true;
    } catch {
      // Non-blocking resilience
      return false;
    }
  }

  /**
   * Removes or deactivates a quarantine record from the database.
   */
  public async removeQuarantine(idOrIp: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    const startTime = Date.now();
    try {
      // Deactivate matching ID or IP address
      await db.update(ipQuarantines)
        .set({ isActive: false })
        .where(
          and(
            eq(ipQuarantines.isActive, true),
            sql`(${ipQuarantines.id} = ${idOrIp} OR ${ipQuarantines.ipAddress} = ${idOrIp})`
          )
        );

      const durationSec = (Date.now() - startTime) / 1000;
      GatewayMetricsTracker.getInstance().recordDbSyncDuration(durationSec);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Persists an allowlist record to the database.
   */
  public async saveAllowlist(record: AllowlistRecord): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await db.insert(ipAllowlist).values({
        id: record.id,
        tenantId: record.tenantId || "default",
        ipAddress: record.ipAddress,
        description: record.description || null,
        addedBy: record.addedBy || "admin",
        createdAt: new Date(record.createdAt).toISOString(),
      }).onConflictDoNothing();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Removes an IP from the allowlist table.
   */
  public async removeAllowlist(ipAddress: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await db.delete(ipAllowlist).where(eq(ipAllowlist.ipAddress, ipAddress));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Loads all active, non-expired quarantines from the database for cold-start memory cache warming.
   */
  public async loadActiveQuarantines(nowMs: number = Date.now()): Promise<QuarantineRecord[]> {
    if (!this.isEnabled) return [];

    try {
      const nowIso = new Date(nowMs).toISOString();
      const rows = await db.select().from(ipQuarantines).where(
        and(
          eq(ipQuarantines.isActive, true),
          sql`${ipQuarantines.expiresAt} > ${nowIso}`
        )
      );

      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        ipAddress: r.ipAddress,
        cidrMask: r.cidrMask || "/32",
        isSubnet: Boolean(r.isSubnet),
        reason: r.reason,
        threatScore: r.threatScore,
        bannedBy: r.bannedBy,
        expiresAt: new Date(r.expiresAt).getTime(),
        isActive: Boolean(r.isActive),
        createdAt: new Date(r.createdAt).getTime(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Loads all allowlist records from the database.
   */
  public async loadActiveAllowlist(): Promise<AllowlistRecord[]> {
    if (!this.isEnabled) return [];

    try {
      const rows = await db.select().from(ipAllowlist);
      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        ipAddress: r.ipAddress,
        description: r.description || undefined,
        addedBy: r.addedBy,
        createdAt: new Date(r.createdAt).getTime(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Prunes expired records from the database.
   */
  public async pruneExpired(nowMs: number = Date.now()): Promise<number> {
    if (!this.isEnabled) return 0;

    try {
      const nowIso = new Date(nowMs).toISOString();
      await db.update(ipQuarantines)
        .set({ isActive: false })
        .where(
          and(
            eq(ipQuarantines.isActive, true),
            sql`${ipQuarantines.expiresAt} <= ${nowIso}`
          )
        );
      return 1;
    } catch {
      return 0;
    }
  }
}
