import { db } from "@/db";
import { hardwareDevices, hardwareTelemetryLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import type {
  HardwareDeviceRegisterInput,
  HardwareDeviceUpdateInput,
  HardwareHeartbeatInput,
} from "@/lib/validation/schemas";

export interface DeviceAnomaly {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  anomalyType: "offline_timeout" | "low_battery" | "high_packet_loss" | "firmware_outdated";
  severity: "critical" | "warning" | "info";
  description: string;
  detectedAt: string;
}

export class HardwareDeviceEngine {
  /**
   * Register a new hardware device with tenant scoping
   */
  static async registerDevice(
    institutionId: string,
    input: HardwareDeviceRegisterInput
  ) {
    const id = `hwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const newDevice = {
      id,
      institutionId,
      name: input.name,
      type: input.type,
      model: input.model || null,
      firmwareVersion: input.firmwareVersion || "1.0.0",
      macAddress: input.macAddress || null,
      ipAddress: input.ipAddress || null,
      status: "offline",
      zoneId: input.zoneId || null,
      coordinatesX: input.coordinatesX ?? null,
      coordinatesY: input.coordinatesY ?? null,
      coordinatesZ: input.coordinatesZ ?? null,
      lastHeartbeatAt: null,
      lastFirmwareCheckAt: null,
      firmwareUpdateAvailable: false,
      certificateThumbprint: input.certificateThumbprint || null,
      hmacKeyId: input.hmacKeyId || null,
      configurationJson: input.configurationJson || null,
      metadataJson: input.metadataJson || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(hardwareDevices).values({
      id,
      institutionId,
      name: input.name,
      type: input.type,
      model: input.model || null,
      firmwareVersion: input.firmwareVersion || "1.0.0",
      macAddress: input.macAddress || null,
      ipAddress: input.ipAddress || null,
      status: "offline",
      zoneId: input.zoneId || null,
      coordinatesX: input.coordinatesX ?? null,
      coordinatesY: input.coordinatesY ?? null,
      coordinatesZ: input.coordinatesZ ?? null,
      lastHeartbeatAt: null,
      lastFirmwareCheckAt: null,
      firmwareUpdateAvailable: false,
      certificateThumbprint: input.certificateThumbprint || null,
      hmacKeyId: input.hmacKeyId || null,
      configurationJson: input.configurationJson || null,
      metadataJson: input.metadataJson || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return newDevice;
  }

  /**
   * Get device by ID strictly scoped to institution
   */
  static async getDevice(institutionId: string, deviceId: string) {
    const rows = await db
      .select()
      .from(hardwareDevices)
      .where(
        and(
          eq(hardwareDevices.id, deviceId),
          eq(hardwareDevices.institutionId, institutionId)
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  /**
   * List devices with filtering and tenant isolation
   */
  static async listDevices(
    institutionId: string,
    filters?: {
      type?: string;
      status?: string;
      zoneId?: string;
      isActive?: boolean;
    }
  ) {
    const conditions = [eq(hardwareDevices.institutionId, institutionId)];

    if (filters?.type) {
      conditions.push(eq(hardwareDevices.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(hardwareDevices.status, filters.status));
    }
    if (filters?.zoneId) {
      conditions.push(eq(hardwareDevices.zoneId, filters.zoneId));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(hardwareDevices.isActive, filters.isActive));
    }

    return db
      .select()
      .from(hardwareDevices)
      .where(and(...conditions))
      .orderBy(desc(hardwareDevices.createdAt));
  }

  /**
   * Update device settings / status
   */
  static async updateDevice(
    institutionId: string,
    deviceId: string,
    input: HardwareDeviceUpdateInput
  ) {
    const existing = await this.getDevice(institutionId, deviceId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      updatedAt: now,
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.firmwareVersion !== undefined) updateData.firmwareVersion = input.firmwareVersion;
    if (input.ipAddress !== undefined) updateData.ipAddress = input.ipAddress;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.zoneId !== undefined) updateData.zoneId = input.zoneId;
    if (input.coordinatesX !== undefined) updateData.coordinatesX = input.coordinatesX;
    if (input.coordinatesY !== undefined) updateData.coordinatesY = input.coordinatesY;
    if (input.coordinatesZ !== undefined) updateData.coordinatesZ = input.coordinatesZ;
    if (input.configurationJson !== undefined) updateData.configurationJson = input.configurationJson;
    if (input.metadataJson !== undefined) updateData.metadataJson = input.metadataJson;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    await db
      .update(hardwareDevices)
      .set(updateData)
      .where(
        and(
          eq(hardwareDevices.id, deviceId),
          eq(hardwareDevices.institutionId, institutionId)
        )
      );

    return { ...existing, ...updateData };
  }

  /**
   * Record periodic heartbeat from edge device
   */
  static async recordHeartbeat(
    institutionId: string,
    input: HardwareHeartbeatInput
  ) {
    const existing = await this.getDevice(institutionId, input.deviceId);
    if (!existing) return null;

    const now = new Date().toISOString();

    // 1. Update device state to online
    await db
      .update(hardwareDevices)
      .set({
        status: "online",
        lastHeartbeatAt: now,
        coordinatesX: input.coordinatesX ?? existing.coordinatesX,
        coordinatesY: input.coordinatesY ?? existing.coordinatesY,
        coordinatesZ: input.coordinatesZ ?? existing.coordinatesZ,
        firmwareVersion: input.firmwareVersion || existing.firmwareVersion,
        updatedAt: now,
      })
      .where(
        and(
          eq(hardwareDevices.id, input.deviceId),
          eq(hardwareDevices.institutionId, institutionId)
        )
      );

    // 2. Insert telemetry log entry
    const logId = `htl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(hardwareTelemetryLogs).values({
      id: logId,
      institutionId,
      deviceId: input.deviceId,
      zoneId: existing.zoneId,
      logType: "heartbeat",
      batteryLevel: input.batteryLevel ?? null,
      cpuUsagePercent: input.cpuUsagePercent ?? null,
      memoryUsagePercent: input.memoryUsagePercent ?? null,
      networkLatencyMs: input.networkLatencyMs ?? null,
      packetLossPercent: input.packetLossPercent ?? null,
      temperatureCelsius: input.temperatureCelsius ?? null,
      humidityPercent: input.humidityPercent ?? null,
      coordinatesX: input.coordinatesX ?? null,
      coordinatesY: input.coordinatesY ?? null,
      coordinatesZ: input.coordinatesZ ?? null,
      firmwareVersion: input.firmwareVersion || existing.firmwareVersion,
      metadataJson: input.metadataJson ?? null,
      timestamp: now,
    });

    return {
      deviceId: input.deviceId,
      status: "online",
      recordedAt: now,
      firmwareUpdateAvailable: existing.firmwareUpdateAvailable,
    };
  }

  /**
   * Timing-safe cryptographic device authentication verification
   */
  static verifyDeviceAuth(
    device: { certificateThumbprint?: string | null; hmacKeyId?: string | null },
    credentials: {
      certThumbprint?: string;
      hmacKey?: string;
      signature?: string;
      payload?: string;
    }
  ): boolean {
    // 1. X.509 mTLS Thumbprint check
    if (device.certificateThumbprint && credentials.certThumbprint) {
      const expected = Buffer.from(device.certificateThumbprint.toLowerCase(), "utf8");
      const actual = Buffer.from(credentials.certThumbprint.toLowerCase(), "utf8");
      if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
        return true;
      }
    }

    // 2. HMAC-SHA256 Token check for low-power MCUs
    if (credentials.hmacKey && credentials.signature && credentials.payload) {
      const calculatedSig = createHmac("sha256", credentials.hmacKey)
        .update(credentials.payload)
        .digest("hex");
      
      const expectedBuf = Buffer.from(calculatedSig, "utf8");
      const actualBuf = Buffer.from(credentials.signature, "utf8");
      if (expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect hardware device anomalies (offline heartbeats, low battery, packet loss)
   */
  static async detectAnomalies(institutionId: string): Promise<DeviceAnomaly[]> {
    const devices = await this.listDevices(institutionId, { isActive: true });
    const anomalies: DeviceAnomaly[] = [];
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 90 * 1000; // 90 seconds timeout

    for (const dev of devices) {
      // 1. Check offline status based on last heartbeat
      if (dev.lastHeartbeatAt) {
        const lastHb = new Date(dev.lastHeartbeatAt).getTime();
        if (now - lastHb > OFFLINE_THRESHOLD_MS) {
          anomalies.push({
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            anomalyType: "offline_timeout",
            severity: "critical",
            description: `Device missed heartbeats for >90s. Last seen at ${dev.lastHeartbeatAt}`,
            detectedAt: new Date().toISOString(),
          });
        }
      } else if (dev.status === "offline") {
        anomalies.push({
          deviceId: dev.id,
          deviceName: dev.name,
          deviceType: dev.type,
          anomalyType: "offline_timeout",
          severity: "warning",
          description: `Device has never connected or reported a heartbeat.`,
          detectedAt: new Date().toISOString(),
        });
      }

      // 2. Check latest telemetry logs for battery / packet loss
      const latestLogs = await db
        .select()
        .from(hardwareTelemetryLogs)
        .where(
          and(
            eq(hardwareTelemetryLogs.deviceId, dev.id),
            eq(hardwareTelemetryLogs.institutionId, institutionId)
          )
        )
        .orderBy(desc(hardwareTelemetryLogs.timestamp))
        .limit(1);

      if (latestLogs[0]) {
        const log = latestLogs[0];
        if (log.batteryLevel !== null && log.batteryLevel !== undefined && log.batteryLevel <= 15) {
          anomalies.push({
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            anomalyType: "low_battery",
            severity: log.batteryLevel <= 5 ? "critical" : "warning",
            description: `Low battery level at ${log.batteryLevel}%. Requires recharge or replacement.`,
            detectedAt: new Date().toISOString(),
          });
        }

        if (log.packetLossPercent !== null && log.packetLossPercent !== undefined && log.packetLossPercent > 10) {
          anomalies.push({
            deviceId: dev.id,
            deviceName: dev.name,
            deviceType: dev.type,
            anomalyType: "high_packet_loss",
            severity: "warning",
            description: `High packet loss (${log.packetLossPercent}%) detected on RF/wireless link.`,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Delete a hardware device
   */
  static async deleteDevice(institutionId: string, deviceId: string) {
    const existing = await this.getDevice(institutionId, deviceId);
    if (!existing) return false;

    await db
      .delete(hardwareDevices)
      .where(
        and(
          eq(hardwareDevices.id, deviceId),
          eq(hardwareDevices.institutionId, institutionId)
        )
      );

    return true;
  }
}
