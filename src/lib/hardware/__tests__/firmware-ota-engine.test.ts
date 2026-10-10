import { FirmwareOTAEngine } from "../firmware-ota-engine";
import { HardwareDeviceEngine } from "../device-engine";
import { db } from "@/db";
import { hardwareDevices, hardwareTelemetryLogs, institutions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { generateKeyPairSync, createSign } from "crypto";

describe("FirmwareOTAEngine", () => {
  const ts = Date.now();
  const institutionId = `inst_hw_ota_${ts}`;

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: institutionId, name: "OTA Campus", code: `hwota_${ts}` },
    ]);
  });

  afterAll(async () => {
    await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [institutionId]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [institutionId]));
    await db.delete(institutions).where(inArray(institutions.id, [institutionId]));
  });

  beforeEach(async () => {
    FirmwareOTAEngine.clearReleases();
    await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [institutionId]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [institutionId]));
  });

  it("creates a release and manages canary rollout progression", async () => {
    // 1. Register 10 devices
    for (let i = 1; i <= 10; i++) {
      await HardwareDeviceEngine.registerDevice(institutionId, {
        name: `Turnstile Gate ${i}`,
        type: "gate_kiosk",
        macAddress: `00:11:22:33:44:${i.toString(16).padStart(2, "0")}`,
        firmwareVersion: "1.0.0",
      });
    }

    // 2. Create release
    const release = await FirmwareOTAEngine.createRelease(institutionId, {
      version: "2.0.0",
      deviceType: "gate_kiosk",
      binaryUrl: "https://firmware.thaibahive.example.com/gate-v2.0.0.bin",
      binarySha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      signature: "dummy_signed_payload_123",
      releaseNotes: "Performance improvements & WLS trilateration fix",
      rolloutStage: "draft",
    });

    expect(release.id).toBeDefined();
    expect(release.version).toBe("2.0.0");
    expect(release.rolloutStage).toBe("draft");

    // 3. Promote to Canary 1% (should select 1 device)
    const canary1 = await FirmwareOTAEngine.promoteRolloutStage(release.id, "canary_1");
    expect(canary1?.rolloutStage).toBe("canary_1");

    const cohort1 = await FirmwareOTAEngine.getEligibleDevicesForRollout(institutionId, release.id, "canary_1");
    expect(cohort1.length).toBe(1);

    // 4. Promote to Staging 10% (should select 1 device)
    const staging10 = await FirmwareOTAEngine.promoteRolloutStage(release.id, "staging_10");
    expect(staging10?.rolloutStage).toBe("staging_10");

    // 5. Promote to Fleet 100%
    const fleet100 = await FirmwareOTAEngine.promoteRolloutStage(release.id, "fleet_100");
    expect(fleet100?.rolloutStage).toBe("fleet_100");

    const cohortAll = await FirmwareOTAEngine.getEligibleDevicesForRollout(institutionId, release.id, "fleet_100");
    expect(cohortAll.length).toBe(10);
  });

  it("verifies RSA/ECDSA manifest signatures accurately", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });

    const payload = JSON.stringify({ version: "2.1.0", sha256: "abc123hash" });
    const signer = createSign("SHA256");
    signer.update(payload);
    signer.end();
    const signature = signer.sign(privateKey, "base64");

    const pubKeyPem = publicKey.export({ type: "pkcs1", format: "pem" }) as string;

    const isValid = FirmwareOTAEngine.verifyManifestSignature(payload, signature, pubKeyPem);
    expect(isValid).toBe(true);

    const isTampered = FirmwareOTAEngine.verifyManifestSignature(payload + "tampered", signature, pubKeyPem);
    expect(isTampered).toBe(false);
  });

  it("handles successful OTA and watchdog rollback tracking", async () => {
    const dev = await HardwareDeviceEngine.registerDevice(institutionId, {
      name: "Gate Scanner Beta",
      type: "nfc_reader",
      firmwareVersion: "1.0.0",
    });

    const release = await FirmwareOTAEngine.createRelease(institutionId, {
      version: "1.1.0",
      deviceType: "nfc_reader",
      binaryUrl: "https://firmware.thaibahive.example.com/nfc-v1.1.0.bin",
      binarySha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      signature: "sig_abc",
      rolloutStage: "fleet_100",
    });

    // Record success
    const result = await FirmwareOTAEngine.recordDeviceOtaResult(
      institutionId,
      dev.id,
      release.id,
      "success"
    );

    expect(result?.result).toBe("success");
    expect(result?.devicesUpdated).toBe(1);

    const updatedDev = await HardwareDeviceEngine.getDevice(institutionId, dev.id);
    expect(updatedDev?.firmwareVersion).toBe("1.1.0");
    expect(updatedDev?.firmwareUpdateAvailable).toBe(false);
  });
});
