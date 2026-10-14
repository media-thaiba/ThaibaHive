# Operational Runbook: Unified Campus Identity (SAML/OIDC SSO) & Real-Time E2EE WebRTC Conferencing

> **Module**: Phase 12 (Track 3A) — `v3.41.0`  
> **Status**: Production Operational Runbook  
> **Audience**: Platform Administrators, DevOps Engineers, Campus Security Officers

---

## 1. Overview & Architecture

Phase 12 delivers unified enterprise campus identity federation and real-time end-to-end encrypted multi-party distance learning:
- **SAML 2.0 Identity Provider Federation**: Supports Microsoft Entra ID, Google Workspace, Shibboleth, and Okta with Exclusive Canonicalization (C14N), fail-closed XXE attack defense, and replay protection within a 600-second cache window.
- **OpenID Connect (OIDC)**: Enforces RFC 7636 PKCE S256 code challenge flows, timing-safe HMAC-SHA256 CSRF state tokens, and cryptographic JWKS ID token validation.
- **JIT User Provisioning & Escalation Guard**: Automated staff record generation under the institution's scope, automated email verification (`emailVerifiedAt`), and strict role escalation clamping (preventing external assertions from claiming `super_admin` or `system`).
- **Real-Time WebRTC Conferencing & SFrame E2EE**: Deterministic Perfect Negotiation politeness resolution, atomic participant capacity gating (`maxParticipants`), and forward-secrecy P-256 ECDH SFrame epoch key rotation upon participant join, departure, or eviction.
- **Cryptographic Audit Ledger**: Immutable, SHA-256 Merkle hash chained audit entries (`sso_audit_logs`).

---

## 2. SSO Provider Setup & Management

### 2.1 Registering a SAML 2.0 IdP
1. Navigate to **Admin Console $\rightarrow$ Campus Identity & SSO Federation** (`/admin/sso`).
2. Click **Export SP Metadata XML** and register the metadata XML with your enterprise IdP.
   - SP Entity ID: `https://<domain>/sp`
   - ACS Endpoint: `https://<domain>/api/auth/saml/acs` (Binding: `HTTP-POST`)
3. Under the **SAML 2.0 Providers** tab, click **Add SAML Provider**:
   - Provide Provider Name, IdP Entity ID, SSO Service URL, and the IdP's X.509 Certificate in Base64/PEM format.
4. Click **Test Probe** to verify network reachability, certificate expiration status, and signature validity.

### 2.2 Registering an OIDC Provider
1. Create an OAuth 2.0 / OIDC Client in your provider (e.g. Google Cloud Console).
   - Authorized Redirect URI: `https://<domain>/api/auth/oidc/callback`
2. Under the **OIDC / OAuth 2.0** tab in `/admin/sso`, click **Add OIDC Provider**:
   - Provide Provider Name, Issuer URL (e.g. `https://accounts.google.com`), Client ID, Client Secret, and scopes.
3. Click **Test Probe** to verify connectivity and discovery document loading.

---

## 3. WebRTC Conferencing & E2EE Key Verification

### 3.1 Creating and Joining Conference Rooms
1. Teachers and administrators with `conference:create` permission can create rooms with:
   - Max capacity (up to 250 participants).
   - Passcode protection (hashed with SHA-256).
   - E2EE enforcement (enabled by default).
2. Attendees join using `POST /api/streaming/rooms/[id]/join` or navigating to `/operations/conferencing/[id]`.
3. If room capacity is exceeded, the atomic capacity gate blocks entry with `409 Conflict`.

### 3.2 Verifying E2EE Fingerprint
1. Click the **🔒 E2EE Active** badge on the top conference bar.
2. An 8-group hexadecimal fingerprint is displayed (e.g. `B82F-1A4C-99E0-442D`).
3. Attendees can cross-verify this fingerprint out-of-band to confirm cryptographic confidentiality.
4. When any attendee joins or leaves, an epoch rotation immediately derives a new 256-bit AES-GCM encryption key, guaranteeing forward secrecy and post-compromise security.

---

## 4. Diagnostics, Troubleshooting & Health Checks

| Symptom | Root Cause | Remediation Procedure |
|---|---|---|
| `401 Replay Detected` | SAML assertion with the same ID re-submitted within 600 seconds. | Advise user to initiate a fresh login from the IdP portal; check system clock sync (NTP). |
| `Security Violation: DTD/XXE` | SAML XML assertion contains `<!DOCTYPE>` or external entity definitions. | IdP payload is corrupted or malicious; reject immediately and check IdP export template. |
| `403 Privilege Escalation Attempt` | IdP assertion claimed `super_admin` or `system` role. | System safely clamped role to `admin` and logged alert. Verify IdP group mappings in `/admin/sso`. |
| `409 Room Capacity Exceeded` | Active participant count reached `maxParticipants`. | Increase `maxParticipants` on room record or host can evict inactive peers via the moderation menu. |
| `403 Feature Disabled` | `sso_federation` or `webrtc_conferencing` disabled for institution. | Enable feature flag in `features.ts` or set environment variable `FEATURE_WEBRTC_CONFERENCING=true`. |

---

## 5. Automated E2E Simulation Harness

To verify all 8 identity and conferencing stages locally or in CI with zero live network egress:
```bash
pnpm conference:simulate
```
All 8 stages must report `✓` and exit with code `0`.
