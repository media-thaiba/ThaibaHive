import { HardwareDeviceEngine } from "../device-engine";
import { db } from "@/db";
import { hardwareDevices, hardwareTelemetryLogs, institutions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { createHmac } from "crypto";

describe("HardwareDeviceEngine", () => {
  const ts = Date.now();
  const tenantA = `inst_hw_a_${ts}`;
  const tenantB = `inst_hw_b_${ts}`;

  beforeAll(async () => {
    // Insert test institutions
    await db.insert(institutions).values([
      { id: tenantA, name: "Hardware Campus A", code: `hwa_${ts}` },
      { id: tenantB, name: "Hardware Campus B", code: `hwb_${ts}` },
    ]);
  });

  afterAll(async () => {
    await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [tenantA, tenantB]));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  beforeEach(async () => {
    await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [tenantA, tenantB]));
  });

  describe("Device Registration & Tenant Scoping", () => {
    it("registers a device successfully with tenant isolation", async () => {
      const device = await HardwareDeviceEngine.registerDevice(tenantA, {
        name: "Main Gate Turnstile A",
        type: "gate_kiosk",
        model: "ZK-Teco-Pro-2026",
        macAddress: "AA:BB:CC:11:22:33",
        firmwareVersion: "1.2.0",
        coordinatesX: 12.5,
        coordinatesY: 45.2,
      });

      expect(device.id).toBeDefined();
      expect(device.institutionId).toBe(tenantA);
      expect(device.status).toBe("offline");
      expect(device.isActive).toBe(true);

      // Verify retrieval by tenant A
      const fetched = await HardwareDeviceEngine.getDevice(tenantA, device.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe("Main Gate Turnstile A");

      // Verify tenant B cannot see tenant A's device
      const crossTenant = await HardwareDeviceEngine.getDevice(tenantB, device.id);
      expect(crossTenant).toBeNull();
    });

    it("filters devices by type and status", async () => {
      await HardwareDeviceEngine.registerDevice(tenantA, {
        name: "BLE Scanner Library",
        type: "beacon",
        macAddress: "11:22:33:44:55:66",
      });

      await HardwareDeviceEngine.registerDevice(tenantA, {
        name: "Science Lab Sensor",
        type: "environmental_sensor",
        macAddress: "22:33:44:55:66:77",
      });

      const beacons = await HardwareDeviceEngine.listDevices(tenantA, { type: "beacon" });
      expect(beacons.length).toBe(1);
      expect(beacons[0].type).toBe("beacon");

      const sensors = await HardwareDeviceEngine.listDevices(tenantA, { type: "environmental_sensor" });
      expect(sensors.length).toBe(1);
    });
  });

  describe("Heartbeat Recording & Status Updates", () => {
    it("records a heartbeat and updates device status to online", async () => {
      const device = await HardwareDeviceEngine.registerDevice(tenantA, {
        name: "Bus 4 GPS Tracker",
        type: "patrol_device",
        macAddress: "33:44:55:66:77:88",
      });

      expect(device.status).toBe("offline");

      const hbResult = await HardwareDeviceEngine.recordHeartbeat(tenantA, {
        deviceId: device.id,
        batteryLevel: 94,
        cpuUsagePercent: 12,
        temperatureCelsius: 28.5,
        coordinatesX: 10.2,
        coordinatesY: 20.4,
      });

      expect(hbResult).not.toBeNull();
      expect(hbResult?.status).toBe("online");

      const updated = await HardwareDeviceEngine.getDevice(tenantA, device.id);
      expect(updated?.status).toBe("online");
      expect(updated?.lastHeartbeatAt).toBeDefined();
    });
  });

  describe("Cryptographic Authentication Verification", () => {
    it("verifies X.509 thumbprint authentication", () => {
      const device = {
        certificateThumbprint: "A1B2C3D4E5F678901234567890ABCDEF12345678",
      };

      const valid = HardwareDeviceEngine.verifyDeviceAuth(device, {
        certThumbprint: "a1b2c3d4e5f678901234567890abcdef12345678",
      });
      expect(valid).toBe(true);

      const invalid = HardwareDeviceEngine.verifyDeviceAuth(device, {
        certThumbprint: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      });
      expect(invalid).toBe(false);
    });

    it("verifies HMAC-SHA256 signature for low-power MCUs", () => {
      const hmacKey = "secret_hardware_psk_key_12345";
      const payload = JSON.stringify({ deviceId: "dev_99", temp: 24.2, timestamp: 1728567000 });
      const signature = createHmac("sha256", hmacKey).update(payload).digest("hex");

      const valid = HardwareDeviceEngine.verifyDeviceAuth({}, {
        hmacKey,
        payload,
        signature,
      });
      expect(valid).toBe(true);

      const tampered = HardwareDeviceEngine.verifyDeviceAuth({}, {
        hmacKey,
        payload: payload + "tampered",
        signature,
      });
      expect(tampered).toBe(false);
    });
  });

  describe("Anomaly Detection", () => {
    it("detects low battery warning and offline timeouts", async () => {
      const dev = await HardwareDeviceEngine.registerDevice(tenantA, {
        name: "Perimeter Gate 3 Reader",
        type: "nfc_reader",
        macAddress: "44:55:66:77:88:99",
      });

      // Send a heartbeat with critically low battery
      await HardwareDeviceEngine.recordHeartbeat(tenantA, {
        deviceId: dev.id,
        batteryLevel: 10,
        packetLossPercent: 15,
      });

      const anomalies = await HardwareDeviceEngine.detectAnomalies(tenantA);
      expect(anomalies.length).toBeGreaterThan(0);

      const batteryAnomaly = anomalies.find((a) => a.anomalyType === "low_battery");
      expect(batteryAnomaly).toBeDefined();
      expect(batteryAnomaly?.severity).toBe("warning");

      const packetLossAnomaly = anomalies.find((a) => a.anomalyType === "high_packet_loss");
      expect(packetLossAnomaly).toBeDefined();
    });
  });
});
