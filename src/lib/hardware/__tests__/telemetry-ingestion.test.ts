import { TelemetryIngestionWorker } from "../telemetry-ingestion";
import { HardwareDeviceEngine } from "../device-engine";
import { db } from "@/db";
import { hardwareDevices, hardwareTelemetryLogs, institutions } from "@/db/schema";
import { inArray } from "drizzle-orm";

describe("TelemetryIngestionWorker", () => {
  const ts = Date.now();
  const institutionId = `inst_hw_telem_${ts}`;

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: institutionId, name: "Telemetry Campus", code: `hwt_${ts}` },
    ]);
  });

  afterAll(async () => {
    await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [institutionId]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [institutionId]));
    await db.delete(institutions).where(inArray(institutions.id, [institutionId]));
  });

  beforeEach(async () => {
    TelemetryIngestionWorker.clearBuffer();
    await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [institutionId]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [institutionId]));
  });

  it("buffers telemetry items and maintains beacon cache", async () => {
    const dev = await HardwareDeviceEngine.registerDevice(institutionId, {
      name: "Library Anchor 1",
      type: "beacon",
      macAddress: "55:66:77:88:99:AA",
    });

    const result = await TelemetryIngestionWorker.ingestTelemetry(institutionId, {
      deviceId: dev.id,
      logType: "rssi_scan",
      rssi: -62,
      snr: 18.5,
    });

    expect(result.buffered).toBe(true);
    expect(result.totalBuffered).toBe(1);

    // Verify fast write-behind cache retrieval
    const cached = TelemetryIngestionWorker.getLatestBeaconCache(institutionId, dev.id);
    expect(cached).not.toBeNull();
    expect(cached?.rssi).toBe(-62);
  });

  it("flushes in-memory buffer to persistent database table", async () => {
    const dev = await HardwareDeviceEngine.registerDevice(institutionId, {
      name: "Cafeteria Sensor",
      type: "environmental_sensor",
      macAddress: "66:77:88:99:AA:BB",
    });

    await TelemetryIngestionWorker.ingestTelemetry(institutionId, {
      deviceId: dev.id,
      logType: "temperature",
      temperatureCelsius: 23.4,
      humidityPercent: 55,
    });

    await TelemetryIngestionWorker.ingestTelemetry(institutionId, {
      deviceId: dev.id,
      logType: "motion",
      motionDetected: true,
    });

    const flushedCount = await TelemetryIngestionWorker.flushBatch();
    expect(flushedCount).toBe(2);

    const logs = await db.select().from(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [institutionId]));
    expect(logs.length).toBe(2);
  });
});
