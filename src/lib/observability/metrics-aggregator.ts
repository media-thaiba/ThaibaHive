import { db } from "../../db";
import { swarmMetrics } from "../../db/schema";
import { and, gte, lte, sql } from "drizzle-orm";

export class MetricsAggregator {
  private static interval: NodeJS.Timeout | null = null;

  static start() {
    if (this.interval) return;
    // Run aggregation every 1 minute (including mobile sync diagnostics telemetry)
    this.interval = setInterval(() => {
      this.aggregate().catch((err) => console.error("[MetricsAggregator] Rollup error:", err));
    }, 60000);
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  static async aggregate() {
    const now = new Date();
    const oneMinuteAgoStr = new Date(now.getTime() - 60000).toISOString();
    const nowStr = now.toISOString();

    try {
      const rawResults = await db
        .select({
          nodeId: swarmMetrics.nodeId,
          metricName: swarmMetrics.metricName,
          avgValue: sql<number>`avg(${swarmMetrics.metricValue})`,
          count: sql<number>`count(${swarmMetrics.id})`,
        })
        .from(swarmMetrics)
        .where(
          and(
            gte(swarmMetrics.timestamp, oneMinuteAgoStr),
            lte(swarmMetrics.timestamp, nowStr),
            sql`${swarmMetrics.metricName} not like '%_avg_1m'`
          )
        )
        .groupBy(swarmMetrics.nodeId, swarmMetrics.metricName)
        .all();

      if (rawResults.length > 0) {
        const rollups = rawResults.map((r) => ({
          id: "roll_" + Math.random().toString(36).substring(2, 15),
          nodeId: r.nodeId,
          metricName: `${r.metricName}_avg_1m`,
          metricValue: Number(r.avgValue),
          timestamp: nowStr,
        }));

        await db.insert(swarmMetrics).values(rollups).run();
      }

      // Cleanup: delete raw metrics older than 1 hour to prevent DB growth
      const oneHourAgoStr = new Date(now.getTime() - 3600000).toISOString();
      await db
        .delete(swarmMetrics)
        .where(
          and(
            lte(swarmMetrics.timestamp, oneHourAgoStr),
            sql`${swarmMetrics.metricName} not like '%_avg_1m'`
          )
        )
        .run();
    } catch (err) {
      console.error("[MetricsAggregator] Aggregation failed:", err);
    }
  }
}
