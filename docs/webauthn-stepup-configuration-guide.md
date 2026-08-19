# WebAuthn FIDO2 & Multi-Factor Step-Up Configuration Guide

## 1. Executive Summary & Protocol Overview

ThaibaHive v3.21.0 introduces hardware-backed cryptographic step-up authentication based on the W3C Web Authentication (WebAuthn) and FIDO2 specifications. Step-up authentication provides high-assurance verification when the continuous Risk-Based Authentication Engine flags elevated threat indicators (e.g. IP velocity spikes, impossible geographic travel speeds, or device fingerprint drift).

Unlike traditional SMS-based multi-factor systems that are vulnerable to SIM swapping and SS7 interception, WebAuthn relies on public-key cryptography:
- **Private Key**: Generated and secured inside the client device's hardware security module (Secure Enclave, TPM, or FIDO2 security key).
- **Public Key**: Stored in the institutional database (`webauthnCredentials` in `@thaiba/db/schema.ts`).
- **Signature Assertion**: The user verifies their physical presence (TouchID, FaceID, Windows Hello, or hardware key tap) to sign a cryptographic server challenge.

For legacy browsers or hardware without biometric capabilities, an encrypted 6-digit Time-Based One-Time Password (OTP) fallback is integrated seamlessly into the challenge modal.

---

## 2. Cryptographic Challenge & Verification Flow

```
Client Browser                         ThaibaHive Server API
──────────────                         ─────────────────────
1. High-Risk Action Detected
2. Request Step-Up Challenge  ─────────►  3. generateChallenge()
                                            - 32-byte cryptographically secure random
                                            - challengeId (UUID) stored in cache (60s TTL)
4. Receive Challenge Object   ◄─────────  5. Return { challengeId, challenge, expiresAt }
6. navigator.credentials.get()
   - User provides Biometric
   - Client signs: AuthData + Hash(ClientData)
7. Submit Assertion Response   ─────────►  8. verifyWebAuthnAssertion()
                                            - Verify challenge matches & unconsumed
                                            - Verify clientData.type === "webauthn.get"
                                            - Cryptographic signature check with stored public key
9. Receive Upgraded Token     ◄─────────  10. Issue Extended Session Token + Audit Event
```

---

## 3. API Endpoints & Route Definitions

All step-up routes require authenticated sessions and are located under `src/app/api/auth/`:

### 1. `POST /api/auth/webauthn/challenge`
- **Purpose**: Creates an ephemeral 32-byte base64url challenge string.
- **TTL**: Strictly 60 seconds (`CHALLENGE_TTL_MS = 60 * 1000`).
- **Response**:
```json
{
  "challengeId": "6c84b1e2-9b2f-48d6-84b2-29df348e02d8",
  "challenge": "4b7N0K3sL9vQ...base64url",
  "expiresAt": 1724083260000
}
```

### 2. `POST /api/auth/webauthn/verify`
- **Purpose**: Validates WebAuthn cryptographic assertion or OTP code.
- **Security Rule**: Enforces maximum of 3 consecutive failed verification attempts (`MAX_FAILED_ATTEMPTS = 3`). On the 3rd failure, the active session is destroyed immediately (`403 Forbidden`), and an incident alert is dispatched.
- **Payload (WebAuthn)**:
```json
{
  "challengeId": "6c84b1e2-9b2f-48d6-84b2-29df348e02d8",
  "type": "webauthn",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiNGI3TjBLM3NMOT...In0",
    "authenticatorData": "SZYN5YgOJ8Um426JW1Z2eP1egQy...base64url",
    "signature": "MEQCIEzV3aB9lK...base64url"
  }
}
```
- **Payload (OTP Fallback)**:
```json
{
  "type": "otp",
  "response": "849201"
}
```

### 3. `POST /api/auth/stepup/otp`
- **Purpose**: Generates and dispatches a 6-digit numeric verification code to the authenticated staff member's registered email/phone.
- **TTL**: 10 minutes (`OTP_TTL_MS = 10 * 60 * 1000`).

---

## 4. UI Component Integration

The step-up challenge modal is implemented in `src/components/auth/stepup-challenge-dialog.tsx` using Radix UI primitives (`<Dialog>`, `<Button>`, `<Input>`, `<Badge>`).

### Integration Example:
```tsx
import { useState } from "react";
import { StepUpChallengeDialog } from "@/components/auth/stepup-challenge-dialog";
import { useDPoP } from "@/lib/hooks/use-dpop";

export function SecureTransferView() {
  const [showStepUp, setShowStepUp] = useState(false);
  const { attachDPoP } = useDPoP();

  const handleSensitiveAction = async () => {
    const res = await fetch("/api/finance/transfer", {
      method: "POST",
      headers: { DPoP: (await attachDPoP("/api/finance/transfer", "POST")) || "" },
    });

    if (res.status === 403 && (await res.json()).error === "Step-up authentication required") {
      setShowStepUp(true);
    }
  };

  return (
    <div>
      <button onClick={handleSensitiveAction}>Execute High-Value Transfer</button>
      <StepUpChallengeDialog
        isOpen={showStepUp}
        riskLevel="high"
        onSuccess={() => {
          setShowStepUp(false);
          // Retry sensitive action with elevated token
        }}
        onFailure={() => {
          setShowStepUp(false);
          // Redirect to sign-in or show security notice
        }}
      />
    </div>
  );
}
```

---

## 5. Security & Verification Rules

1. **One-Time Challenge Consumption**: Challenges are invalidated immediately upon retrieval via `consumeChallenge(challengeId)` to prevent replay attacks.
2. **Origin & Type Verification**: `clientDataJSON` must have `type === "webauthn.get"` and valid server origin.
3. **No Plaintext Logging**: OTP codes and sensitive biometric materials must never appear in production application logs.
4. **Audit Immutability**: All verification attempts (success, failure, attempt limits) log directly to the cryptographic audit trail (`IDENTITY_STEPUP_COMPLETED`, `IDENTITY_STEPUP_FAILED`).
