import { normalizeNfcTagId, encryptTenantData, decryptTenantData, getOrCreateTenantKey } from "../crypto/tenant-encryption";
import { db } from "@/db";
import { institutionEncryptionKeys } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

describe("Phase 1 Tenant Crypto & NFC Normalization", () => {
  const testInstitutionId = "test-inst-" + Date.now();

  beforeAll(async () => {
    await db.run(sql`CREATE TABLE IF NOT EXISTS institution_encryption_keys (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL UNIQUE,
      encrypted_key TEXT NOT NULL,
      algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`);
  });

  afterEach(async () => {
    try {
      await db.delete(institutionEncryptionKeys).where(eq(institutionEncryptionKeys.institutionId, testInstitutionId)).run();
    } catch {
      // Ignore cleanup locks during parallel test teardown
    }
  });

  describe("NFC Tag Normalization", () => {
    it("should normalize colon-separated NDEF hex to uppercase concatenated hex", () => {
      expect(normalizeNfcTagId("04:a2:b3:c4")).toBe("04A2B3C4");
    });

    it("should normalize dashed hex or raw keyboard wedge hex", () => {
      expect(normalizeNfcTagId("04-A2-B3-C4")).toBe("04A2B3C4");
      expect(normalizeNfcTagId("04a2b3c4")).toBe("04A2B3C4");
    });
  });

  describe("Tenant AES-256-GCM Encryption & Crypto-Shredding", () => {
    it("should encrypt and decrypt face embedding vectors correctly", async () => {
      const vectorData = JSON.stringify([0.12, -0.45, 0.98, 0.33]);
      const encrypted = await encryptTenantData(testInstitutionId, vectorData);

      expect(encrypted).toContain(":");
      const parts = encrypted.split(":");
      expect(parts.length).toBe(3); // iv:authTag:ciphertext

      const decrypted = await decryptTenantData(testInstitutionId, encrypted);
      expect(decrypted).toBe(vectorData);
    });

    it("should handle concurrent getOrCreateTenantKey initializations without race condition errors", async () => {
      const concurrentInstId = "concurrent-inst-" + Date.now();
      
      // Simulate two concurrent requests hitting getOrCreateTenantKey at the exact same moment
      const [key1, key2] = await Promise.all([
        getOrCreateTenantKey(concurrentInstId),
        getOrCreateTenantKey(concurrentInstId),
      ]);

      expect(key1).toEqual(key2);

      // Clean up
      await db.delete(institutionEncryptionKeys).where(eq(institutionEncryptionKeys.institutionId, concurrentInstId)).run();
    });

    it("should prove crypto-shredding: deleting institution key permanently invalidates decryption WITHOUT side-effect creation", async () => {
      const sensitiveData = JSON.stringify({ student: "STU-001", vector: [0.1, 0.2, 0.3] });
      const encrypted = await encryptTenantData(testInstitutionId, sensitiveData);

      // Hard-delete institution encryption key (simulate tenant offboarding / crypto-shredding)
      await db.delete(institutionEncryptionKeys).where(eq(institutionEncryptionKeys.institutionId, testInstitutionId)).run();

      // Decryption attempt must fail with "Tenant encryption key not found" error
      await expect(decryptTenantData(testInstitutionId, encrypted)).rejects.toThrow("Tenant encryption key not found");

      // Verify that decryptTenantData DID NOT recreate a row in institution_encryption_keys
      const reCheck = await db
        .select()
        .from(institutionEncryptionKeys)
        .where(eq(institutionEncryptionKeys.institutionId, testInstitutionId))
        .get();

      expect(reCheck).toBeUndefined();
    });
  });

  describe("PII Field AES-256-GCM Encryption", () => {
    it("should encrypt and decrypt Aadhaar and PAN fields correctly", () => {
      const { encryptPiiField, decryptPiiField } = require("../crypto/tenant-encryption");
      const aadhaar = "1234-5678-9012";
      const pan = "ABCDE1234F";

      const encAadhaar = encryptPiiField(aadhaar);
      const encPan = encryptPiiField(pan);

      expect(encAadhaar).toContain("enc:gcm:");
      expect(encPan).toContain("enc:gcm:");

      expect(decryptPiiField(encAadhaar)).toBe(aadhaar);
      expect(decryptPiiField(encPan)).toBe(pan);
    });

    it("should safely handle null/undefined and unencrypted fallback strings", () => {
      const { encryptPiiField, decryptPiiField } = require("../crypto/tenant-encryption");
      expect(encryptPiiField(null)).toBeNull();
      expect(encryptPiiField(undefined)).toBeNull();
      expect(decryptPiiField(null)).toBeNull();
      expect(decryptPiiField("unencrypted-legacy-val")).toBe("unencrypted-legacy-val");
    });
  });
});

