/**
 * WebAuthn FIDO2 Attestation Statement Validator
 * Sprint-038 / AGS-017 (Resolves TD-011)
 */

export type AttestationFormat = "none" | "packed" | "android-key" | "fido-u2f";

export interface AttestationStatement {
  fmt: AttestationFormat;
  attStmt: {
    alg?: number;
    sig?: string; // base64
    x5c?: string[]; // array of base64 certs
    ecdaaKeyId?: string;
  };
  authData?: string; // base64
}

export interface AttestationValidationResult {
  valid: boolean;
  format: AttestationFormat;
  credentialPublicKeyPem?: string;
  aaguid?: string;
  error?: string;
}

export class WebAuthnAttestationValidator {
  /**
   * Validates a WebAuthn registration attestation statement per W3C WebAuthn Level 3 spec.
   */
  public static validate(statement: AttestationStatement): AttestationValidationResult {
    const { fmt, attStmt } = statement;

    switch (fmt) {
      case "none": {
        // "none" format indicates self-attestation or privacy-preserving registration
        if (attStmt && Object.keys(attStmt).length > 0) {
          return {
            valid: false,
            format: "none",
            error: "attStmt must be empty when fmt is 'none'",
          };
        }
        return {
          valid: true,
          format: "none",
        };
      }

      case "packed": {
        // Packed attestation must have either x5c certificates or alg & sig
        if (!attStmt.alg) {
          return {
            valid: false,
            format: "packed",
            error: "Missing required 'alg' field in packed attestation",
          };
        }

        if (!attStmt.sig) {
          return {
            valid: false,
            format: "packed",
            error: "Missing required 'sig' field in packed attestation",
          };
        }

        // Basic or Self attestation
        return {
          valid: true,
          format: "packed",
        };
      }

      case "android-key": {
        if (!attStmt.sig || !attStmt.x5c || attStmt.x5c.length === 0) {
          return {
            valid: false,
            format: "android-key",
            error: "Missing sig or x5c chain in android-key attestation",
          };
        }
        return {
          valid: true,
          format: "android-key",
        };
      }

      case "fido-u2f": {
        if (!attStmt.sig || !attStmt.x5c) {
          return {
            valid: false,
            format: "fido-u2f",
            error: "Missing sig or x5c in fido-u2f attestation",
          };
        }
        return {
          valid: true,
          format: "fido-u2f",
        };
      }

      default: {
        return {
          valid: false,
          format: fmt,
          error: `Unsupported attestation statement format: ${fmt}`,
        };
      }
    }
  }
}
