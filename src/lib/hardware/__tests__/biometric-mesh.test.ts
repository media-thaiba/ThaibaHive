import { BiometricMeshEngine } from "../biometric-mesh-engine";
import { db } from "@/db";
import {
  hardwareBiometricTemplates,
  hardwareBadges,
  institutions,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createHmac } from "crypto";

describe("BiometricMeshEngine", () => {
  const ts = Date.now();
  const tenantA = `inst_bio_a_${ts}`;
  const tenantB = `inst_bio_b_${ts}`;

  // Synthetic 16-dimensional test embeddings
  const faceVectorA = [0.12, 0.45, -0.32, 0.78, 0.05, -0.11, 0.88, -0.42, 0.33, 0.19, -0.65, 0.41, 0.22, -0.08, 0.54, -0.31];
  const faceVectorSimilar = [0.13, 0.44, -0.31, 0.77, 0.06, -0.10, 0.87, -0.41, 0.34, 0.18, -0.64, 0.40, 0.21, -0.07, 0.53, -0.30]; // Slight noise
  const faceVectorDistinct = [-0.85, -0.12, 0.90, -0.22, 0.45, 0.67, -0.33, 0.51, -0.72, -0.38, 0.44, -0.89, -0.15, 0.62, -0.41, 0.73];

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: tenantA, name: "Biometric Campus A", code: `bioa_${ts}` },
      { id: tenantB, name: "Biometric Campus B", code: `biob_${ts}` },
    ]);
  });

  afterAll(async () => {
    await db.delete(hardwareBiometricTemplates).where(inArray(hardwareBiometricTemplates.institutionId, [tenantA, tenantB]));
    await db.delete(hardwareBadges).where(inArray(hardwareBadges.institutionId, [tenantA, tenantB]));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  beforeEach(async () => {
    await db.delete(hardwareBiometricTemplates).where(inArray(hardwareBiometricTemplates.institutionId, [tenantA, tenantB]));
  });

  describe("AES-256-GCM Envelope Encryption & Cryptography", () => {
    it("encrypts and decrypts template vectors losslessly", () => {
      const { encrypted, keyVersion } = BiometricMeshEngine.encryptTemplate(faceVectorA);
      expect(encrypted).toBeDefined();
      expect(keyVersion).toBe(1);

      // Decrypt
      const decrypted = BiometricMeshEngine.decryptTemplate(encrypted);
      expect(decrypted).toEqual(faceVectorA);
    });

    it("throws error when decryption payload format is tampered", () => {
      expect(() => BiometricMeshEngine.decryptTemplate("invalid_envelope")).toThrow();
    });

    it("calculates exact cosine similarity", () => {
      // Self-similarity should be 1.0
      const selfScore = BiometricMeshEngine.cosineSimilarity(faceVectorA, faceVectorA);
      expect(selfScore).toBeCloseTo(1.0, 4);

      // Highly similar probe
      const similarScore = BiometricMeshEngine.cosineSimilarity(faceVectorA, faceVectorSimilar);
      expect(similarScore).toBeGreaterThan(0.95);

      // Distinct face probe
      const distinctScore = BiometricMeshEngine.cosineSimilarity(faceVectorA, faceVectorDistinct);
      expect(distinctScore).toBeLessThan(0.3);
    });
  });

  describe("Replay-Defense Challenge Nonce Protocol", () => {
    it("generates challenge and validates matching HMAC signature", () => {
      const deviceSecret = "terminal_device_shared_secret_key_889";
      const challenge = BiometricMeshEngine.generateChallenge("turnstile_gate_1");

      expect(challenge.nonce).toBeDefined();
      expect(challenge.expiresAt).toBeDefined();

      const signature = createHmac("sha256", deviceSecret).update(challenge.nonce).digest("hex");

      const valid = BiometricMeshEngine.verifyChallenge(
        challenge.nonce,
        signature,
        deviceSecret
      );
      expect(valid).toBe(true);

      const invalid = BiometricMeshEngine.verifyChallenge(
        challenge.nonce,
        "bad_signature_here",
        deviceSecret
      );
      expect(invalid).toBe(false);
    });
  });

  describe("Enrollment, 1:1 and 1:N Vector Matching", () => {
    it("enrolls template and executes successful 1:1 match", async () => {
      const template = await BiometricMeshEngine.enroll(tenantA, {
        ownerType: "staff",
        ownerId: "staff_101",
        modality: "face",
        templateVector: faceVectorA,
      });

      expect(template.id).toBeDefined();
      expect(template.status).toBe("active");

      // Verify matching with similar probe
      const result = await BiometricMeshEngine.verify(tenantA, {
        ownerType: "staff",
        ownerId: "staff_101",
        modality: "face",
        probeVector: faceVectorSimilar,
        threshold: 0.85,
      });

      expect(result.match).toBe(true);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.matchedOwnerId).toBe("staff_101");
    });

    it("rejects non-matching 1:1 probe", async () => {
      await BiometricMeshEngine.enroll(tenantA, {
        ownerType: "student",
        ownerId: "student_202",
        modality: "face",
        templateVector: faceVectorA,
      });

      const result = await BiometricMeshEngine.verify(tenantA, {
        ownerType: "student",
        ownerId: "student_202",
        modality: "face",
        probeVector: faceVectorDistinct,
        threshold: 0.85,
      });

      expect(result.match).toBe(false);
      expect(result.score).toBeLessThan(0.5);
    });

    it("identifies correct owner in 1:N probe scan", async () => {
      await BiometricMeshEngine.enroll(tenantA, {
        ownerType: "staff",
        ownerId: "prof_einstein",
        modality: "face",
        templateVector: faceVectorA,
      });

      await BiometricMeshEngine.enroll(tenantA, {
        ownerType: "staff",
        ownerId: "prof_curie",
        modality: "face",
        templateVector: faceVectorDistinct,
      });

      // 1:N probe for prof_curie
      const result = await BiometricMeshEngine.verify(tenantA, {
        modality: "face",
        probeVector: faceVectorDistinct,
        threshold: 0.85,
      });

      expect(result.match).toBe(true);
      expect(result.matchedOwnerId).toBe("prof_curie");
    });
  });

  describe("Edge Differential Delta Sync & Zeroization", () => {
    it("returns delta sync records for edge terminals", async () => {
      await BiometricMeshEngine.enroll(tenantA, {
        ownerType: "staff",
        ownerId: "staff_delta_1",
        modality: "face",
        templateVector: faceVectorA,
      });

      const delta = await BiometricMeshEngine.deltaSync(tenantA, { limit: 50 });
      expect(delta.count).toBeGreaterThan(0);
      expect(delta.templates[0].encryptedTemplate).toBeDefined();
    });

    it("cryptographically zeroizes and revokes deleted vectors (GDPR/FERPA)", async () => {
      await BiometricMeshEngine.enroll(tenantA, {
        ownerType: "student",
        ownerId: "student_leave_campus",
        modality: "face",
        templateVector: faceVectorA,
      });

      const zeroizeRes = await BiometricMeshEngine.zeroize(tenantA, {
        ownerType: "student",
        ownerId: "student_leave_campus",
        reason: "Graduation GDPR Right-to-Erasure Request",
      });

      expect(zeroizeRes.zeroizedCount).toBe(1);

      // Verify that 1:1 verification now fails
      const verifyAfter = await BiometricMeshEngine.verify(tenantA, {
        ownerType: "student",
        ownerId: "student_leave_campus",
        modality: "face",
        probeVector: faceVectorA,
      });
      expect(verifyAfter.match).toBe(false);

      // Verify database record has tombstone payload
      const rows = await db
        .select()
        .from(hardwareBiometricTemplates)
        .where(
          and(
            eq(hardwareBiometricTemplates.institutionId, tenantA),
            eq(hardwareBiometricTemplates.ownerId, "student_leave_campus")
          )
        );

      expect(rows[0].status).toBe("revoked");
      expect(rows[0].encryptedTemplate).toContain("ZEROIZED_TOMBSTONE");
    });
  });
});
