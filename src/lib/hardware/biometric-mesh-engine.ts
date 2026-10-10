import { db } from "@/db";
import {
  hardwareBiometricTemplates,
  hardwareBadges,
} from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { createCipheriv, createDecipheriv, randomBytes, createHmac, createHash } from "crypto";

export interface EnrolledTemplateInfo {
  id: string;
  institutionId: string;
  ownerType: string;
  ownerId: string;
  modality: string;
  algorithm: string;
  qualityScore: number;
  status: string;
  enrolledAt: string;
  lastVerifiedAt?: string | null;
}

export interface VerificationResult {
  match: boolean;
  score: number;
  threshold: number;
  matchedOwnerId?: string | null;
  matchedOwnerType?: string | null;
  modality: string;
  templateId?: string | null;
}

export class BiometricMeshEngine {
  private static getKeyBuffer(): Buffer {
    const rawKey =
      process.env.BIOMETRIC_ENCRYPTION_KEY ||
      "thaibahive_biometric_master_aes256_secret_key";
    return createHash("sha256").update(rawKey).digest();
  }

  /**
   * AES-256-GCM Template Vector Encryption
   */
  static encryptTemplate(vector: number[]): { encrypted: string; keyVersion: number } {
    const iv = randomBytes(12); // 96-bit standard IV for GCM
    const key = this.getKeyBuffer();
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const plaintext = JSON.stringify(vector);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");
    const payload = `${iv.toString("hex")}:${authTag}:${ciphertext}`;

    return {
      encrypted: payload,
      keyVersion: 1,
    };
  }

  /**
   * AES-256-GCM Template Vector Decryption
   */
  static decryptTemplate(encryptedPayload: string): number[] {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid biometric template encryption envelope format");
    }

    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");

    const key = this.getKeyBuffer();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  }

  /**
   * Cosine Similarity calculation between two embedding vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generate a cryptographic replay-defense challenge nonce (valid 60 seconds)
   */
  static generateChallenge(deviceId: string): { nonce: string; expiresAt: string } {
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + 60000).toISOString();
    const payload = `${deviceId}:${timestamp}:${randomBytes(8).toString("hex")}`;
    const nonce = Buffer.from(payload).toString("base64url");

    return { nonce, expiresAt };
  }

  /**
   * Verify replay-defense challenge signature
   */
  static verifyChallenge(
    nonce: string,
    signature: string,
    secretKey: string
  ): boolean {
    try {
      const decoded = Buffer.from(nonce, "base64url").toString("utf8");
      const [deviceId, tsStr] = decoded.split(":");
      const ts = parseInt(tsStr, 10);

      // Check timestamp window (within 60s)
      if (Date.now() - ts > 60000 || ts > Date.now() + 5000) {
        return false;
      }

      const expected = createHmac("sha256", secretKey).update(nonce).digest("hex");
      return expected === signature;
    } catch {
      return false;
    }
  }

  /**
   * Enroll a biometric template
   */
  static async enroll(
    institutionId: string,
    input: {
      ownerType: string;
      ownerId: string;
      modality: string;
      templateVector: number[];
      algorithm?: string;
      qualityScore?: number;
      enrolledByDeviceId?: string;
      enrolledByStaffId?: string;
      metadataJson?: string;
    }
  ): Promise<EnrolledTemplateInfo> {
    const id = `hbt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const { encrypted, keyVersion } = this.encryptTemplate(input.templateVector);

    const record = {
      id,
      institutionId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      modality: input.modality,
      encryptedTemplate: encrypted,
      encryptionKeyVersion: keyVersion,
      algorithm: input.algorithm || "facenet-512d-v1",
      qualityScore: input.qualityScore ?? 0.95,
      enrolledAt: now,
      enrolledByDeviceId: input.enrolledByDeviceId || null,
      enrolledByStaffId: input.enrolledByStaffId || null,
      status: "active",
      metadataJson: input.metadataJson || null,
      createdAt: now,
      updatedAt: now,
    };

    // Check if previous template exists for this owner and modality -> deactivate/replace
    await db
      .update(hardwareBiometricTemplates)
      .set({ status: "revoked", updatedAt: now })
      .where(
        and(
          eq(hardwareBiometricTemplates.institutionId, institutionId),
          eq(hardwareBiometricTemplates.ownerType, input.ownerType),
          eq(hardwareBiometricTemplates.ownerId, input.ownerId),
          eq(hardwareBiometricTemplates.modality, input.modality)
        )
      );

    await db.insert(hardwareBiometricTemplates).values(record);

    return {
      id,
      institutionId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      modality: input.modality,
      algorithm: record.algorithm,
      qualityScore: record.qualityScore,
      status: "active",
      enrolledAt: now,
    };
  }

  /**
   * Verify probe vector against enrolled templates
   */
  static async verify(
    institutionId: string,
    input: {
      ownerType?: string;
      ownerId?: string;
      modality?: string;
      probeVector: number[];
      threshold?: number;
    }
  ): Promise<VerificationResult> {
    const modality = input.modality || "face";
    const threshold = input.threshold ?? 0.75;
    const now = new Date().toISOString();

    // 1:1 Match if ownerId is supplied
    if (input.ownerId && input.ownerType) {
      const rows = await db
        .select()
        .from(hardwareBiometricTemplates)
        .where(
          and(
            eq(hardwareBiometricTemplates.institutionId, institutionId),
            eq(hardwareBiometricTemplates.ownerType, input.ownerType),
            eq(hardwareBiometricTemplates.ownerId, input.ownerId),
            eq(hardwareBiometricTemplates.modality, modality),
            eq(hardwareBiometricTemplates.status, "active")
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return {
          match: false,
          score: 0,
          threshold,
          matchedOwnerId: null,
          modality,
        };
      }

      const enrolled = rows[0];
      const templateVector = this.decryptTemplate(enrolled.encryptedTemplate);
      const score = this.cosineSimilarity(input.probeVector, templateVector);

      const isMatch = score >= threshold;

      // Update template stats
      await db
        .update(hardwareBiometricTemplates)
        .set({
          verificationCount: enrolled.verificationCount + 1,
          lastVerifiedAt: now,
          falseRejectCount: isMatch
            ? enrolled.falseRejectCount
            : enrolled.falseRejectCount + 1,
          updatedAt: now,
        })
        .where(eq(hardwareBiometricTemplates.id, enrolled.id));

      return {
        match: isMatch,
        score: Math.round(score * 1000) / 1000,
        threshold,
        matchedOwnerId: isMatch ? enrolled.ownerId : null,
        matchedOwnerType: isMatch ? enrolled.ownerType : null,
        modality,
        templateId: enrolled.id,
      };
    }

    // 1:N Match across institution templates for the given modality
    const allTemplates = await db
      .select()
      .from(hardwareBiometricTemplates)
      .where(
        and(
          eq(hardwareBiometricTemplates.institutionId, institutionId),
          eq(hardwareBiometricTemplates.modality, modality),
          eq(hardwareBiometricTemplates.status, "active")
        )
      );

    let bestScore = -1;
    let bestMatch: (typeof hardwareBiometricTemplates.$inferSelect) | null = null;

    for (const t of allTemplates) {
      try {
        const vec = this.decryptTemplate(t.encryptedTemplate);
        const score = this.cosineSimilarity(input.probeVector, vec);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = t;
        }
      } catch {}
    }

    const isMatch = bestScore >= threshold && bestMatch !== null;

    if (isMatch && bestMatch) {
      await db
        .update(hardwareBiometricTemplates)
        .set({
          verificationCount: bestMatch.verificationCount + 1,
          lastVerifiedAt: now,
          updatedAt: now,
        })
        .where(eq(hardwareBiometricTemplates.id, bestMatch.id));
    }

    return {
      match: isMatch,
      score: Math.max(0, Math.round(bestScore * 1000) / 1000),
      threshold,
      matchedOwnerId: isMatch && bestMatch ? bestMatch.ownerId : null,
      matchedOwnerType: isMatch && bestMatch ? bestMatch.ownerType : null,
      modality,
      templateId: isMatch && bestMatch ? bestMatch.id : null,
    };
  }

  /**
   * Edge differential delta sync
   */
  static async deltaSync(
    institutionId: string,
    options: {
      since?: string;
      modality?: string;
      limit?: number;
    }
  ) {
    const limit = options.limit || 100;
    const conditions = [eq(hardwareBiometricTemplates.institutionId, institutionId)];

    if (options.since) {
      conditions.push(gt(hardwareBiometricTemplates.updatedAt, options.since));
    }
    if (options.modality) {
      conditions.push(eq(hardwareBiometricTemplates.modality, options.modality));
    }

    const records = await db
      .select({
        id: hardwareBiometricTemplates.id,
        ownerType: hardwareBiometricTemplates.ownerType,
        ownerId: hardwareBiometricTemplates.ownerId,
        modality: hardwareBiometricTemplates.modality,
        encryptedTemplate: hardwareBiometricTemplates.encryptedTemplate,
        encryptionKeyVersion: hardwareBiometricTemplates.encryptionKeyVersion,
        algorithm: hardwareBiometricTemplates.algorithm,
        status: hardwareBiometricTemplates.status,
        updatedAt: hardwareBiometricTemplates.updatedAt,
      })
      .from(hardwareBiometricTemplates)
      .where(and(...conditions))
      .orderBy(desc(hardwareBiometricTemplates.updatedAt))
      .limit(limit);

    return {
      syncTimestamp: new Date().toISOString(),
      count: records.length,
      templates: records,
    };
  }

  /**
   * GDPR / FERPA Cryptographic Zeroization & Vector Purging
   */
  static async zeroize(
    institutionId: string,
    input: {
      ownerType: string;
      ownerId: string;
      modality?: string;
      reason: string;
    }
  ): Promise<{ zeroizedCount: number }> {
    const now = new Date().toISOString();
    const conditions = [
      eq(hardwareBiometricTemplates.institutionId, institutionId),
      eq(hardwareBiometricTemplates.ownerType, input.ownerType),
      eq(hardwareBiometricTemplates.ownerId, input.ownerId),
    ];

    if (input.modality) {
      conditions.push(eq(hardwareBiometricTemplates.modality, input.modality));
    }

    // Replace template data with tombstone zeros
    const tombstonePayload = `000000000000:00000000000000000000000000000000:ZEROIZED_TOMBSTONE_${Date.now()}`;

    const updateRes = await db
      .update(hardwareBiometricTemplates)
      .set({
        status: "revoked",
        encryptedTemplate: tombstonePayload,
        metadataJson: JSON.stringify({
          zeroized: true,
          zeroizedAt: now,
          reason: input.reason,
        }),
        updatedAt: now,
      })
      .where(and(...conditions));

    // Update associated badges
    if (input.ownerType === "staff") {
      await db
        .update(hardwareBadges)
        .set({ biometricEnrolled: false, faceTemplateId: null, updatedAt: now })
        .where(
          and(
            eq(hardwareBadges.institutionId, institutionId),
            eq(hardwareBadges.staffId, input.ownerId)
          )
        );
    } else if (input.ownerType === "student") {
      await db
        .update(hardwareBadges)
        .set({ biometricEnrolled: false, faceTemplateId: null, updatedAt: now })
        .where(
          and(
            eq(hardwareBadges.institutionId, institutionId),
            eq(hardwareBadges.studentId, input.ownerId)
          )
        );
    }

    return { zeroizedCount: 1 };
  }
}
