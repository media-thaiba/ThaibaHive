# Demonstrating Proof-of-Possession (DPoP) Cryptographic Session Guide

## 1. Executive Summary & RFC 9449 Architecture

Demonstrating Proof of Possession at the Application Layer (DPoP, defined in IETF RFC 9449 and RFC 7638) is an advanced zero-trust authorization standard implemented in ThaibaHive v3.21.0. 

In traditional Bearer token authentication schemes, any party holding the token string can impersonate the user. If an attacker intercepts a token via network eavesdropping, cross-site scripting (XSS), or malicious browser extensions, they can use the token freely until expiration. 

DPoP eliminates this entire class of vulnerability by **cryptographically binding access tokens to a specific client device key pair**. Every HTTP request sent to a protected ThaibaHive API endpoint must include:
1. The standard `Authorization: Bearer <token>` carrying the thumbprint confirmation claim (`cnf.jkt`).
2. A freshly generated, short-lived `DPoP` proof JWT signed by the client device private key.

If an attacker steals the bearer token without possessing the non-extractable private key stored in the user device hardware/IndexedDB, the server rejects every subsequent request with `401 {"error": "DPoP proof required"}` or `401 {"error": "DPoP proof invalid"}`.

---

## 2. End-to-End Cryptographic Protocol Flow

```
Client Browser (useDPoP)                  ThaibaHive API Server (withDPoP)
────────────────────────                  ────────────────────────────────
1. Generate EC P-256 KeyPair
   - Non-extractable private key in IndexedDB
   - Export public JWK: { crv: "P-256", kty: "EC", x, y }

2. Compute RFC 7638 Thumbprint
   - SHA-256 of canonical JWK members
   - thumbprint = base64url(SHA256(canonical_jwk))

3. Construct DPoP Proof JWT:
   - Header: { alg: "ES256", typ: "dpop+jwt", jwk: publicJwk }
   - Payload: { jti: UUID, htm: "POST", htu: "/api/auth/login", iat: timestamp }
   - Signature: ES256(header.payload, privateKey)

4. Send Request:
   POST /api/auth/login
   Headers:
     Authorization: Bearer <token>
     DPoP: <proof_jwt>           ────────► 5. Server Verification (verifyDPoPProof):
                                             a. Verify JWT format, typ="dpop+jwt", alg="ES256"
                                             b. Compute thumbprint of embedded JWK
                                             c. Check htm === request.method & htu === request.url
                                             d. Check iat within ±300s clock-skew window
                                             e. Check JTI Replay Cache (5-min TTL)
                                             f. Cryptographic ECDSA signature verification
                                             g. Match proof thumbprint with token cnf.jkt claim

6. Response 200 OK               ◄────────  7. Allow Request & Attach x-dpop-thumbprint
```

---

## 3. Implementation Details & Modules

### Server-Side Engine (`src/lib/identity/dpop-engine.ts`)
- **Key Pair Generation**: Uses Node.js native `crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })`.
- **Proof Creation & Signing**: Generates RFC 9449-compliant proof tokens with IEEE P1363 signature encoding.
- **Replay Protection Cache**: In-memory sliding window cache (`REPLAY_CACHE`) holding used `jti` identifiers with a strict 5-minute TTL (`REPLAY_TTL_MS = 5 * 60 * 1000`).
- **Thumbprint Derivation**: RFC 7638 deterministic SHA-256 hash computed over lexicographically sorted essential key parameters:
  $$\text{Thumbprint} = \text{Base64URL}\Big(\text{SHA-256}\big(\text{"\{\\"crv\\":\\"P-256\\",\\"kty\\":\\"EC\\",\\"x\\":\\"...\\",\\"y\\":\\"...\\"}"}\big)\Big)$$

### Verification Middleware (`src/lib/identity/dpop-middleware.ts`)
- Higher-Order Function `withDPoP(handler, { required?: boolean })` composable with `requireAuth`.
- Extracts `dpop` header, performs full cryptographic verification, and attaches the validated public key thumbprint to `req.headers['x-dpop-thumbprint']`.
- Dual-Mode Support: In non-enforce mode (`required: false`), requests lacking DPoP proofs pass through to legacy bearer validation, enabling zero-downtime rolling migration.

### Browser-Side Token Manager (`src/lib/hooks/use-dpop.ts`)
- SSR-safe React hook `useDPoP()`.
- Generates non-extractable `CryptoKey` (`extractable: false`) stored inside browser IndexedDB (`thaibahive_identity` database).
- Automatic Key Rotation: Keys rotate automatically every 30 days (`KEY_ROTATION_MS = 30 * 24 * 60 * 60 * 1000`).
- Exposes `attachDPoP(url, method)` for seamless integration into API fetch layers.

---

## 4. Token Claims & Confirmation Schema

Tokens minted by `@thaiba/auth` for DPoP sessions carry the `cnf` (confirmation) claim:

```json
{
  "staffId": "staff_01928374",
  "email": "faculty@thaiba.edu",
  "role": "hod",
  "employeeId": "EMP-402",
  "name": "Dr. Aysha Rahman",
  "tokenVersion": 1,
  "dpopEnabled": true,
  "cnf": {
    "jkt": "0z9Bv8Xk7L2mN5qP4rS1tU3vW6yZ8aC0dE2fG4hI6jK"
  },
  "iat": 1724083200,
  "exp": 1724083800
}
```

Token Lifetimes:
- **DPoP Access Token TTL**: 10 minutes (`10m`).
- **Legacy Token TTL**: 24 hours.
- **Refresh Token Window**: 7 days with Remember Me.

---

## 5. Observability & Telemetry Verification

Query Prometheus metrics at `/api/system/metrics`:
- `identity_dpop_validation_ms{quantile="0.95"}`: DPoP proof validation latency ($p95 < 50\text{ ms}$).
- `identity_dpop_replay_rejected_total`: Cumulative counter of replay attacks blocked by the JTI cache.

---

## 6. Security Checklist for Production Deployment

- [x] Private keys are non-extractable and never transmitted over the network.
- [x] Proofs are bound to exact HTTP methods (`htm`) and URLs without query strings (`htu`).
- [x] Clocks are synchronized across cluster instances using NTP ($\pm 300\text{s}$ tolerance window).
- [x] All cryptographic validation uses native hardware-accelerated OpenSSL/Node.js crypto primitives.
