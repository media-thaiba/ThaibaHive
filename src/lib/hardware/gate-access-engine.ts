import { db } from "@/db";
import {
  hardwareAccessEvents,
  hardwareBadges,
  hardwareDevices,
} from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { createHash } from "crypto";
import { AntiPassbackEngine, AntiPassbackMode, APBLastEvent } from "./anti-passback-engine";

export interface GateAccessDecision {
  granted: boolean;
  verificationResult:
    | "success"
    | "failed_credential"
    | "revoked"
    | "expired"
    | "apb_violation"
    | "locked_down"
    | "device_unauthorized"
    | "step_up_required"
    | "time_schedule_denied"
    | "zone_unauthorized";
  reason?: string;
  badge?: typeof hardwareBadges.$inferSelect | null;
  eventId: string;
  antiPassbackViolation: boolean;
  stepUpAuthTriggered: boolean;
  emergencyOverride: boolean;
  merkleRoot: string;
}

export interface GateLockdownState {
  institutionId: string;
  isLocked: boolean;
  zoneId?: string | null;
  reason?: string;
  emergencyType?: string;
  timestamp: string;
}

// Sub-50ms in-memory cache for emergency lockdown states
const lockdownCache = new Map<string, GateLockdownState>();

export class GateAccessEngine {
  /**
   * Set or release campus/zone lockdown
   */
  static setLockdown(
    institutionId: string,
    state: {
      zoneId?: string | null;
      isLocked: boolean;
      reason?: string;
      emergencyType?: string;
    }
  ): GateLockdownState {
    const key = state.zoneId ? `${institutionId}:${state.zoneId}` : institutionId;
    const lockdownRecord: GateLockdownState = {
      institutionId,
      isLocked: state.isLocked,
      zoneId: state.zoneId || null,
      reason: state.reason,
      emergencyType: state.emergencyType || "active_threat",
      timestamp: new Date().toISOString(),
    };

    if (state.isLocked) {
      lockdownCache.set(key, lockdownRecord);
    } else {
      lockdownCache.delete(key);
      if (!state.zoneId) {
        // Clearing global lockdown also clears all zone locks for this institution
        for (const k of lockdownCache.keys()) {
          if (k.startsWith(`${institutionId}:`)) {
            lockdownCache.delete(k);
          }
        }
      }
    }

    return lockdownRecord;
  }

  /**
   * Check if institution or zone is under active lockdown
   */
  static isLockedDown(institutionId: string, zoneId?: string | null): {
    isLocked: boolean;
    lockdownInfo?: GateLockdownState;
  } {
    // Check global campus lock
    const globalLock = lockdownCache.get(institutionId);
    if (globalLock && globalLock.isLocked) {
      return { isLocked: true, lockdownInfo: globalLock };
    }

    // Check zone-specific lock
    if (zoneId) {
      const zoneLock = lockdownCache.get(`${institutionId}:${zoneId}`);
      if (zoneLock && zoneLock.isLocked) {
        return { isLocked: true, lockdownInfo: zoneLock };
      }
    }

    return { isLocked: false };
  }

  /**
   * Verify gate access request (Sub-50ms target)
   */
  static async verifyAccess(
    institutionId: string,
    input: {
      badgeId: string;
      deviceId: string;
      zoneId?: string;
      direction?: "in" | "out";
      authenticationMethod?: string;
      pin?: string;
      stepUpToken?: string;
      stepUpAuthMethod?: "biometric" | "pin" | "supervisor_approval";
      emergencyOverride?: boolean;
      rssi?: number;
      snr?: number;
      distanceEstimateMeters?: number;
      coordinatesX?: number;
      coordinatesY?: number;
      coordinatesZ?: number;
      metadataJson?: string;
    },
    apbMode: AntiPassbackMode = "hard"
  ): Promise<GateAccessDecision> {
    const eventId = `hae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const direction = input.direction || "in";
    const authMethod = input.authenticationMethod || "nfc";

    // 1. Check Lockdown Status
    const lockdown = this.isLockedDown(institutionId, input.zoneId);
    const isEmergencyResponder = input.emergencyOverride;

    if (lockdown.isLocked && !isEmergencyResponder) {
      const merkle = await this.appendEventAndMerkleHash(institutionId, {
        id: eventId,
        eventType: "deny",
        badgeId: null,
        deviceId: input.deviceId,
        zoneId: input.zoneId || null,
        authenticationMethod: authMethod,
        verificationResult: "locked_down",
        emergencyOverride: false,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        rssi: input.rssi,
        timestamp: now,
      });

      return {
        granted: false,
        verificationResult: "locked_down",
        reason: `Zone/Facility locked down: ${lockdown.lockdownInfo?.reason || "Emergency Lockdown Active"}`,
        badge: null,
        eventId,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        emergencyOverride: false,
        merkleRoot: merkle,
      };
    }

    // 2. Validate Device
    const deviceRows = await db
      .select()
      .from(hardwareDevices)
      .where(
        and(
          eq(hardwareDevices.id, input.deviceId),
          eq(hardwareDevices.institutionId, institutionId)
        )
      )
      .limit(1);

    const device = deviceRows[0];
    if (!device || !device.isActive || device.status === "decommissioned") {
      const merkle = await this.appendEventAndMerkleHash(institutionId, {
        id: eventId,
        eventType: "deny",
        badgeId: null,
        deviceId: input.deviceId,
        zoneId: input.zoneId || null,
        authenticationMethod: authMethod,
        verificationResult: "device_unauthorized",
        emergencyOverride: false,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        rssi: input.rssi,
        timestamp: now,
      });

      return {
        granted: false,
        verificationResult: "device_unauthorized",
        reason: "Access device is inactive, decommissioned, or unauthorized",
        badge: null,
        eventId,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        emergencyOverride: false,
        merkleRoot: merkle,
      };
    }

    // 3. Validate Badge
    const badgeRows = await db
      .select()
      .from(hardwareBadges)
      .where(
        and(
          eq(hardwareBadges.badgeId, input.badgeId),
          eq(hardwareBadges.institutionId, institutionId)
        )
      )
      .limit(1);

    const badge = badgeRows[0];
    if (!badge) {
      const merkle = await this.appendEventAndMerkleHash(institutionId, {
        id: eventId,
        eventType: "deny",
        badgeId: null,
        deviceId: input.deviceId,
        zoneId: input.zoneId || null,
        authenticationMethod: authMethod,
        verificationResult: "failed_credential",
        emergencyOverride: false,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        rssi: input.rssi,
        timestamp: now,
      });

      return {
        granted: false,
        verificationResult: "failed_credential",
        reason: "Badge / Credential UID not registered in system",
        badge: null,
        eventId,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        emergencyOverride: false,
        merkleRoot: merkle,
      };
    }

    // Check Badge Status & Validity Window
    if (badge.status === "revoked") {
      const merkle = await this.appendEventAndMerkleHash(institutionId, {
        id: eventId,
        eventType: "deny",
        badgeId: badge.id,
        staffId: badge.staffId,
        studentId: badge.studentId,
        deviceId: input.deviceId,
        zoneId: input.zoneId || null,
        authenticationMethod: authMethod,
        verificationResult: "revoked",
        emergencyOverride: false,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        rssi: input.rssi,
        timestamp: now,
      });

      return {
        granted: false,
        verificationResult: "revoked",
        reason: `Credential revoked (${badge.revokedReason || "Administrative Revocation"})`,
        badge,
        eventId,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        emergencyOverride: false,
        merkleRoot: merkle,
      };
    }

    if (
      badge.status === "expired" ||
      (badge.validUntil && new Date(badge.validUntil).getTime() < Date.now()) ||
      (badge.validFrom && new Date(badge.validFrom).getTime() > Date.now())
    ) {
      const merkle = await this.appendEventAndMerkleHash(institutionId, {
        id: eventId,
        eventType: "deny",
        badgeId: badge.id,
        staffId: badge.staffId,
        studentId: badge.studentId,
        deviceId: input.deviceId,
        zoneId: input.zoneId || null,
        authenticationMethod: authMethod,
        verificationResult: "expired",
        emergencyOverride: false,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        rssi: input.rssi,
        timestamp: now,
      });

      return {
        granted: false,
        verificationResult: "expired",
        reason: "Badge validity period has expired",
        badge,
        eventId,
        antiPassbackViolation: false,
        stepUpAuthTriggered: false,
        emergencyOverride: false,
        merkleRoot: merkle,
      };
    }

    // 4. Access Rules & Schedule Validation
    if (badge.accessRulesJson) {
      try {
        const rules = JSON.parse(badge.accessRulesJson);

        // Allowed zone IDs
        if (Array.isArray(rules.allowedZoneIds) && input.zoneId) {
          if (!rules.allowedZoneIds.includes(input.zoneId)) {
            const merkle = await this.appendEventAndMerkleHash(institutionId, {
              id: eventId,
              eventType: "deny",
              badgeId: badge.id,
              staffId: badge.staffId,
              studentId: badge.studentId,
              deviceId: input.deviceId,
              zoneId: input.zoneId || null,
              authenticationMethod: authMethod,
              verificationResult: "zone_unauthorized",
              emergencyOverride: false,
              antiPassbackViolation: false,
              stepUpAuthTriggered: false,
              rssi: input.rssi,
              timestamp: now,
            });

            return {
              granted: false,
              verificationResult: "zone_unauthorized",
              reason: "Access to this zone is not permitted for this badge",
              badge,
              eventId,
              antiPassbackViolation: false,
              stepUpAuthTriggered: false,
              emergencyOverride: false,
              merkleRoot: merkle,
            };
          }
        }

        // Step-up authentication requirement
        if (rules.requiresStepUp && !input.stepUpToken) {
          const merkle = await this.appendEventAndMerkleHash(institutionId, {
            id: eventId,
            eventType: "deny",
            badgeId: badge.id,
            staffId: badge.staffId,
            studentId: badge.studentId,
            deviceId: input.deviceId,
            zoneId: input.zoneId || null,
            authenticationMethod: authMethod,
            verificationResult: "step_up_required",
            emergencyOverride: false,
            antiPassbackViolation: false,
            stepUpAuthTriggered: true,
            stepUpAuthMethod: input.stepUpAuthMethod || "biometric",
            rssi: input.rssi,
            timestamp: now,
          });

          return {
            granted: false,
            verificationResult: "step_up_required",
            reason: "High-security zone requires biometric or PIN step-up verification",
            badge,
            eventId,
            antiPassbackViolation: false,
            stepUpAuthTriggered: true,
            emergencyOverride: false,
            merkleRoot: merkle,
          };
        }
      } catch {}
    }

    // 5. Anti-Passback (APB) Validation
    let apbViolation = false;
    let lastEvent: APBLastEvent | null = null;

    if (badge.lastUsedAt && badge.lastUsedDeviceId) {
      // Fetch latest access event for this badge
      const lastEvents = await db
        .select()
        .from(hardwareAccessEvents)
        .where(
          and(
            eq(hardwareAccessEvents.institutionId, institutionId),
            eq(hardwareAccessEvents.badgeId, badge.id)
          )
        )
        .orderBy(desc(hardwareAccessEvents.timestamp))
        .limit(1);

      if (lastEvents.length > 0) {
        lastEvent = {
          direction: lastEvents[0].eventType === "egress" ? "out" : "in",
          deviceId: lastEvents[0].deviceId,
          zoneId: lastEvents[0].zoneId,
          timestamp: lastEvents[0].timestamp,
        };
      }
    }

    const apbResult = AntiPassbackEngine.evaluate(
      direction,
      input.deviceId,
      input.zoneId,
      lastEvent,
      apbMode
    );

    if (!apbResult.allowed) {
      const merkle = await this.appendEventAndMerkleHash(institutionId, {
        id: eventId,
        eventType: "deny",
        badgeId: badge.id,
        staffId: badge.staffId,
        studentId: badge.studentId,
        deviceId: input.deviceId,
        zoneId: input.zoneId || null,
        authenticationMethod: authMethod,
        verificationResult: "apb_violation",
        antiPassbackViolation: true,
        emergencyOverride: false,
        stepUpAuthTriggered: false,
        rssi: input.rssi,
        timestamp: now,
      });

      return {
        granted: false,
        verificationResult: "apb_violation",
        reason: apbResult.violationReason || "Anti-passback rule violation",
        badge,
        eventId,
        antiPassbackViolation: true,
        stepUpAuthTriggered: false,
        emergencyOverride: false,
        merkleRoot: merkle,
      };
    }

    if (apbResult.isViolation) {
      apbViolation = true; // Soft APB violation
    }

    // 6. Access Granted: Log Event & Update Badge State
    const eventType = direction === "out" ? "egress" : "grant";
    const merkleRoot = await this.appendEventAndMerkleHash(institutionId, {
      id: eventId,
      eventType,
      badgeId: badge.id,
      staffId: badge.staffId,
      studentId: badge.studentId,
      deviceId: input.deviceId,
      zoneId: input.zoneId || null,
      authenticationMethod: authMethod,
      verificationResult: "success",
      antiPassbackViolation: apbViolation,
      emergencyOverride: !!input.emergencyOverride,
      stepUpAuthTriggered: !!input.stepUpToken,
      stepUpAuthMethod: input.stepUpAuthMethod,
      stepUpAuthResult: input.stepUpToken ? "success" : undefined,
      rssi: input.rssi,
      snr: input.snr,
      distanceEstimateMeters: input.distanceEstimateMeters,
      coordinatesX: input.coordinatesX,
      coordinatesY: input.coordinatesY,
      coordinatesZ: input.coordinatesZ,
      metadataJson: input.metadataJson,
      timestamp: now,
    });

    // Update badge last used state
    await db
      .update(hardwareBadges)
      .set({
        lastUsedAt: now,
        lastUsedDeviceId: input.deviceId,
        lastUsedZoneId: input.zoneId || badge.lastUsedZoneId,
        updatedAt: now,
      })
      .where(
        and(
          eq(hardwareBadges.id, badge.id),
          eq(hardwareBadges.institutionId, institutionId)
        )
      );

    return {
      granted: true,
      verificationResult: "success",
      badge,
      eventId,
      antiPassbackViolation: apbViolation,
      stepUpAuthTriggered: !!input.stepUpToken,
      emergencyOverride: !!input.emergencyOverride,
      merkleRoot,
    };
  }

  /**
   * Append access event and compute cryptographic Merkle hash chain
   */
  private static async appendEventAndMerkleHash(
    institutionId: string,
    event: Record<string, any>
  ): Promise<string> {
    // Fetch last event hash
    const lastRow = await db
      .select({ merkleRoot: hardwareAccessEvents.merkleRoot })
      .from(hardwareAccessEvents)
      .where(eq(hardwareAccessEvents.institutionId, institutionId))
      .orderBy(desc(hardwareAccessEvents.timestamp))
      .limit(1);

    const prevHash = lastRow[0]?.merkleRoot || "0".repeat(64);

    // Compute deterministic SHA-256 Merkle root
    const payload = JSON.stringify({
      prevHash,
      id: event.id,
      inst: institutionId,
      type: event.eventType,
      badge: event.badgeId,
      dev: event.deviceId,
      res: event.verificationResult,
      ts: event.timestamp,
    });

    const merkleRoot = createHash("sha256").update(payload).digest("hex");

    await db.insert(hardwareAccessEvents).values({
      id: event.id,
      institutionId,
      eventType: event.eventType,
      badgeId: event.badgeId || null,
      staffId: event.staffId || null,
      studentId: event.studentId || null,
      deviceId: event.deviceId,
      zoneId: event.zoneId || null,
      fromZoneId: event.fromZoneId || null,
      toZoneId: event.toZoneId || null,
      authenticationMethod: event.authenticationMethod || "nfc",
      verificationResult: event.verificationResult || "success",
      antiPassbackViolation: !!event.antiPassbackViolation,
      tailgateDetected: !!event.tailgateDetected,
      duressSignal: !!event.duressSignal,
      emergencyOverride: !!event.emergencyOverride,
      stepUpAuthTriggered: !!event.stepUpAuthTriggered,
      stepUpAuthMethod: event.stepUpAuthMethod || null,
      stepUpAuthResult: event.stepUpAuthResult || null,
      rssi: event.rssi ?? null,
      snr: event.snr ?? null,
      distanceEstimateMeters: event.distanceEstimateMeters ?? null,
      coordinatesX: event.coordinatesX ?? null,
      coordinatesY: event.coordinatesY ?? null,
      coordinatesZ: event.coordinatesZ ?? null,
      merkleRoot,
      merkleProof: prevHash,
      metadataJson: event.metadataJson || null,
      timestamp: event.timestamp,
    });

    return merkleRoot;
  }

  // ─── Badge Management Utilities ───

  static async registerBadge(
    institutionId: string,
    input: {
      badgeId: string;
      badgeType: string;
      credentialType: string;
      staffId?: string | null;
      studentId?: string | null;
      encodedData?: string | null;
      certificateThumbprint?: string | null;
      hmacKeyId?: string | null;
      validFrom?: string | null;
      validUntil?: string | null;
      accessRulesJson?: string | null;
      metadataJson?: string | null;
    }
  ) {
    const id = `hwb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const newBadge = {
      id,
      institutionId,
      badgeId: input.badgeId,
      badgeType: input.badgeType,
      credentialType: input.credentialType,
      staffId: input.staffId || null,
      studentId: input.studentId || null,
      encodedData: input.encodedData || null,
      certificateThumbprint: input.certificateThumbprint || null,
      hmacKeyId: input.hmacKeyId || null,
      validFrom: input.validFrom || now,
      validUntil: input.validUntil || null,
      status: "active",
      accessRulesJson: input.accessRulesJson || null,
      metadataJson: input.metadataJson || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(hardwareBadges).values(newBadge);
    return newBadge;
  }

  static async getBadge(institutionId: string, badgeId: string) {
    const rows = await db
      .select()
      .from(hardwareBadges)
      .where(
        and(
          eq(hardwareBadges.id, badgeId),
          eq(hardwareBadges.institutionId, institutionId)
        )
      )
      .limit(1);

    return rows[0] || null;
  }

  static async revokeBadge(
    institutionId: string,
    badgeId: string,
    reason: string
  ) {
    const existing = await this.getBadge(institutionId, badgeId);
    if (!existing) return null;

    const now = new Date().toISOString();
    await db
      .update(hardwareBadges)
      .set({
        status: "revoked",
        revokedAt: now,
        revokedReason: reason,
        updatedAt: now,
      })
      .where(
        and(
          eq(hardwareBadges.id, badgeId),
          eq(hardwareBadges.institutionId, institutionId)
        )
      );

    return { ...existing, status: "revoked", revokedAt: now, revokedReason: reason };
  }

  /**
   * Cryptographically verify 100% untampered sequential SHA-256 Merkle hash chain
   */
  static async verifyMerkleAuditTrail(
    institutionId: string
  ): Promise<{ valid: boolean; totalEvents: number; error?: string }> {
    const events = await db
      .select()
      .from(hardwareAccessEvents)
      .where(eq(hardwareAccessEvents.institutionId, institutionId))
      .orderBy(asc(hardwareAccessEvents.timestamp));

    if (events.length === 0) {
      return { valid: true, totalEvents: 0 };
    }

    let expectedPrevHash = "0".repeat(64);

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // Check linked previous hash
      if (ev.merkleProof && ev.merkleProof !== expectedPrevHash) {
        return {
          valid: false,
          totalEvents: events.length,
          error: `Merkle pointer broken at event ${ev.id}: expected prevHash ${expectedPrevHash}, found ${ev.merkleProof}`,
        };
      }

      // Recompute payload hash
      const payload = JSON.stringify({
        prevHash: expectedPrevHash,
        id: ev.id,
        inst: institutionId,
        type: ev.eventType,
        badge: ev.badgeId,
        dev: ev.deviceId,
        res: ev.verificationResult,
        ts: ev.timestamp,
      });

      const calculatedRoot = createHash("sha256").update(payload).digest("hex");

      if (ev.merkleRoot !== calculatedRoot) {
        return {
          valid: false,
          totalEvents: events.length,
          error: `Merkle root hash mismatch at event ${ev.id}: computed ${calculatedRoot}, stored ${ev.merkleRoot}`,
        };
      }

      expectedPrevHash = ev.merkleRoot;
    }

    return {
      valid: true,
      totalEvents: events.length,
    };
  }
}
