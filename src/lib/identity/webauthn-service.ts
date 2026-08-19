import * as crypto from "crypto";
import { WebAuthnAttestationValidator, AttestationStatement, AttestationValidationResult } from "./webauthn-attestation";

export interface WebAuthnChallenge {
  challengeId: string;
  challenge: string;
  userId: string;
  expiresAt: number;
  used: boolean;
}

export interface WebAuthnAssertionResponse {
  clientDataJSON: string;
  authenticatorData?: string;
  signature?: string;
  userHandle?: string;
}

const challengeCache = new Map<string, WebAuthnChallenge>();
const otpCache = new Map<string, { code: string; expiresAt: number }>();
const failedAttemptsMap = new Map<string, number>();

const CHALLENGE_TTL_MS = 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 3;

export function generateChallenge(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function createChallenge(userId: string): WebAuthnChallenge {
  const challengeId = crypto.randomUUID();
  const challengeStr = generateChallenge();

  const challenge: WebAuthnChallenge = {
    challengeId,
    challenge: challengeStr,
    userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    used: false,
  };

  challengeCache.set(challengeId, challenge);
  return challenge;
}

export function consumeChallenge(challengeId: string): WebAuthnChallenge | null {
  const challenge = challengeCache.get(challengeId);
  if (!challenge) return null;

  if (Date.now() > challenge.expiresAt || challenge.used) {
    challengeCache.delete(challengeId);
    return null;
  }

  challenge.used = true;
  return challenge;
}

export function generateOTPCode(userId: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpCache.set(userId, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  return code;
}

export function verifyOTPCode(userId: string, code: string): boolean {
  const entry = otpCache.get(userId);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    otpCache.delete(userId);
    return false;
  }

  if (entry.code === code) {
    otpCache.delete(userId);
    failedAttemptsMap.delete(userId);
    return true;
  }

  const currentFailed = (failedAttemptsMap.get(userId) || 0) + 1;
  failedAttemptsMap.set(userId, currentFailed);
  return false;
}

export function recordFailedAttempt(userId: string): number {
  const count = (failedAttemptsMap.get(userId) || 0) + 1;
  failedAttemptsMap.set(userId, count);
  return count;
}

export function resetFailedAttempts(userId: string): void {
  failedAttemptsMap.delete(userId);
}

export function getFailedAttempts(userId: string): number {
  return failedAttemptsMap.get(userId) || 0;
}

/**
 * Validates a WebAuthn registration attestation statement (Sprint-038 / TD-011).
 */
export function verifyWebAuthnRegistrationAttestation(statement: AttestationStatement): AttestationValidationResult {
  return WebAuthnAttestationValidator.validate(statement);
}

/**
 * Validates a WebAuthn get assertion response against the issued challenge.
 * Cryptographic signature verification with registered public key is strictly mandatory.
 */
export async function verifyWebAuthnAssertion(
  challengeId: string,
  userId: string,
  response: WebAuthnAssertionResponse,
  publicKeyPemOrJwk?: string | crypto.KeyObject,
): Promise<{ valid: boolean; error?: string }> {
  const challenge = consumeChallenge(challengeId);
  if (!challenge || challenge.userId !== userId) {
    return { valid: false, error: "Invalid or expired challenge" };
  }

  if (!response || !response.clientDataJSON) {
    return { valid: false, error: "Missing clientDataJSON in WebAuthn response" };
  }

  if (!publicKeyPemOrJwk) {
    return { valid: false, error: "No registered WebAuthn credential found for this user" };
  }

  if (!response.authenticatorData || !response.signature) {
    return { valid: false, error: "Missing authenticatorData or signature in WebAuthn assertion" };
  }

  try {
    const clientDataJsonStr = Buffer.from(response.clientDataJSON, "base64url").toString("utf8");
    const clientData = JSON.parse(clientDataJsonStr);

    if (clientData.type !== "webauthn.get") {
      return { valid: false, error: "Invalid clientData type" };
    }

    if (clientData.challenge !== challenge.challenge) {
      return { valid: false, error: "Challenge mismatch" };
    }

    const authData = Buffer.from(response.authenticatorData, "base64url");
    const clientDataHash = crypto
      .createHash("sha256")
      .update(Buffer.from(response.clientDataJSON, "base64url"))
      .digest();
    const signedData = Buffer.concat([authData, clientDataHash]);

    const verifier = crypto.createVerify("SHA256");
    verifier.update(signedData);
    const isSigValid = verifier.verify(publicKeyPemOrJwk, Buffer.from(response.signature, "base64url"));
    if (!isSigValid) {
      return { valid: false, error: "Invalid WebAuthn signature" };
    }

    return { valid: true };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : "Assertion verification error" };
  }
}
