import * as crypto from "crypto";
import {
  createChallenge,
  consumeChallenge,
  generateOTPCode,
  verifyOTPCode,
  verifyWebAuthnAssertion,
  recordFailedAttempt,
  resetFailedAttempts,
  getFailedAttempts,
} from "../../identity/webauthn-service";

describe("WebAuthn Service", () => {
  it("should create and consume challenges", () => {
    const challenge = createChallenge("user1");
    expect(challenge.challengeId).toBeDefined();
    expect(challenge.challenge).toBeDefined();

    const consumed = consumeChallenge(challenge.challengeId);
    expect(consumed).toBeDefined();
    expect(consumed?.userId).toBe("user1");

    // Cannot consume twice
    expect(consumeChallenge(challenge.challengeId)).toBeNull();
  });

  it("should generate and verify OTP", () => {
    const code = generateOTPCode("user2");
    expect(code).toHaveLength(6);

    expect(verifyOTPCode("user2", "invalid")).toBe(false);
    expect(verifyOTPCode("user2", code)).toBe(true);

    // Cannot reuse OTP
    expect(verifyOTPCode("user2", code)).toBe(false);
  });

  it("should verify valid cryptographic WebAuthn assertion", async () => {
    // Generate EC P-256 key pair
    const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }) as string;

    const challenge = createChallenge("user_webauthn_1");
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.get",
        challenge: challenge.challenge,
        origin: "https://thaibahive.edu",
      }),
    ).toString("base64url");

    const authenticatorData = crypto.randomBytes(37).toString("base64url");
    const authDataBuf = Buffer.from(authenticatorData, "base64url");
    const clientDataHash = crypto
      .createHash("sha256")
      .update(Buffer.from(clientDataJSON, "base64url"))
      .digest();
    const signedData = Buffer.concat([authDataBuf, clientDataHash]);

    const signer = crypto.createSign("SHA256");
    signer.update(signedData);
    const signature = signer.sign(keyPair.privateKey).toString("base64url");

    const result = await verifyWebAuthnAssertion(
      challenge.challengeId,
      "user_webauthn_1",
      {
        clientDataJSON,
        authenticatorData,
        signature,
      },
      publicKeyPem,
    );

    expect(result.valid).toBe(true);
  });

  it("should reject WebAuthn assertion when public key is missing or signature invalid", async () => {
    const challenge = createChallenge("user_webauthn_2");
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.get",
        challenge: challenge.challenge,
      }),
    ).toString("base64url");

    // Missing public key -> rejected
    const resNoKey = await verifyWebAuthnAssertion(challenge.challengeId, "user_webauthn_2", {
      clientDataJSON,
    });
    expect(resNoKey.valid).toBe(false);
    expect(resNoKey.error).toContain("No registered WebAuthn credential");

    // Invalid signature -> rejected
    const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }) as string;
    const challenge2 = createChallenge("user_webauthn_2");
    const resBadSig = await verifyWebAuthnAssertion(
      challenge2.challengeId,
      "user_webauthn_2",
      {
        clientDataJSON,
        authenticatorData: "fake_auth_data",
        signature: "fake_signature",
      },
      publicKeyPem,
    );
    expect(resBadSig.valid).toBe(false);
  });

  it("should track and reset failed verification attempts", () => {
    resetFailedAttempts("user_fail_test");
    expect(getFailedAttempts("user_fail_test")).toBe(0);

    expect(recordFailedAttempt("user_fail_test")).toBe(1);
    expect(recordFailedAttempt("user_fail_test")).toBe(2);
    expect(recordFailedAttempt("user_fail_test")).toBe(3);

    resetFailedAttempts("user_fail_test");
    expect(getFailedAttempts("user_fail_test")).toBe(0);
  });
});
