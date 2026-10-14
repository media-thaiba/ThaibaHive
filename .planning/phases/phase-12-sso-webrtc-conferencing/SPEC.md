# Phase 12 SPEC: Unified Campus Identity (SAML/OIDC SSO) & Real-Time E2EE WebRTC Conferencing (Track 3A) — Draft v2

## Ambiguity Score: 1/10 (Draft v2 — Cross-AI Review Converged: APPROVED by Qwen, OpenCode, and Claude Code)

---

## 0. Relationship to Existing Assets & Architecture Reconciliation

This phase implements the two foundational capabilities reserved for **Track 3A** in Phase 10 (§SPEC line 46) and Phase 11 (§SPEC line 72):
1. **Enterprise Campus Identity (SAML 2.0 & OIDC SSO)**: Upgrades legacy mock stubs (`api/auth/saml`, `api/auth/oidc`) to hardened, production-grade enterprise identity federation supporting Google Workspace for Education, Microsoft Entra ID (Azure AD), and Shibboleth/InCommon, with JIT staff/student provisioning and integration with Sprint-009's `regionalAccessGrants`.
2. **Real-Time E2EE Multi-Party WebRTC Conferencing**: Elevates the audio/video mesh beyond Phase 10's Live Multimodal audio stream and Phase 8's Voice Copilot to fully interactive, multi-party video conferencing, virtual classrooms, and incident command rooms with End-to-End Encryption (E2EE) key rotation, dual-transport signaling (SSE + POST), and active speaker detection.

### Existing Assets & Reuse Rules

| Asset | Location | Current State | Phase 12 Rule |
|---|---|---|---|
| **SAML & OIDC Providers** | `samlProviders`, `oidcProviders`, `federatedIdentityMappings` in `packages/db/schema.ts` | Schema exists but lacks `institutionId` FK cascades and is wired only to mock stubs | **Upgrade in-place with dual-dialect migration**. Add `institutionId`, indexes, and real cryptographic engines. |
| **Streaming Rooms & Sessions** | `streamingRooms`, `streamingSessions`, `streamRecordings` in `packages/db/schema.ts` | Bare SQLite/PG tables with unverified mock signaling route (`/api/streaming/rooms/[id]/signal`) | **Upgrade in-place with dual-dialect migration**. Add `institutionId`, E2EE room parameters, and new `conferenceSignals` queue. |
| **Live Multimodal Streaming (Phase 10)** | `src/lib/operations/live/` (`GeminiLiveProvider`, `LiveSessionProvider`) | Real-time audio/hazard streaming for AI copilot | **Complement, do not collide.** WebRTC conferencing serves peer-to-peer human collaboration (classes, meetings, incident rooms). AI Copilot can optionally join as a synthetic participant. |
| **Regional Federation (Sprint-009 / Phase 11)** | `regionalGroups`, `institutionClusters`, `regionalAccessGrants` | Cross-campus hierarchy and access rules | **Direct Integration.** JIT provisioning maps external IdP institutional affiliations to `regionalAccessGrants`, enabling seamless cross-campus single sign-on. |
| **Edge Middleware & Session Engine** | `src/middleware.ts`, `packages/auth/session.ts` | Jose WebCrypto HMAC-SHA256 JWT validation | **Binding standard.** SSO callbacks must issue legitimate signed session tokens using `createSessionToken()`, not mock `fed_token_*` strings. |
| **Mobile Auth Handoff** | `/api/auth/mobile-handoff/nonce`, `WebViewHandoffScreen` | Cryptographic nonce exchange for mobile webviews | **Reuse.** SSO on mobile initiates via in-app browser and hands off the authenticated session via the existing nonce exchange protocol. |

---

## 1. What This Phase Delivers (User-Visible)

### Campus Administrators & IT Directors
- **SSO Management Cockpit (`/admin/sso`)**:
  - Connect and manage enterprise identity providers (SAML 2.0 and OIDC).
  - Download official Service Provider (SP) Metadata XML (`/api/auth/saml/metadata?institutionId=...`).
  - Configure attribute mapping rules (mapping IdP claims like `memberOf` or `eduPersonAffiliation` to ThaibaHive roles: `super_admin`, `admin`, `principal`, `hod`, `staff`, `teacher`, `student`).
  - In-browser connection diagnostic tester (`Test Connection`) validating IdP endpoints, discovery URLs, and certificate chains.
  - Cross-campus SSO policy: allow teachers and regional inspectors to sign into affiliate campuses via single sign-on.

### Faculty, Students & Staff
- **1-Click Enterprise Single Sign-On**:
  - Sign in seamlessly with institutional Google Workspace ("Sign in with Google") or Microsoft 365 ("Sign in with Microsoft") accounts.
  - Automatic Just-In-Time (JIT) profile synchronization (name, email, department, verified status).
- **Interactive E2EE Conference Rooms (`/operations/conferencing/[id]`)**:
  - HD multi-peer video & audio conferencing with screen-sharing capabilities.
  - End-to-End Encryption (E2EE) toggle ensuring media cannot be intercepted by intermediate relays or proxies.
  - Active speaker spotlight, participant drawer, in-meeting encrypted chat, and host moderation controls (mute all, remove participant, lock room).
  - Virtual Classroom mode with raised hand queue and presenter permissions.

### Mobile App Users (Flutter)
- **Native SSO Gateway**: In-app browser OAuth2/SAML redirect with seamless nonce handoff back to native Flutter session storage.
- **Mobile Conference Room (`ConferenceRoomScreen`)**: Compact mobile video tiles, camera switch, microphone toggles, and real-time audio level indicators.

---

## 2. Core Data Model & Dual-Dialect Schema

All tables enforce strict dual-dialect parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) with foreign key cascades on `institutionId`.

### Updated & New Tables

```
SSO & Identity Domain
├── saml_providers (updated: institutionId, metadataXml, binding, attributeMappingJson, certExpiry)
├── oidc_providers (updated: institutionId, scopes, discoveryCacheJson, jwksCacheJson)
├── federated_identity_mappings (updated: institutionId, externalGroupsJson, jitProvisioned)
└── sso_audit_logs (new: append-only Merkle ledger for IdP auth attempts, errors & JIT events)

Real-Time WebRTC Conferencing Domain
├── streaming_rooms (updated: institutionId, passcodeHash, isE2eeEnabled, roomType, maxParticipants)
├── streaming_sessions (updated: institutionId, peerId, e2eePublicKey, connectionQuality, isScreenSharing)
├── conference_signals (new: ephemeral signaling queue for SDP/ICE routing between peer IDs)
└── stream_recordings (updated: institutionId, checksumSha256, isEncrypted, retentionDays)
```

#### Detailed Column Specifications

1. `saml_providers`:
   - `id`: `text` (PK, `samlp_${uuid}`)
   - `institution_id`: `text` (FK `institutions.id` ON DELETE CASCADE)
   - `name`: `text`
   - `idp_entity_id`: `text`
   - `sso_url`: `text`
   - `slo_url`: `text` (nullable, single logout)
   - `x509_certificate`: `text` (PEM format)
   - `cert_expires_at`: `text` (ISO 8601)
   - `binding`: `text` (`HTTP-POST` | `HTTP-Redirect`, default `HTTP-POST`)
   - `want_assertions_signed`: `boolean` (default `true`)
   - `attribute_mapping_json`: `text` (JSON mapping IdP claims to `email`, `name`, `role`, `department`)
   - `is_active`: `boolean` (default `true`)
   - `created_at` / `updated_at`: `text`

2. `oidc_providers`:
   - `id`: `text` (PK, `oidcp_${uuid}`)
   - `institution_id`: `text` (FK `institutions.id` ON DELETE CASCADE)
   - `name`: `text`
   - `client_id`: `text`
   - `client_secret`: `text` (encrypted at rest / masked)
   - `issuer_url`: `text`
   - `discovery_url`: `text`
   - `authorization_endpoint`: `text`
   - `token_endpoint`: `text`
   - `userinfo_endpoint`: `text`
   - `jwks_uri`: `text`
   - `scopes`: `text` (default `"openid email profile"`)
   - `discovery_cache_json`: `text`
   - `jwks_cache_json`: `text`
   - `cache_expires_at`: `text`
   - `is_active`: `boolean` (default `true`)
   - `created_at` / `updated_at`: `text`

3. `federated_identity_mappings`:
   - `id`: `text` (PK, `fim_${uuid}`)
   - `institution_id`: `text` (FK `institutions.id` ON DELETE CASCADE)
   - `user_id`: `text` (FK `staff.id` ON DELETE CASCADE)
   - `provider_type`: `text` (`SAML` | `OIDC`)
   - `provider_id`: `text` (FK to `saml_providers` or `oidc_providers`)
   - `external_subject_id`: `text`
   - `external_email`: `text`
   - `external_groups_json`: `text`
   - `mapped_role`: `text`
   - `jit_provisioned`: `boolean` (default `false`)
   - `last_login_at`: `text`
   - `created_at`: `text`
   - Unique index: `(institution_id, provider_type, external_subject_id)`

4. `conference_signals`:
   - `id`: `text` (PK, `sig_${uuid}`)
   - `institution_id`: `text` (FK `institutions.id` ON DELETE CASCADE)
   - `room_id`: `text` (FK `streaming_rooms.id` ON DELETE CASCADE)
   - `sender_peer_id`: `text`
   - `recipient_peer_id`: `text` (target peer, or `*` for broadcast)
   - `signal_type`: `text` (`offer` | `answer` | `ice_candidate` | `peer_joined` | `peer_left` | `key_exchange`)
   - `payload_json`: `text`
   - `delivered`: `boolean` (default `false`)
   - `created_at`: `text` (TTL: automatically purged after 5 minutes)

5. `sso_audit_logs`:
   - `id`: `text` (PK, `ssoa_${uuid}`)
   - `institution_id`: `text` (FK `institutions.id` ON DELETE CASCADE)
   - `provider_id`: `text`
   - `provider_type`: `text` (`SAML` | `OIDC`)
   - `event_type`: `text` (`login_success` | `login_failure` | `jit_provision` | `idp_created` | `idp_updated`)
   - `subject_id`: `text`
   - `ip_address`: `text`
   - `user_agent`: `text`
   - `prev_hash`: `text`
   - `merkle_hash`: `text`
   - `created_at`: `text` (90-day retention window)

---

## 3. Architectural Invariants & Security Mandates (Cross-AI Review Hardened)

1. **Strict Multi-Tenant Scoping (Rule A–D Compliance)**:
   - Every API handler, query, and mutation strictly resolves tenant scope via `resolveScopedInstitutionId()`.
   - IdP configurations and SSO logins are bounded to their respective institutions.
   - Cross-campus logins require explicit active membership in an `institutionCluster` or grant in `regionalAccessGrants`.
2. **SAML 2.0 Security Guards**:
   - **Exclusive XML Canonicalization (C14N)**: Canonicalize document (`http://www.w3.org/2001/10/xml-exc-c14n#`) prior to signature validation to prevent signature wrapping attacks.
   - **XXE & Entity Expansion Defense**: Strict fail-closed parsing rejecting any XML payload containing `<!DOCTYPE`, `<!ENTITY`, or external entity references.
   - **XML Signature Verification**: Cryptographically validate digital signatures against the IdP's registered X.509 certificate.
   - **Clock Skew & Expiry**: Enforce strict window ($\pm 300\text{s}$) on `NotBefore` and `NotOnOrAfter`.
   - **Replay Protection**: In-memory/Redis assertion replay cache tracking `Assertion ID` + `InResponseTo` with 600s TTL. Replayed assertions are rejected with `401 Unauthorized`.
   - **Audience & Destination Validation**: Verify `Audience` matches the SP Entity ID and `Destination` matches the ACS callback URL.
3. **OIDC Security Guards**:
   - **PKCE Mandate**: Authorization code flow must use PKCE (`code_verifier` with SHA-256 `code_challenge`).
   - **ID Token Verification**: Cryptographic verification of JWT signatures via JWKS fetched from `jwks_uri` using `jose.jwtVerify`.
   - **CSRF State Parameter**: `state` parameter must be an encrypted/signed token containing a timestamp, `tenantId`, and session nonce with 10-minute expiry.
4. **JIT Role Escalation Defense**:
   - Strict negative role boundary: JIT auto-provisioning defaults to `staff` or `teacher`. Administrative roles (`admin`, `principal`, `super_admin`) require pre-existing tenant assignment or explicit white-listed IdP group mapping.
5. **Legitimate Session Issuance**:
   - SSO callbacks MUST issue valid, signed JWT session cookies using `createSessionToken()` from `@thaiba/auth/session` (never mock or dummy strings).
6. **Real-Time WebRTC Conferencing & E2EE**:
   - **Perfect Negotiation Pattern**: Sequence-numbered signaling queue in `conferenceSignals` to eliminate offer/answer race collisions.
   - **Atomic Admission Gate**: Count active `streamingSessions` within a single database transaction to guarantee strict enforcement of `maxParticipants`.
   - **End-to-End Encryption (E2EE)**: SFrame / WebRTC Insertable Streams architecture with ephemeral ECDH (P-256) per-room key agreement. Video/audio frames encrypted before transmission.
   - **Forward Secrecy & Post-Compromise Security**: Immediate cryptographic key rotation epoch upon participant join, departure, or host eviction.
   - **Ephemeral TURN Credentials**: RFC 5766 time-limited HMAC-SHA1 tokens with 24-hour expiration.
   - **Heartbeat & Orphan Sweeper**: 30-second ping watchdog cleaning up dead connections and notifying peers.
7. **Append-Only Merkle Audit Integrity**:
   - Every SSO authentication attempt and conference session write creates an entry in an append-only SHA-256 chained audit ledger.

---

## 4. RBAC Permissions Matrix (Track 3A)

The following 7 permission keys are mapped across all 5 tiers and specialized roles in `packages/auth/roles.ts`:

| Permission Key | Description | Allowed Roles |
|---|---|---|
| `sso:read` | View configured SSO IdPs and SP metadata | `super_admin`, `admin`, `principal`, `regional_admin` |
| `sso:manage` | Create, update, or disable SAML/OIDC IdPs | `super_admin`, `admin` |
| `sso:test` | Trigger IdP connectivity diagnostics | `super_admin`, `admin` |
| `conference:create` | Create and host conferencing / classroom rooms | `super_admin`, `admin`, `principal`, `hod`, `staff`, `teacher`, `coordinator` |
| `conference:join` | Join active conference sessions | All roles (`super_admin`, `admin`, `principal`, `hod`, `staff`, `teacher`, `student`, etc.) |
| `conference:record` | Record conference / classroom sessions | `super_admin`, `admin`, `principal`, `hod`, `teacher` |
| `conference:manage` | Moderate rooms, kick participants, lock sessions | `super_admin`, `admin`, `principal`, `hod`, `teacher` (host) |

---

## 5. Quality Gates & Verification Checklist

| # | Gate | Pass Criteria |
|---|---|---|
| 1 | `npx tsc --noEmit` | 0 errors |
| 2 | `npx eslint .` | 0 errors, 0 warnings |
| 3 | Schema Parity | `schema-drift.test.ts` passes with 100% table and column parity across SQLite and PostgreSQL |
| 4 | Multi-Tenant Scanner | `pnpm security:tenants` exits with 0 critical, high, or warning leaks |
| 5 | Route Auth Scanner | `pnpm security:requireauth` exits with 0 naked handlers |
| 6 | RBAC Matrix Scanner | `pnpm security:rbac` verifies all 7 new permission keys are 100% mapped |
| 7 | Feature Flag Gating | `sso_federation` and `webrtc_conferencing` flags off $\rightarrow$ 403 on protected routes |
| 8 | E2E Simulation Harness | `pnpm conference:simulate` passes all 8 stages with intact Merkle chain and zero live network egress |
