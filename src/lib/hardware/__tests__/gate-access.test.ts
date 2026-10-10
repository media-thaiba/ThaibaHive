import { GateAccessEngine } from "../gate-access-engine";
import { HardwareDeviceEngine } from "../device-engine";
import { GeofenceEngine } from "../geofence-engine";
import { db } from "@/db";
import {
  hardwareAccessEvents,
  hardwareBadges,
  hardwareDevices,
  hardwareZones,
  institutions,
} from "@/db/schema";
import { inArray } from "drizzle-orm";

describe("GateAccessEngine", () => {
  const ts = Date.now();
  const tenantA = `inst_gate_a_${ts}`;
  const tenantB = `inst_gate_b_${ts}`;

  let devTurnstile: any;
  let zoneMain: any;
  let zoneVault: any;

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: tenantA, name: "Gate Campus A", code: `gata_${ts}` },
      { id: tenantB, name: "Gate Campus B", code: `gatb_${ts}` },
    ]);

    // Create zones
    zoneMain = await GeofenceEngine.createZone(tenantA, {
      name: "Main Campus Grounds",
      type: "building",
    });

    zoneVault = await GeofenceEngine.createZone(tenantA, {
      name: "Secure Server Vault",
      type: "room",
    });

    // Create gate devices
    devTurnstile = await HardwareDeviceEngine.registerDevice(tenantA, {
      name: "East Gate Turnstile 1",
      type: "gate_kiosk",
      zoneId: zoneMain.id,
      macAddress: "AA:11:22:33:44:01",
    });
  });

  afterAll(async () => {
    GateAccessEngine.setLockdown(tenantA, { isLocked: false });
    GateAccessEngine.setLockdown(tenantB, { isLocked: false });
    await db.delete(hardwareAccessEvents).where(inArray(hardwareAccessEvents.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareBadges).where(inArray(hardwareBadges.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareDevices).where(inArray(hardwareDevices.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareZones).where(inArray(hardwareZones.institutionId, [tenantA, tenantB]));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  beforeEach(async () => {
    GateAccessEngine.setLockdown(tenantA, { isLocked: false });
    await db.delete(hardwareAccessEvents).where(inArray(hardwareAccessEvents.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareBadges).where(inArray(hardwareBadges.institutionId, [tenantA, tenantB]));
  });

  describe("Access Verification & Decision Engine", () => {
    it("grants access to active registered badge and generates Merkle root", async () => {
      const badge = await GateAccessEngine.registerBadge(tenantA, {
        badgeId: "NFC-ACTIVE-001",
        badgeType: "nfc_card",
        credentialType: "staff_id",
      });

      const decision = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-ACTIVE-001",
        deviceId: devTurnstile.id,
        zoneId: zoneMain.id,
        direction: "in",
      });

      expect(decision.granted).toBe(true);
      expect(decision.verificationResult).toBe("success");
      expect(decision.merkleRoot).toBeDefined();
      expect(decision.merkleRoot).toHaveLength(64); // SHA-256 hash
    });

    it("rejects unregistered badge credentials", async () => {
      const decision = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-UNKNOWN-999",
        deviceId: devTurnstile.id,
      });

      expect(decision.granted).toBe(false);
      expect(decision.verificationResult).toBe("failed_credential");
    });

    it("rejects revoked badges with reason", async () => {
      const badge = await GateAccessEngine.registerBadge(tenantA, {
        badgeId: "NFC-REVOKED-001",
        badgeType: "nfc_card",
        credentialType: "student_id",
      });

      await GateAccessEngine.revokeBadge(tenantA, badge.id, "Lost card reported");

      const decision = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-REVOKED-001",
        deviceId: devTurnstile.id,
      });

      expect(decision.granted).toBe(false);
      expect(decision.verificationResult).toBe("revoked");
      expect(decision.reason).toContain("Lost card reported");
    });

    it("triggers step-up authentication when high-security zone requires it", async () => {
      const badge = await GateAccessEngine.registerBadge(tenantA, {
        badgeId: "NFC-HIGH-SEC-001",
        badgeType: "nfc_card",
        credentialType: "staff_id",
        accessRulesJson: JSON.stringify({ requiresStepUp: true }),
      });

      // Attempt 1: Without step-up token -> triggers step-up requirement
      const decision1 = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-HIGH-SEC-001",
        deviceId: devTurnstile.id,
        zoneId: zoneVault.id,
      });

      expect(decision1.granted).toBe(false);
      expect(decision1.verificationResult).toBe("step_up_required");
      expect(decision1.stepUpAuthTriggered).toBe(true);

      // Attempt 2: With step-up biometric verification token -> Granted
      const decision2 = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-HIGH-SEC-001",
        deviceId: devTurnstile.id,
        zoneId: zoneVault.id,
        stepUpToken: "valid_biometric_face_token_123",
        stepUpAuthMethod: "biometric",
      });

      expect(decision2.granted).toBe(true);
      expect(decision2.verificationResult).toBe("success");
    });
  });

  describe("Emergency Lockdown Integration", () => {
    it("locks down campus and denies standard badges while permitting emergency override", async () => {
      await GateAccessEngine.registerBadge(tenantA, {
        badgeId: "NFC-REGULAR-USER",
        badgeType: "nfc_card",
        credentialType: "student_id",
      });

      // Activate Emergency Lockdown
      GateAccessEngine.setLockdown(tenantA, {
        isLocked: true,
        reason: "Active Security Alert in Sector 4",
        emergencyType: "active_threat",
      });

      // Regular badge denied
      const regularDecision = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-REGULAR-USER",
        deviceId: devTurnstile.id,
      });

      expect(regularDecision.granted).toBe(false);
      expect(regularDecision.verificationResult).toBe("locked_down");
      expect(regularDecision.reason).toContain("Active Security Alert");

      // Emergency responder with override permitted
      const emergencyDecision = await GateAccessEngine.verifyAccess(tenantA, {
        badgeId: "NFC-REGULAR-USER",
        deviceId: devTurnstile.id,
        emergencyOverride: true,
      });

      expect(emergencyDecision.granted).toBe(true);
      expect(emergencyDecision.verificationResult).toBe("success");
      expect(emergencyDecision.emergencyOverride).toBe(true);
    });
  });
});
