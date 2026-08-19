import { db } from "@/db";
import { forensicSnapshots } from "@thaiba/db/schema";
import { eq, lt } from "drizzle-orm";
import { RetentionTier } from "./types";
import { snapshotStorageManager } from "./snapshot-storage";

export interface RetentionPolicyConfig {
  hotDays: number;
  warmDays: number;
  coldDays: number;
}

export const DEFAULT_RETENTION_CONFIG: RetentionPolicyConfig = {
  hotDays: 30,
  warmDays: 90,
  coldDays: 365,
};

export class RetentionPolicyEngine {
  private config: RetentionPolicyConfig;

  constructor(config?: Partial<RetentionPolicyConfig>) {
    this.config = { ...DEFAULT_RETENTION_CONFIG, ...config };
  }

  /**
   * Evaluates the appropriate retention tier or deletion recommendation for a given timestamp
   */
  evaluateRetention(
    snapshotDate: Date,
    now: Date = new Date()
  ): { tier: RetentionTier; shouldDelete: boolean } {
    const ageDays = (now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays <= this.config.hotDays) {
      return { tier: "HOT", shouldDelete: false };
    }
    if (ageDays <= this.config.warmDays) {
      return { tier: "WARM", shouldDelete: false };
    }
    if (ageDays <= this.config.coldDays) {
      return { tier: "COLD", shouldDelete: false };
    }
    return { tier: "COLD", shouldDelete: true };
  }

  /**
   * Applies the retention lifecycle to all recorded snapshots
   */
  async applyRetentionPolicy(dryRun = false): Promise<{
    hotCount: number;
    warmCount: number;
    coldCount: number;
    prunedCount: number;
  }> {
    let hotCount = 0;
    let warmCount = 0;
    let coldCount = 0;
    let prunedCount = 0;

    const now = new Date();

    try {
      const records = await db.select().from(forensicSnapshots);

      for (const record of records) {
        const createdAt = new Date(record.createdAt);
        const { tier, shouldDelete } = this.evaluateRetention(createdAt, now);

        if (shouldDelete) {
          prunedCount++;
          if (!dryRun) {
            await snapshotStorageManager.delete(record.storageUri);
            await db
              .update(forensicSnapshots)
              .set({ status: "ARCHIVED" })
              .where(eq(forensicSnapshots.id, record.id));
          }
        } else {
          if (tier === "HOT") hotCount++;
          else if (tier === "WARM") warmCount++;
          else if (tier === "COLD") coldCount++;

          if (!dryRun && record.retentionTier !== tier) {
            await db
              .update(forensicSnapshots)
              .set({ retentionTier: tier })
              .where(eq(forensicSnapshots.id, record.id));
          }
        }
      }
    } catch (e) {
      console.warn("[@thaiba/compliance] Retention policy DB execution warning:", e);
    }

    return { hotCount, warmCount, coldCount, prunedCount };
  }
}

export const retentionPolicyEngine = new RetentionPolicyEngine();
