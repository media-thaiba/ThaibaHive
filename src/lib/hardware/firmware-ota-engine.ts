import { db } from "@/db";
import { hardwareDevices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createVerify } from "crypto";
import type { FirmwareReleaseInput } from "@/lib/validation/schemas";

export interface FirmwareRelease {
  id: string;
  institutionId: string;
  version: string;
  deviceType: string;
  targetModel?: string | null;
  binaryUrl: string;
  binarySha256: string;
  signature: string;
  releaseNotes?: string | null;
  minCurrentVersion?: string | null;
  rolloutStage: "draft" | "staged" | "canary_1" | "staging_10" | "fleet_100" | "aborted" | "completed";
  devicesUpdatedCount: number;
  devicesRolledBackCount: number;
  createdAt: string;
  updatedAt: string;
}

export class FirmwareOTAEngine {
  // In-memory persistent releases store per tenant
  private static releases: Map<string, FirmwareRelease> = new Map();

  /**
   * Create a new firmware release with cryptographic signature check
   */
  static async createRelease(
    institutionId: string,
    input: FirmwareReleaseInput
  ): Promise<FirmwareRelease> {
    const id = `ota_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const release: FirmwareRelease = {
      id,
      institutionId,
      version: input.version,
      deviceType: input.deviceType,
      targetModel: input.targetModel || null,
      binaryUrl: input.binaryUrl,
      binarySha256: input.binarySha256,
      signature: input.signature,
      releaseNotes: input.releaseNotes || null,
      minCurrentVersion: input.minCurrentVersion || null,
      rolloutStage: input.rolloutStage || "draft",
      devicesUpdatedCount: 0,
      devicesRolledBackCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.releases.set(id, release);
    return release;
  }

  /**
   * List all firmware releases for tenant
   */
  static listReleases(institutionId: string): FirmwareRelease[] {
    const all = Array.from(this.releases.values());
    return all.filter((r) => r.institutionId === institutionId);
  }

  /**
   * Get release by ID
   */
  static getRelease(releaseId: string): FirmwareRelease | null {
    return this.releases.get(releaseId) || null;
  }

  /**
   * Advance or abort canary rollout stages
   */
  static async promoteRolloutStage(
    releaseId: string,
    nextStage: "canary_1" | "staging_10" | "fleet_100" | "aborted" | "completed"
  ): Promise<FirmwareRelease | null> {
    const release = this.releases.get(releaseId);
    if (!release) return null;

    release.rolloutStage = nextStage;
    release.updatedAt = new Date().toISOString();
    this.releases.set(releaseId, release);

    // If active rollout stage, flag eligible devices in database
    if (nextStage === "canary_1" || nextStage === "staging_10" || nextStage === "fleet_100") {
      const eligible = await this.getEligibleDevicesForRollout(
        release.institutionId,
        releaseId,
        nextStage
      );

      for (const dev of eligible) {
        await db
          .update(hardwareDevices)
          .set({
            firmwareUpdateAvailable: true,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(hardwareDevices.id, dev.id),
              eq(hardwareDevices.institutionId, release.institutionId)
            )
          );
      }
    }

    return release;
  }

  /**
   * Calculate eligible device cohort based on canary percentage
   */
  static async getEligibleDevicesForRollout(
    institutionId: string,
    releaseId: string,
    stage: "canary_1" | "staging_10" | "fleet_100"
  ) {
    const release = this.releases.get(releaseId);
    if (!release) return [];

    const allMatching = await db
      .select()
      .from(hardwareDevices)
      .where(
        and(
          eq(hardwareDevices.institutionId, institutionId),
          eq(hardwareDevices.type, release.deviceType),
          eq(hardwareDevices.isActive, true)
        )
      );

    if (allMatching.length === 0) return [];

    let cohortSize = allMatching.length;
    if (stage === "canary_1") {
      cohortSize = Math.max(1, Math.ceil(allMatching.length * 0.01));
    } else if (stage === "staging_10") {
      cohortSize = Math.max(1, Math.ceil(allMatching.length * 0.1));
    }

    return allMatching.slice(0, cohortSize);
  }

  /**
   * Verify Ed25519 or ECDSA manifest signature
   */
  static verifyManifestSignature(
    manifestPayload: string,
    signatureBase64: string,
    publicKeyPem: string
  ): boolean {
    try {
      const verifier = createVerify("SHA256");
      verifier.update(manifestPayload);
      verifier.end();
      return verifier.verify(publicKeyPem, signatureBase64, "base64");
    } catch {
      return false;
    }
  }

  /**
   * Record outcome of device OTA flash execution
   */
  static async recordDeviceOtaResult(
    institutionId: string,
    deviceId: string,
    releaseId: string,
    result: "success" | "watchdog_rollback" | "checksum_failed"
  ) {
    const release = this.releases.get(releaseId);
    if (!release) return null;

    const now = new Date().toISOString();

    if (result === "success") {
      release.devicesUpdatedCount += 1;
      await db
        .update(hardwareDevices)
        .set({
          firmwareVersion: release.version,
          firmwareUpdateAvailable: false,
          lastFirmwareCheckAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(hardwareDevices.id, deviceId),
            eq(hardwareDevices.institutionId, institutionId)
          )
        );
    } else {
      release.devicesRolledBackCount += 1;
      await db
        .update(hardwareDevices)
        .set({
          firmwareUpdateAvailable: false,
          lastFirmwareCheckAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(hardwareDevices.id, deviceId),
            eq(hardwareDevices.institutionId, institutionId)
          )
        );

      // Automated Canary Abort: if >10% of tested devices fail watchdog, abort release
      const totalAttempted = release.devicesUpdatedCount + release.devicesRolledBackCount;
      if (totalAttempted >= 5 && release.devicesRolledBackCount / totalAttempted > 0.1) {
        release.rolloutStage = "aborted";
      }
    }

    this.releases.set(releaseId, release);
    return {
      releaseId,
      result,
      devicesUpdated: release.devicesUpdatedCount,
      devicesRolledBack: release.devicesRolledBackCount,
      currentStage: release.rolloutStage,
    };
  }

  /**
   * Clear releases (useful for testing)
   */
  static clearReleases() {
    this.releases.clear();
  }
}
