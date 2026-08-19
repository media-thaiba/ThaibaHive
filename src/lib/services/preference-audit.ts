import { db } from "@/db";
import { preferenceAuditLog } from "@thaiba/db/schema";
import { eq, sql, lt } from "drizzle-orm";
import crypto from "crypto";

export class PreferenceAuditService {
  /**
   * Logs a user personalization preference update event asynchronously.
   * Runs in the background (non-blocking) to ensure sub-second response latency.
   */
  static logPreferenceChange(
    userId: string,
    preferenceKey: string,
    oldValue: string | null,
    newValue: string,
    institutionId: string | null,
    ipAddress: string | null
  ): void {
    const id = crypto.randomUUID();

    db.insert(preferenceAuditLog)
      .values({
        id,
        userId,
        preferenceKey,
        oldValue,
        newValue,
        institutionId,
        ipAddress,
        timestamp: new Date().toISOString(),
      })
      .run()
      .then(() => {
        console.log(`[PreferenceAuditService] Preference logged successfully: id=${id}, user=${userId}, key=${preferenceKey}`);
      })
      .catch((err) => {
        console.error("[PreferenceAuditService] Failed to log preference change asynchronously:", err);
      });
  }

  /**
   * Maintenance routine that deletes audit logs older than a specific retention period (default: 90 days).
   */
  static async pruneOldAuditLogs(retentionDays = 90): Promise<number> {
    try {
      const thresholdTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const deleteResult = await db
        .delete(preferenceAuditLog)
        .where(lt(preferenceAuditLog.timestamp, thresholdTime))
        .run();

      const affected = (deleteResult as any).rowsAffected ?? (deleteResult as any).changes ?? 0;
      console.log(`[PreferenceAuditService] Pruned ${affected} audit logs older than ${thresholdTime}`);
      return affected;
    } catch (err) {
      console.error("[PreferenceAuditService] Failed to prune old audit logs:", err);
      throw err;
    }
  }

  /**
   * Retrieves personalization audit logs. Restricted strictly to users holding the 'super_admin' role.
   */
  static async getAuditLogs(
    userRole: string,
    institutionId: string | null = null,
    limitCount = 100
  ): Promise<any[]> {
    if (userRole !== "super_admin") {
      throw new Error("Unauthorized: Access restricted to super_admin operators only.");
    }

    try {
      const query = db
        .select()
        .from(preferenceAuditLog)
        .orderBy(sql`${preferenceAuditLog.timestamp} DESC`)
        .limit(limitCount);

      if (institutionId) {
        return await query.where(eq(preferenceAuditLog.institutionId, institutionId)).all();
      }

      return await query.all();
    } catch (err) {
      console.error("[PreferenceAuditService] Failed to retrieve preference audit logs:", err);
      throw err;
    }
  }
}
