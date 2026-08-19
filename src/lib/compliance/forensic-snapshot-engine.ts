import { db } from "@/db";
import { staff, institutions, auditMerkleRoots, forensicSnapshots } from "@thaiba/db/schema";
import { eq, desc } from "drizzle-orm";
import { 
  ForensicSnapshotManifest, 
  SnapshotType 
} from "./types";
import { 
  computeCanonicalChecksum, 
  signSnapshotData, 
  verifySnapshotSignature 
} from "./snapshot-signer";
import { snapshotStorageManager } from "./snapshot-storage";
import crypto from "crypto";

export class ForensicSnapshotEngine {
  /**
   * Captures an immutable, cryptographically signed point-in-time state snapshot
   */
  async captureSnapshot(params: {
    tenantId?: string;
    snapshotType?: SnapshotType;
    metadata?: Record<string, any>;
  }): Promise<ForensicSnapshotManifest> {
    const tenantId = params.tenantId || "default";
    const snapshotType = params.snapshotType || "SCHEDULED";
    const timestamp = new Date().toISOString();
    const snapshotId = `snp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 1. Collect Active Users and RBAC roles
    let usersAndRoles: Array<{ id: string; email: string; role: string; isActive: boolean }> = [];
    try {
      const staffMembers = await db
        .select({
          id: staff.id,
          email: staff.email,
          role: staff.role,
          isActive: staff.isActive,
        })
        .from(staff);
      usersAndRoles = staffMembers.map((s) => ({
        id: s.id,
        email: s.email,
        role: s.role,
        isActive: Boolean(s.isActive),
      }));
    } catch {
      usersAndRoles = [];
    }

    // 2. Collect Institution Configurations
    let instConfig: any[] = [];
    try {
      const insts = await db
        .select({
          id: institutions.id,
          name: institutions.name,
          code: institutions.code,
          type: institutions.type,
          allocatedBudget: institutions.allocatedBudget,
          fiscalYear: institutions.fiscalYear,
          isActive: institutions.isActive,
        })
        .from(institutions)
        .where(tenantId !== "all" && tenantId !== "default" ? eq(institutions.id, tenantId) : undefined);
      instConfig = insts;
    } catch {
      instConfig = [];
    }

    // 3. Collect Recent Merkle Audit Roots
    let roots: Array<{ id: string; rootHash: string; leafCount: number; createdAt: string }> = [];
    try {
      const dbRoots = await db
        .select({
          id: auditMerkleRoots.id,
          rootHash: auditMerkleRoots.rootHash,
          leafCount: auditMerkleRoots.leafCount,
          createdAt: auditMerkleRoots.createdAt,
        })
        .from(auditMerkleRoots)
        .where(tenantId !== "all" ? eq(auditMerkleRoots.tenantId, tenantId) : undefined)
        .orderBy(desc(auditMerkleRoots.createdAt))
        .limit(20);
      roots = dbRoots;
    } catch {
      roots = [];
    }

    const state = {
      usersAndRoles,
      institutionConfig: instConfig,
      financeLedgerSummary: {
        totalBalance: instConfig.reduce((acc, curr) => acc + (Number(curr.allocatedBudget) || 0), 0),
        accountCount: instConfig.length,
        transactionCount: roots.reduce((acc, curr) => acc + (curr.leafCount || 0), 0),
      },
      auditRoots: roots,
    };

    const rawManifest = {
      id: snapshotId,
      tenantId,
      snapshotType,
      timestamp,
      version: "3.20.0",
      entityCounts: {
        users: usersAndRoles.length,
        institutions: instConfig.length,
        auditRoots: roots.length,
      },
      state,
    };

    const checksumSha256 = computeCanonicalChecksum(rawManifest);
    const { signature, publicKey } = signSnapshotData(checksumSha256);

    const fullManifest: ForensicSnapshotManifest = {
      ...rawManifest,
      checksumSha256,
      signature,
      signerPublicKey: publicKey,
    };

    // Store in storage subsystem
    const storageUri = await snapshotStorageManager.save(fullManifest);

    // Save record to DB
    try {
      await db.insert(forensicSnapshots).values({
        id: snapshotId,
        tenantId,
        snapshotType,
        storageUri,
        checksumSha256,
        signature,
        signerPublicKey: publicKey,
        entityCounts: JSON.stringify(fullManifest.entityCounts),
        metadata: JSON.stringify(params.metadata || {}),
        status: "ACTIVE",
        retentionTier: "HOT",
        createdAt: timestamp,
      });
    } catch (dbErr) {
      console.warn("[@thaiba/compliance] Failed to record snapshot in database:", dbErr);
    }

    return fullManifest;
  }

  /**
   * Verifies the authenticity and integrity of a snapshot manifest
   */
  verifySnapshot(manifest: ForensicSnapshotManifest): { valid: boolean; error?: string } {
    if (!manifest.signature || !manifest.signerPublicKey) {
      return { valid: false, error: "Missing digital signature or signer public key" };
    }

    const { signature, signerPublicKey, checksumSha256, ...dataToVerify } = manifest;
    const recomputedChecksum = computeCanonicalChecksum(dataToVerify);

    if (recomputedChecksum !== checksumSha256) {
      return {
        valid: false,
        error: `Checksum mismatch: recomputed ${recomputedChecksum} !== recorded ${checksumSha256}`,
      };
    }

    const isSignatureValid = verifySnapshotSignature(checksumSha256, signature, signerPublicKey);
    if (!isSignatureValid) {
      return { valid: false, error: "Cryptographic digital signature verification failed" };
    }

    return { valid: true };
  }
}

export const forensicSnapshotEngine = new ForensicSnapshotEngine();
