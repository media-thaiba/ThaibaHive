import { db } from "@/db";
import { hardwareTelemetryLogs, hardwareDevices } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { HardwareTelemetryIngestInput } from "@/lib/validation/schemas";

export interface BufferedTelemetryItem {
  id: string;
  institutionId: string;
  deviceId: string;
  zoneId?: string | null;
  logType: string;
  rssi?: number | null;
  snr?: number | null;
  batteryLevel?: number | null;
  temperatureCelsius?: number | null;
  humidityPercent?: number | null;
  motionDetected?: boolean | null;
  firmwareVersion?: string | null;
  certificateExpiryDays?: number | null;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
  networkLatencyMs?: number | null;
  packetLossPercent?: number | null;
  coordinatesX?: number | null;
  coordinatesY?: number | null;
  coordinatesZ?: number | null;
  merkleRoot?: string | null;
  merkleProof?: string | null;
  metadataJson?: string | null;
  timestamp: string;
}

export class TelemetryIngestionWorker {
  private static buffer: BufferedTelemetryItem[] = [];
  private static beaconCache: Map<string, { rssi: number; timestamp: number; zoneId?: string }> = new Map();
  private static MAX_BUFFER_SIZE = 500;
  private static FLUSH_INTERVAL_MS = 1000;
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Ingest a telemetry packet with in-memory buffering & write-behind caching
   */
  static async ingestTelemetry(
    institutionId: string,
    input: HardwareTelemetryIngestInput
  ): Promise<{ id: string; buffered: boolean; totalBuffered: number }> {
    const id = `htl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = input.timestamp || new Date().toISOString();

    const item: BufferedTelemetryItem = {
      id,
      institutionId,
      deviceId: input.deviceId,
      zoneId: input.zoneId || null,
      logType: input.logType,
      rssi: input.rssi ?? null,
      snr: input.snr ?? null,
      batteryLevel: input.batteryLevel ?? null,
      temperatureCelsius: input.temperatureCelsius ?? null,
      humidityPercent: input.humidityPercent ?? null,
      motionDetected: input.motionDetected ?? null,
      firmwareVersion: input.firmwareVersion || null,
      certificateExpiryDays: input.certificateExpiryDays ?? null,
      cpuUsagePercent: input.cpuUsagePercent ?? null,
      memoryUsagePercent: input.memoryUsagePercent ?? null,
      networkLatencyMs: input.networkLatencyMs ?? null,
      packetLossPercent: input.packetLossPercent ?? null,
      coordinatesX: input.coordinatesX ?? null,
      coordinatesY: input.coordinatesY ?? null,
      coordinatesZ: input.coordinatesZ ?? null,
      merkleRoot: input.merkleRoot || null,
      merkleProof: input.merkleProof || null,
      metadataJson: input.metadataJson || null,
      timestamp: now,
    };

    // 1. If RSSI scan, update fast write-behind beacon cache
    if (input.logType === "rssi_scan" && input.rssi !== undefined) {
      const cacheKey = `${institutionId}:${input.deviceId}`;
      this.beaconCache.set(cacheKey, {
        rssi: input.rssi,
        timestamp: Date.now(),
        zoneId: input.zoneId,
      });
    }

    // 2. Enqueue in batch buffer
    this.buffer.push(item);

    // 3. Trigger immediate flush if buffer threshold exceeded
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      await this.flushBatch();
    }

    return {
      id,
      buffered: true,
      totalBuffered: this.buffer.length,
    };
  }

  /**
   * Flush in-memory buffer to persistent database table
   */
  static async flushBatch(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      // Chunk inserts in batches of 100 for high-performance multi-row bulk SQL writes
      const chunkSize = 100;
      for (let i = 0; i < itemsToFlush.length; i += chunkSize) {
        const chunk = itemsToFlush.slice(i, i + chunkSize);
        const rows = chunk.map((log) => ({
          id: log.id,
          institutionId: log.institutionId,
          deviceId: log.deviceId,
          zoneId: log.zoneId ?? null,
          logType: log.logType,
          rssi: log.rssi ?? null,
          snr: log.snr ?? null,
          batteryLevel: log.batteryLevel ?? null,
          temperatureCelsius: log.temperatureCelsius ?? null,
          humidityPercent: log.humidityPercent ?? null,
          motionDetected: log.motionDetected ?? null,
          firmwareVersion: log.firmwareVersion ?? null,
          certificateExpiryDays: log.certificateExpiryDays ?? null,
          cpuUsagePercent: log.cpuUsagePercent ?? null,
          memoryUsagePercent: log.memoryUsagePercent ?? null,
          networkLatencyMs: log.networkLatencyMs ?? null,
          packetLossPercent: log.packetLossPercent ?? null,
          coordinatesX: log.coordinatesX ?? null,
          coordinatesY: log.coordinatesY ?? null,
          coordinatesZ: log.coordinatesZ ?? null,
          merkleRoot: log.merkleRoot ?? null,
          merkleProof: log.merkleProof ?? null,
          metadataJson: log.metadataJson ?? null,
          timestamp: log.timestamp,
        }));

        await db.insert(hardwareTelemetryLogs).values(rows);
      }

      return itemsToFlush.length;
    } catch (error) {
      console.error("[TelemetryIngestionWorker] Error flushing batch:", error);
      // Re-queue uncommitted items
      this.buffer.unshift(...itemsToFlush);
      throw error;
    }
  }

  /**
   * Retrieve latest transient beacon RSSI from fast write-behind cache
   */
  static getLatestBeaconCache(institutionId: string, deviceId: string) {
    const cacheKey = `${institutionId}:${deviceId}`;
    const cached = this.beaconCache.get(cacheKey);
    if (!cached) return null;

    // Expire cache items older than 5 seconds
    if (Date.now() - cached.timestamp > 5000) {
      this.beaconCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Get buffer status metrics
   */
  static getBufferStats() {
    return {
      bufferedCount: this.buffer.length,
      cachedBeaconsCount: this.beaconCache.size,
    };
  }

  /**
   * Reset buffers (useful for testing)
   */
  static clearBuffer() {
    this.buffer = [];
    this.beaconCache.clear();
  }
}
