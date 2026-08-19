/**
 * Unit Tests for WebAuthnAttestationValidator
 * Sprint-038 / AGS-017 (TD-011)
 */

import { WebAuthnAttestationValidator } from "../../identity/webauthn-attestation";

describe("WebAuthnAttestationValidator (AGS-017 / TD-011)", () => {
  it("should successfully validate 'none' attestation format", () => {
    const res = WebAuthnAttestationValidator.validate({
      fmt: "none",
      attStmt: {},
    });

    expect(res.valid).toBe(true);
    expect(res.format).toBe("none");
  });

  it("should reject 'none' attestation with unexpected fields in attStmt", () => {
    const res = WebAuthnAttestationValidator.validate({
      fmt: "none",
      attStmt: { sig: "unexpected-signature" },
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("should validate 'packed' attestation with alg and sig", () => {
    const res = WebAuthnAttestationValidator.validate({
      fmt: "packed",
      attStmt: {
        alg: -7, // ES256
        sig: "MEUCIQDmockSignature123",
      },
    });

    expect(res.valid).toBe(true);
    expect(res.format).toBe("packed");
  });

  it("should reject 'packed' attestation missing alg", () => {
    const res = WebAuthnAttestationValidator.validate({
      fmt: "packed",
      attStmt: {
        sig: "MEUCIQDmockSignature123",
      },
    });

    expect(res.valid).toBe(false);
    expect(res.error).toContain("Missing required 'alg'");
  });

  it("should validate 'android-key' and 'fido-u2f' formats", () => {
    const androidRes = WebAuthnAttestationValidator.validate({
      fmt: "android-key",
      attStmt: {
        sig: "mockSig",
        x5c: ["base64cert"],
      },
    });
    expect(androidRes.valid).toBe(true);

    const u2fRes = WebAuthnAttestationValidator.validate({
      fmt: "fido-u2f",
      attStmt: {
        sig: "mockSig",
        x5c: ["base64cert"],
      },
    });
    expect(u2fRes.valid).toBe(true);
  });
});
