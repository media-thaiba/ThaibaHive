import crypto from "crypto";

export type JwtSecretPurpose = "session" | "step-up" | "hall-ticket";

const HKDF_SALT = "thaibahive:jwt:salt:v1";

function derivePurposeSecret(masterSecret: string, purpose: JwtSecretPurpose): string {
  if (typeof crypto !== "undefined" && typeof crypto.hkdfSync === "function") {
    const derived = crypto.hkdfSync(
      "sha256",
      Buffer.from(masterSecret, "utf-8"),
      Buffer.from(HKDF_SALT, "utf-8"),
      Buffer.from(`thaibahive:purpose:${purpose}:v1`, "utf-8"),
      32
    );
    return Buffer.from(derived).toString("hex");
  }
  // Fallback using HMAC-SHA256
  const hmac = crypto.createHmac("sha256", masterSecret);
  hmac.update(`thaibahive:purpose:${purpose}:v1`);
  return hmac.digest("hex");
}

export function getJwtSecret(purpose: JwtSecretPurpose = "session"): string {
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret || secret.trim() === "") {
    if (process.env.NODE_ENV === "test") {
      return derivePurposeSecret("test-jwt-secret-key-at-least-32-chars-long-security-thaiba", purpose);
    }
    throw new Error(
      "AUTH_JWT_SECRET is not configured. A cryptographically secure secret (minimum 32 characters) is required."
    );
  }

  if (secret.length < 32) {
    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "AUTH_JWT_SECRET is too short. Minimum 32 characters required for cryptographic security."
      );
    }
  }

  return derivePurposeSecret(secret, purpose);
}

export function getJwtSecretBytes(purpose: JwtSecretPurpose = "session"): Uint8Array {
  return new TextEncoder().encode(getJwtSecret(purpose));
}

export const authConfig = {
  get jwtSecret(): string {
    return getJwtSecret("session");
  },
  sessionExpiry: "7d",
  cookieName: "thaibahive_session",
  passwordRounds: 10,
};
