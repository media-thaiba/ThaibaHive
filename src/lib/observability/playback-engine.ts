import { db } from "../../db";
import { swarmEvents, swarmMetrics } from "../../db/schema";
import { and, gte, lte } from "drizzle-orm";

export interface PlaybackEvent {
  type: "event" | "metric";
  timestamp: string;
  data: any;
}

export class PlaybackEngine {
  async getEventsInRange(startTime: string, endTime: string): Promise<PlaybackEvent[]> {
    try {
      const [events, metrics] = await Promise.all([
        db
          .select()
          .from(swarmEvents)
          .where(and(gte(swarmEvents.timestamp, startTime), lte(swarmEvents.timestamp, endTime)))
          .all(),
        db
          .select()
          .from(swarmMetrics)
          .where(and(gte(swarmMetrics.timestamp, startTime), lte(swarmMetrics.timestamp, endTime)))
          .all(),
      ]);

      const formattedEvents: PlaybackEvent[] = events.map((e) => ({
        type: "event",
        timestamp: e.timestamp,
        data: e,
      }));

      const formattedMetrics: PlaybackEvent[] = metrics.map((m) => ({
        type: "metric",
        timestamp: m.timestamp,
        data: m,
      }));

      return [...formattedEvents, ...formattedMetrics].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (err) {
      console.error("[PlaybackEngine] Failed to fetch events:", err);
      return [];
    }
  }
}
