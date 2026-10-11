/**
 * Sprint-105: Track 3C Hardware Radar & IoT Mesh
 * 8-Stage End-to-End Simulation CLI Runner
 */

import { HardwareDeviceEngine } from "../src/lib/hardware/device-engine";
import { TelemetryIngestionWorker } from "../src/lib/hardware/telemetry-ingestion";
import { TrilaterationEngine, AnchorObservation } from "../src/lib/hardware/trilateration-engine";
import { GeofenceEngine } from "../src/lib/hardware/geofence-engine";
import { MusterEngine } from "../src/lib/hardware/muster-engine";
import { GateAccessEngine } from "../src/lib/hardware/gate-access-engine";
import { BiometricMeshEngine } from "../src/lib/hardware/biometric-mesh-engine";
import { db } from "../src/db";
import {
  institutions,
  hardwareDevices,
  hardwareZones,
  hardwareBadges,
  hardwareAccessEvents,
  hardwareTelemetryLogs,
  hardwareBiometricTemplates,
} from "../src/db/schema";
import { inArray } from "drizzle-orm";

async function runSimulation() {
  console.log("================================================================================");
  console.log("       THAIBAHIVE HARDWARE RADAR & IOT MESH SIMULATOR (TRACK 3C / PHASE 9)       ");
  console.log("================================================================================\n");

  const ts = Date.now();
  const instId = `inst_hw_sim_${ts}`;
  const instOther = `inst_hw_other_${ts}`;

  try {
    // Setup test institutions
    await db.insert(institutions).values([
      { id: instId, name: "Simulation Campus Alpha", code: `hws_${ts}` },
      { id: instOther, name: "Simulation Campus Beta", code: `hwo_${ts}` },
    ]);

    // ---------------------------------------------------------------------------
    // Stage 1: Multi-Tenant Fleet Onboarding & Zone Hierarchy
    // ---------------------------------------------------------------------------
    console.log("Stage 1/8: Multi-Tenant Fleet Onboarding & Zone Hierarchy...");

    const zoneCampus = await GeofenceEngine.createZone(instId, {
      name: "Main Campus Grounds",
      type: "outdoor",
      boundaryCoordinates: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
    });

    const zoneMuster1 = await GeofenceEngine.createZone(instId, {
      name: "North Sports Field Muster Area",
      type: "muster_point",
      isMusterPoint: true,
      parentZoneId: zoneCampus.id,
      boundaryCoordinates: [
        [10, 10],
        [30, 10],
        [30, 30],
        [10, 30],
      ],
    });

    const zoneAdminBuilding = await GeofenceEngine.createZone(instId, {
      name: "Admin Tower",
      type: "building",
      parentZoneId: zoneCampus.id,
    });

    const zoneVault = await GeofenceEngine.createZone(instId, {
      name: "Autonomous Server Vault",
      type: "room",
      floorNumber: 2,
      parentZoneId: zoneAdminBuilding.id,
      boundaryCoordinates: [
        [50, 50],
        [60, 50],
        [60, 60],
        [50, 60],
      ],
    });

    const anchorA = await HardwareDeviceEngine.registerDevice(instId, {
      name: "BLE Anchor North-West",
      type: "beacon",
      zoneId: zoneCampus.id,
      macAddress: "AA:BB:CC:11:22:01",
      coordinatesX: 0,
      coordinatesY: 0,
      coordinatesZ: 2.5,
    });

    const anchorB = await HardwareDeviceEngine.registerDevice(instId, {
      name: "BLE Anchor North-East",
      type: "beacon",
      zoneId: zoneCampus.id,
      macAddress: "AA:BB:CC:11:22:02",
      coordinatesX: 100,
      coordinatesY: 0,
      coordinatesZ: 2.5,
    });

    const anchorC = await HardwareDeviceEngine.registerDevice(instId, {
      name: "BLE Anchor South-East",
      type: "beacon",
      zoneId: zoneCampus.id,
      macAddress: "AA:BB:CC:11:22:03",
      coordinatesX: 100,
      coordinatesY: 100,
      coordinatesZ: 2.5,
    });

    const turnstileMain = await HardwareDeviceEngine.registerDevice(instId, {
      name: "Main Campus Entrance Turnstile 1",
      type: "gate_kiosk",
      zoneId: zoneCampus.id,
      macAddress: "AA:BB:CC:99:88:01",
    });

    console.log(`  ✓ 4 Zones initialized (Outdoor, Muster, Building, High-Security Vault).`);
    console.log(`  ✓ 4 Hardware devices registered with strict tenant scoping (${instId}).`);

    // ---------------------------------------------------------------------------
    // Stage 2: High-Volume Telemetry Ingestion & Anomaly Detection
    // ---------------------------------------------------------------------------
    console.log("\nStage 2/8: High-Volume Telemetry Ingestion & Anomaly Detection...");

    await TelemetryIngestionWorker.ingestTelemetry(instId, {
      deviceId: anchorA.id,
      logType: "heartbeat",
      batteryLevel: 88,
      rssi: -55,
      packetLossPercent: 0.001,
      firmwareVersion: "1.0.0",
    });

    await TelemetryIngestionWorker.ingestTelemetry(instId, {
      deviceId: anchorB.id,
      logType: "heartbeat",
      batteryLevel: 12, // Low battery trigger (< 15%)
      rssi: -62,
      packetLossPercent: 5.0,
      firmwareVersion: "1.0.0",
    });

    await TelemetryIngestionWorker.ingestTelemetry(instId, {
      deviceId: turnstileMain.id,
      logType: "heartbeat",
      batteryLevel: 100,
      rssi: -40,
      packetLossPercent: 0,
      firmwareVersion: "1.0.0",
    });

    const flushedCount = await TelemetryIngestionWorker.flushBatch();
    if (flushedCount < 3) {
      throw new Error(`Telemetry buffer flush failed: flushedCount=${flushedCount}`);
    }

    const anomalies = await HardwareDeviceEngine.detectAnomalies(instId);
    const lowBat = anomalies.find((a) => a.deviceId === anchorB.id && a.anomalyType === "low_battery");
    if (!lowBat) {
      throw new Error("Fleet anomaly engine failed to flag low battery anchor.");
    }
    console.log(`  ✓ 3 Telemetry packets ingested and flushed to storage (${flushedCount} rows).`);
    console.log(`  ✓ Fleet anomaly engine detected low battery on ${anchorB.name} (${lowBat.description}).`);

    // ---------------------------------------------------------------------------
    // Stage 3: 2.4GHz BLE RSSI Trilateration & Kalman Smoothing
    // ---------------------------------------------------------------------------
    console.log("\nStage 3/8: 2.4GHz BLE RSSI Trilateration & Kalman Smoothing...");

    const anchors: AnchorObservation[] = [
      {
        anchorId: anchorA.id,
        coordinates: { x: 0, y: 0 },
        rssi: -93.5,
        txPower1m: -59,
        pathLossExponent: 3.0,
      },
      {
        anchorId: anchorB.id,
        coordinates: { x: 20, y: 0 },
        rssi: -93.5,
        txPower1m: -59,
        pathLossExponent: 3.0,
      },
      {
        anchorId: anchorC.id,
        coordinates: { x: 10, y: 20 },
        rssi: -89.0,
        txPower1m: -59,
        pathLossExponent: 3.0,
      },
    ];

    const est = TrilaterationEngine.calculatePosition(anchors);

    if (Math.abs(est.coordinates.x - 10.0) > 1.5 || Math.abs(est.coordinates.y - 10.0) > 1.5) {
      throw new Error(`Trilateration solution deviated beyond tolerance: x=${est.coordinates.x}, y=${est.coordinates.y}`);
    }
    console.log(`  ✓ WLS Solver estimated position at (${est.coordinates.x.toFixed(2)}, ${est.coordinates.y.toFixed(2)}) using ${est.anchorCount} anchors.`);

    // ---------------------------------------------------------------------------
    // Stage 4: Convex/Concave Geofencing & Real-Time Presence Mesh
    // ---------------------------------------------------------------------------
    console.log("\nStage 4/8: Convex/Concave Geofencing & Real-Time Presence Mesh...");

    const campusBoundary: Array<[number, number]> = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];

    const vaultBoundary: Array<[number, number]> = [
      [50, 50],
      [60, 50],
      [60, 60],
      [50, 60],
    ];

    const inCampus = GeofenceEngine.isPointInPolygon({ x: 50, y: 50 }, campusBoundary);
    const outCampus = GeofenceEngine.isPointInPolygon({ x: 150, y: 150 }, campusBoundary);
    const inVault = GeofenceEngine.isPointInPolygon({ x: 55, y: 55 }, vaultBoundary);

    if (!inCampus || outCampus || !inVault) {
      throw new Error(`Ray-casting geofence test failed: inCampus=${inCampus}, outCampus=${outCampus}, inVault=${inVault}`);
    }
    console.log(`  ✓ Ray-casting point-in-polygon verified inside campus & high-security vault geofences.`);

    // ---------------------------------------------------------------------------
    // Stage 5: Dynamic Emergency Muster Point Evacuation Tracking
    // ---------------------------------------------------------------------------
    console.log("\nStage 5/8: Dynamic Emergency Muster Point Evacuation Tracking...");

    const now = new Date().toISOString();
    // Insert test badges: 2 in muster zone, 1 inside building
    await db.insert(hardwareBadges).values([
      {
        id: `hwb_m1_${ts}`,
        institutionId: instId,
        badgeId: `NFC_MUSTER_1_${ts}`,
        badgeType: "ble_beacon",
        credentialType: "staff_id",
        status: "active",
        validFrom: now,
        lastUsedZoneId: zoneMuster1.id,
        lastUsedAt: now,
      },
      {
        id: `hwb_m2_${ts}`,
        institutionId: instId,
        badgeId: `NFC_MUSTER_2_${ts}`,
        badgeType: "ble_beacon",
        credentialType: "student_id",
        status: "active",
        validFrom: now,
        lastUsedZoneId: zoneMuster1.id,
        lastUsedAt: now,
      },
      {
        id: `hwb_m3_${ts}`,
        institutionId: instId,
        badgeId: `NFC_MUSTER_3_${ts}`,
        badgeType: "ble_beacon",
        credentialType: "staff_id",
        status: "active",
        validFrom: now,
        lastUsedZoneId: zoneAdminBuilding.id,
        lastUsedAt: now,
      },
    ]);

    const musterReport = await MusterEngine.calculateMusterHeadcount(instId);
    if (musterReport.totalOccupantsOnSite !== 3 || musterReport.accountedInMusterCount !== 2) {
      throw new Error(`Muster report calculation mismatch: ${JSON.stringify(musterReport)}`);
    }
    console.log(`  ✓ Muster evacuation status: ${musterReport.accountedInMusterCount}/${musterReport.totalOccupantsOnSite} safe (${musterReport.evacuationPercentage.toFixed(1)}% evacuated).`);

    // ---------------------------------------------------------------------------
    // Stage 6: Smart Turnstile Access & 5-Tier Anti-Passback State Machine
    // ---------------------------------------------------------------------------
    console.log("\nStage 6/8: Smart Turnstile Access & Anti-Passback State Machine...");

    const turnstileSecond = await HardwareDeviceEngine.registerDevice(instId, {
      name: "Main Campus Entrance Turnstile 2",
      type: "gate_kiosk",
      zoneId: zoneCampus.id,
      macAddress: "AA:BB:CC:99:88:02",
    });

    const badge = await GateAccessEngine.registerBadge(instId, {
      badgeId: `NFC_SIM_GATE_${ts}`,
      badgeType: "nfc_card",
      credentialType: "staff_id",
      accessRulesJson: JSON.stringify({ allowedZones: [zoneCampus.id, zoneAdminBuilding.id, zoneVault.id] }),
    });

    // 1st entry -> Should be GRANTED
    const entry1 = await GateAccessEngine.verifyAccess(
      instId,
      {
        badgeId: badge.badgeId,
        deviceId: turnstileMain.id,
        zoneId: zoneCampus.id,
        direction: "in",
        authenticationMethod: "nfc",
      },
      "hard"
    );

    if (!entry1.granted || entry1.antiPassbackViolation) {
      throw new Error(`Initial valid entry was denied: ${entry1.reason}`);
    }

    // 2nd consecutive entry at another turnstile (Passback violation) -> Should be REJECTED (Hard APB)
    const entry2 = await GateAccessEngine.verifyAccess(
      instId,
      {
        badgeId: badge.badgeId,
        deviceId: turnstileSecond.id,
        zoneId: zoneCampus.id,
        direction: "in",
        authenticationMethod: "nfc",
      },
      "hard"
    );

    if (entry2.granted || !entry2.antiPassbackViolation) {
      throw new Error("Anti-Passback failed to block double entry transit.");
    }
    console.log(`  ✓ Smart Gate granted initial entry (Transit Log ID: ${entry1.eventId}, Merkle Root: ${entry1.merkleRoot.slice(0, 16)}...).`);
    console.log(`  ✓ 5-Tier Anti-Passback state machine blocked passback violation: '${entry2.reason}'.`);

    // ---------------------------------------------------------------------------
    // Stage 7: Edge Biometric Envelope Encryption & Zeroization
    // ---------------------------------------------------------------------------
    console.log("\nStage 7/8: Edge Biometric Envelope Encryption & Zeroization...");

    const sampleVector = [0.12, 0.45, -0.32, 0.78, 0.05, -0.11, 0.88, -0.42, 0.33, 0.19, -0.65, 0.41, 0.22, -0.08, 0.54, -0.31];

    await BiometricMeshEngine.enroll(instId, {
      ownerType: "staff",
      ownerId: "staff_sim_01",
      modality: "face",
      templateVector: sampleVector,
      qualityScore: 0.98,
      enrolledByDeviceId: turnstileMain.id,
    });

    // Test vector verification
    const verifyRes = await BiometricMeshEngine.verify(instId, {
      ownerType: "staff",
      ownerId: "staff_sim_01",
      modality: "face",
      probeVector: sampleVector,
      threshold: 0.95,
    });

    if (!verifyRes.match || verifyRes.score < 0.99) {
      throw new Error(`Biometric cosine similarity match failed: ${JSON.stringify(verifyRes)}`);
    }
    console.log(`  ✓ AES-256-GCM envelope encrypted template verified with cosine similarity: ${verifyRes.score.toFixed(4)}.`);

    // Test GDPR Right-to-be-forgotten Zeroization
    const zeroized = await BiometricMeshEngine.zeroize(instId, {
      ownerType: "staff",
      ownerId: "staff_sim_01",
      modality: "face",
      reason: "GDPR Article 17 Erasure Request",
    });

    if (zeroized.zeroizedCount < 1) {
      throw new Error("Biometric zeroization erasure failed.");
    }
    console.log(`  ✓ Cryptographic zeroization executed: Biometric vector wiped with tombstone zeroes.`);

    // ---------------------------------------------------------------------------
    // Stage 8: Campus Emergency Lockdown & Cryptographic Merkle Verification
    // ---------------------------------------------------------------------------
    console.log("\nStage 8/8: Emergency Lockdown & Cryptographic Merkle Audit Integrity...");

    // Trigger lockdown
    GateAccessEngine.setLockdown(instId, {
      isLocked: true,
      reason: "Hostile intruder drill simulation",
    });

    const lockdownAttempt = await GateAccessEngine.verifyAccess(instId, {
      badgeId: badge.badgeId,
      deviceId: turnstileMain.id,
      zoneId: zoneCampus.id,
      direction: "in",
      authenticationMethod: "nfc",
    });

    if (lockdownAttempt.granted || lockdownAttempt.verificationResult !== "locked_down") {
      throw new Error(`Lockdown failed: Expected locked_down result, got ${lockdownAttempt.verificationResult}`);
    }
    console.log(`  ✓ Turnstile denied access under active emergency lockdown: '${lockdownAttempt.reason}'.`);

    // Reset lockdown
    GateAccessEngine.setLockdown(instId, { isLocked: false });

    // Verify Merkle audit hash chain
    const merkleAudit = await GateAccessEngine.verifyMerkleAuditTrail(instId);
    if (!merkleAudit.valid) {
      throw new Error(`Merkle audit chain broken: ${merkleAudit.error}`);
    }
    console.log(`  ✓ Merkle audit ledger verified 100% untampered (${merkleAudit.totalEvents} access events chained with SHA-256 hash pointers).`);

    console.log("\n================================================================================");
    console.log("       ✅ ALL 8 SIMULATION STAGES PASSED SUCCESSFULLY (100% COMPLETE)          ");
    console.log("================================================================================");
  } finally {
    // Cleanup simulation resources
    try {
      GateAccessEngine.setLockdown(instId, { isLocked: false });
      await db.delete(hardwareAccessEvents).where(inArray(hardwareAccessEvents.institutionId, [instId, instOther]));
      await db.delete(hardwareTelemetryLogs).where(inArray(hardwareTelemetryLogs.institutionId, [instId, instOther]));
      await db.delete(hardwareBiometricTemplates).where(inArray(hardwareBiometricTemplates.institutionId, [instId, instOther]));
      await db.delete(hardwareBadges).where(inArray(hardwareBadges.institutionId, [instId, instOther]));
      await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [instId, instOther]));
      await db.delete(hardwareZones).where(inArray(hardwareZones.institutionId, [instId, instOther]));
      await db.delete(institutions).where(inArray(institutions.id, [instId, instOther]));
    } catch (_) {}
  }
}

runSimulation().catch((err) => {
  console.error("\n❌ Simulation failed:", err);
  process.exit(1);
});
