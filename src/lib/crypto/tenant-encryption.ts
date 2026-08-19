import crypto from "crypto";
import { db } from "@/db";
import { institutionEncryptionKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

function getMasterKey(): Buffer {
  const secret = process.env.BIOMETRIC_MASTER_KEY || process.env.TENANT_ENCRYPTION_MASTER_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "test") {
      return crypto.createHash("sha256").update("test-biometric-master-key-32b").digest();
    }
    throw new Error(
      "FATAL: BIOMETRIC_MASTER_KEY (or TENANT_ENCRYPTION_MASTER_KEY) environment variable is missing. " +
        "Refusing to perform tenant encryption operations without dedicated key separation."
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Normalizes raw NFC Tag ID from NDEF colons or HID raw hex into standardized uppercase hex string.
 * e.g. "04:a2:b3:c4" or "04-A2-B3-C4" or "04a2b3c4" -> "04A2B3C4"
 */
export function normalizeNfcTagId(rawTag: string): string {
  if (!rawTag) return "";
  return rawTag.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

/**
 * READ-ONLY: Retrieves an existing tenant's 32-byte AES-256 key from institution_encryption_keys.
 * Throws an Error if the key is missing (e.g. key deleted / crypto-shredded). Does NOT have write side effects.
 */
export async function getTenantKey(institutionId: string): Promise<Buffer> {
  const existing = await db
    .select()
    .from(institutionEncryptionKeys)
    .where(eq(institutionEncryptionKeys.institutionId, institutionId))
    .get();

  if (!existing) {
    throw new Error(`Tenant encryption key not found for institution '${institutionId}'. Data may have been crypto-shredded or uninitialized.`);
  }

  return unwrapTenantKey(existing.encryptedKey);
}

/**
 * ENROLLMENT / WRITE: Retrieves or atomically creates a tenant's random 32-byte AES-256 key.
 * Uses onConflictDoNothing() to prevent race conditions during concurrent initializations.
 */
export async function getOrCreateTenantKey(institutionId: string): Promise<Buffer> {
  const existing = await db
    .select()
    .from(institutionEncryptionKeys)
    .where(eq(institutionEncryptionKeys.institutionId, institutionId))
    .get();

  if (existing) {
    return unwrapTenantKey(existing.encryptedKey);
  }

  const randomKey = crypto.randomBytes(32);
  const wrappedKey = wrapTenantKey(randomKey);

  // Atomic upsert / ignore on conflict to safely handle concurrent initializations
  await db
    .insert(institutionEncryptionKeys)
    .values({
      id: crypto.randomUUID(),
      institutionId,
      encryptedKey: wrappedKey,
      algorithm: "AES-GCM-256",
    })
    .onConflictDoNothing()
    .run();

  // Re-select to retrieve the winning key (whether created by this request or a concurrent one)
  const reRead = await db
    .select()
    .from(institutionEncryptionKeys)
    .where(eq(institutionEncryptionKeys.institutionId, institutionId))
    .get();

  if (!reRead) {
    throw new Error(`Failed to initialize or read tenant encryption key for institution: '${institutionId}'`);
  }

  return unwrapTenantKey(reRead.encryptedKey);
}

/**
 * Encrypts a plaintext string (e.g. face embedding JSON) using the tenant's key in AES-256-GCM.
 * Output format: "iv:authTag:ciphertext" (hex strings separated by colons).
 */
export async function encryptTenantData(institutionId: string, plaintext: string): Promise<string> {
  const key = await getOrCreateTenantKey(institutionId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string in "iv:authTag:ciphertext" format using the tenant's key.
 * Strictly uses read-only getTenantKey() so missing/deleted keys throw directly without recreating rows.
 */
export async function decryptTenantData(institutionId: string, encryptedPayload: string): Promise<string> {
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format. Expected 'iv:authTag:ciphertext'");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = await getTenantKey(institutionId); // READ-ONLY: Throws if shredded/missing
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function wrapTenantKey(rawKey: Buffer): string {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  let encrypted = cipher.update(rawKey);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function unwrapTenantKey(wrappedPayload: string): Buffer {
  const parts = wrappedPayload.split(":");
  if (parts.length !== 3) throw new Error("Invalid wrapped key format");

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const masterKey = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(Buffer.from(ciphertextHex, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}

/**
 * Encrypts sensitive PII field (e.g. Aadhaar, PAN, Bank Account, IFSC) using AES-256-GCM.
 * Output format: "enc:gcm:iv:authTag:ciphertext" or returns input as-is if already encrypted or empty.
 */
export function encryptPiiField(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  if (plaintext.startsWith("enc:gcm:")) return plaintext;
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `enc:gcm:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive PII field if encrypted ("enc:gcm:iv:authTag:ciphertext"), or returns input as-is if unencrypted.
 */
export function decryptPiiField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!ciphertext.startsWith("enc:gcm:")) return ciphertext;

  const parts = ciphertext.split(":");
  if (parts.length !== 5) return ciphertext;

  try {
    const [, , ivHex, authTagHex, encryptedHex] = parts;
    const masterKey = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    return ciphertext;
  }
}

