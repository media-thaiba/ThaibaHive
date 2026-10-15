# Phase 12 Execution Plan: Unified Campus Identity (SAML/OIDC SSO) & Real-Time E2EE WebRTC Conferencing (Track 3A) — Draft v2

> **Document Version**: 2.0 (Draft v2 — Cross-AI Reviewed & Hardened)  
> **Status**: Approved & Execution-Ready  
> **Review Convergence**: Approved by Qwen (`qwen3.6`), OpenCode (`qwen3.5`), and Claude Code (`qwen2.5-coder`). Zero open HIGH blockers.  
> **Target Platforms**: Next.js Web (`src/`, `packages/auth`, `packages/db`) & Flutter Mobile (`thaibahive_mobile_app/`)  
> **Target Version**: v3.41.0  

---

## 1. Overview & Phased Roadmap

Phase 12 delivers the two foundational pillars of **Track 3A**:
1. **Enterprise Campus Identity (SAML 2.0 & OIDC SSO)**: Upgrading legacy mock stubs to hardened multi-tenant SSO supporting Google Workspace for Education, Microsoft Entra ID, and Shibboleth/InCommon, with JIT provisioning and cross-campus regional access grants.
2. **Real-Time E2EE Multi-Party WebRTC Conferencing**: Full-mesh and star signaling, Perfect Negotiation race-condition elimination, Insertable Streams / SFrame End-to-End Encryption key agreement, active speaker detection, room moderation, and mobile companion video rooms.

```
Phase 12 Scope Breakdown
├── Wave 1: Dual-Dialect Schema, Drizzle Migrations, RBAC Matrix & Feature Flags
├── Wave 2: SSO Provider Registry, SAML 2.0 & OIDC Core Engines & Security Guards
├── Wave 3: JIT User Provisioning, Cross-Campus Regional Role Mapping & Mobile Auth Handoff
├── Wave 4: WebRTC Signaling Engine, Room State Machine & E2EE Key Exchange
├── Wave 5: Web Admin/Operations Cockpits & Mobile Flutter Video Screen
├── Wave 6: 8-Stage E2E Simulation Runner (`pnpm conference:simulate`), Docs & Release Notes
└── Wave 7: Exploratory QA Audit Remediation (QA-01 through QA-20 Hardening & Invariant Fixes)
```

---

## 2. Phased Execution Waves

### 🌊 Wave 1: Dual-Dialect Schema, Drizzle Migrations, RBAC Matrix & Feature Flags
* **Goal**: Establish the persistent multi-tenant data structures, permission keys, and feature flags with 100% dual-dialect parity.
* **Deliverables**:
  1. **Schema Updates (`packages/db/schema.ts` & `packages/db/schema.pg.ts`)**:
     - Update `samlProviders`: add `institutionId` (FK cascade), `certExpiresAt`, `binding`, `wantAssertionsSigned`, `attributeMappingJson`, and tenant index `idx_saml_providers_inst`.
     - Update `oidcProviders`: add `institutionId` (FK cascade), `authorizationEndpoint`, `tokenEndpoint`, `userinfoEndpoint`, `jwksUri`, `scopes`, `discoveryCacheJson`, `jwksCacheJson`, `cacheExpiresAt`, and tenant index `idx_oidc_providers_inst`.
     - Update `federatedIdentityMappings`: add `institutionId` (FK cascade), `externalEmail`, `externalGroupsJson`, `jitProvisioned`, and composite unique index `idx_fim_unique` on `(institution_id, provider_type, external_subject_id)`.
     - Add `ssoAuditLogs`: append-only Merkle ledger (`id`, `institution_id`, `provider_id`, `provider_type`, `event_type`, `subject_id`, `ip_address`, `user_agent`, `prev_hash`, `merkle_hash`, `created_at`) with tenant index.
     - Update `streamingRooms`: add `institutionId` (FK cascade), `passcodeHash`, `isE2eeEnabled`, `roomType`, `maxParticipants`, and tenant index.
     - Update `streamingSessions`: add `institutionId` (FK cascade), `peerId`, `e2eePublicKey`, `connectionQuality`, `isScreenSharing`, and unique index on `(room_id, peer_id)`.
     - Add `conferenceSignals`: ephemeral signal queue (`id`, `institution_id`, `room_id`, `sender_peer_id`, `recipient_peer_id`, `signal_type`, `payload_json`, `sequence_num`, `delivered`, `created_at`) with indexes on `(room_id, recipient_peer_id)` and `created_at`.
  2. **Drizzle Migrations**:
     - Generate SQLite migration (`drizzle/0040_*.sql`) and PostgreSQL migration (`drizzle/postgres/0024_*.sql`).
  3. **RBAC Mapping (`packages/auth/roles.ts`)**:
     - Register 7 keys: `sso:read`, `sso:manage`, `sso:test`, `conference:create`, `conference:join`, `conference:record`, `conference:manage` across all 5 tiers and specialized roles.
  4. **Feature Flags (`src/lib/features.ts`)**:
     - Add `sso_federation` and `webrtc_conferencing` toggles with tenant override support.
* **Verification**: `pnpm typecheck`, `pnpm security:rbac`, `packages/db/__tests__/schema-drift.test.ts`.

---

### 🌊 Wave 2: SSO Provider Registry, SAML 2.0 & OIDC Core Engines & Security Guards
* **Goal**: Build secure, hardened identity engines replacing legacy mock stubs with full cryptographic verification.
* **Deliverables**:
  1. **SAML 2.0 Engine (`src/lib/auth/saml-service.ts`)**:
     - Generate SP Metadata XML per institution (`/api/auth/saml/metadata`).
     - Generate `AuthnRequest` with Deflate + Base64 encoding.
     - Parse & validate `SAMLResponse`:
       - Strict XXE / entity expansion rejection (`<!DOCTYPE`, `<!ENTITY`).
       - Exclusive XML Canonicalization (C14N) prior to signature validation.
       - Cryptographic XML signature verification with X.509 cert validation.
       - Replay prevention: In-memory/Redis assertion ID cache with 600s TTL.
       - Clock skew validation ($\pm 300\text{s}$) on `NotBefore` / `NotOnOrAfter`.
       - Audience restriction and destination verification against ACS endpoint.
  2. **OIDC Engine (`src/lib/auth/oidc-service.ts`)**:
     - Discovery metadata caching with TTL (`/.well-known/openid-configuration`).
     - PKCE authorization code generator (`code_verifier` + S256 `code_challenge`).
     - ID Token cryptographic verification via `jose.jwtVerify` and `jose.createRemoteJWKSet`.
     - CSRF `state` and `nonce` parameter validation using HMAC-SHA256 signed state.
  3. **SSO API Routes**:
     - `GET /api/auth/sso/providers` — list active IdPs for caller's institution.
     - `POST /api/auth/sso/providers` — create/update IdP (`requireAuth(..., 'sso:manage')`).
     - `POST /api/auth/sso/test` — connection tester (`requireAuth(..., 'sso:test')`).
     - `POST /api/auth/saml/acs` — Assertion Consumer Service endpoint with rate limiting.
     - `GET /api/auth/oidc/callback` — OIDC callback endpoint with PKCE verification.
* **Verification**: Unit tests for SAML signature, XXE attack vectors, assertion replay, OIDC discovery, and token verification.

---

### 🌊 Wave 3: JIT User Provisioning, Cross-Campus Regional Role Mapping & Mobile Auth Handoff
* **Goal**: Enable seamless account provisioning, affiliation mapping, and mobile webview handoff.
* **Deliverables**:
  1. **Federated User Provisioning Engine (`src/lib/auth/federated-user-mapper.ts`)**:
     - Map external claims (e.g., `eduPersonAffiliation`, `memberOf`, Entra ID groups) to canonical ThaibaHive roles.
     - Role escalation guardrail: default to `staff` or `teacher`; block unmapped administrative roles.
     - Auto-provision new staff/teacher records under the scoped `institutionId` if JIT enabled.
     - Automatically mark email as verified (`emailVerifiedAt = now()`) since IdP proved ownership.
     - Append entry to `ssoAuditLogs` with cryptographic hash chain.
  2. **Cross-Campus Regional Access Grants**:
     - Check `institutionClusters` and `regionalAccessGrants` for multi-campus teachers or regional staff.
     - Emit scoped session tokens allowing fast campus switching without re-authenticating externally.
  3. **Legitimate Session Issuance & Mobile Handoff**:
     - Issue genuine signed JWT session cookie (`auth_token`) via `createSessionToken()` from `@thaiba/auth/session`.
     - Support `/api/auth/mobile-handoff/nonce` generation for mobile in-app browser redirect.
* **Verification**: Unit tests for JIT provisioning, role escalation protection, and mobile nonce exchange.

---

### 🌊 Wave 4: WebRTC Signaling Engine, Room State Machine & E2EE Key Exchange
* **Goal**: Build real-time signaling, room management, and SFrame / Insertable Streams E2EE key agreement.
* **Deliverables**:
  1. **WebRTC Signaling Manager (`src/lib/streaming/webrtc-signaling.ts`)**:
     - Perfect Negotiation pattern implementation handling glare and simultaneous offer collisions.
     - Sequence-numbered signaling queue in `conferenceSignals`.
     - Dual transport: Server-Sent Events (`GET /api/streaming/rooms/[id]/events`) + HTTP POST (`POST /api/streaming/rooms/[id]/signal`).
     - Signal types: `offer`, `answer`, `ice_candidate`, `peer_joined`, `peer_left`, `key_exchange`, `room_lock`.
     - Ephemeral RFC 5766 TURN credentials using time-limited HMAC-SHA1 tokens.
  2. **Room State Machine (`src/lib/streaming/room-manager.ts`)**:
     - Atomic participant capacity gating: transactional count preventing room overflow.
     - Active peer tracking in `streamingSessions` with 30s heartbeat watchdog.
     - Host moderation: Mute participant, kick participant, lock room.
  3. **End-to-End Encryption (E2EE) Key Exchange**:
     - Ephemeral ECDH (P-256) per-session key agreement between room peers.
     - Epoch key rotation when participants join, leave, or are evicted (forward secrecy & post-compromise security).
* **Verification**: Unit tests for SDP/ICE validation, peer routing, room capacity gating, and ECDH key derivation.

---

### 🌊 Wave 5: Web Admin/Operations Cockpits & Mobile Flutter Video Screen
* **Goal**: Deliver accessible, responsive user interfaces across Next.js Web and Flutter Mobile.
* **Deliverables**:
  1. **SSO Management Cockpit (`src/app/(shell)/admin/sso/page.tsx`)**:
     - Tabbed console: SAML Providers, OIDC Providers, Attribute Mappings, and Test Diagnostics.
     - SP Metadata XML export button and IdP XML file importer.
     - Attribute rule builder (e.g. `faculty` $\rightarrow$ `teacher`, `admin_group` $\rightarrow$ `admin`).
  2. **Web Conferencing Room (`src/app/(shell)/operations/conferencing/[id]/page.tsx`)**:
     - Video tile grid with active speaker spotlighting.
     - Control bar: Mute/unmute microphone, start/stop camera, screen-share toggle, raise hand, leave room.
     - E2EE badge with verification fingerprint comparison dialog.
     - Participant drawer with host moderation actions.
  3. **Mobile Flutter Screen (`thaibahive_mobile_app/lib/features/conferencing/`)**:
     - `ConferenceRoomScreen` with Riverpod controller, video renderers, and audio controls.
     - Native SSO login button in `LoginScreen` opening in-app browser.
* **Verification**: Component tests, `flutter analyze`, and WCAG 2.1 AA accessibility checks.

---

### 🌊 Wave 6: 8-Stage E2E Simulation Runner (`pnpm conference:simulate`), Docs & Release Notes
* **Goal**: Complete automated integration test harness proving 100% functionality with zero live network egress.
* **Deliverables**:
  1. **Simulation Runner CLI (`scripts/conference-simulate.ts`)**:
     - Stage 1: Seed test institutions, staff, and configure SAML & OIDC providers.
     - Stage 2: SP Metadata generation and IdP connectivity diagnostic simulation.
     - Stage 3: SAML 2.0 assertion validation with XML signature, XXE defense, and replay rejection.
     - Stage 4: OIDC PKCE code flow, token exchange, and JWKS signature verification.
     - Stage 5: JIT user provisioning and cross-campus regional access grant evaluation.
     - Stage 6: Conferencing room creation, capacity gating, and passcode verification.
     - Stage 7: WebRTC signaling relay (offer/answer/ICE) and ephemeral ECDH E2EE key agreement.
     - Stage 8: Merkle audit chain verification for identity and conferencing events.
  2. **Add CLI script**: `"conference:simulate": "tsx scripts/conference-simulate.ts"` in `package.json`.
  3. **Changelog & Documentation**:
     - Document release in `CHANGELOG.md` under `[3.41.0]`.
     - Update operations runbook in `docs/operations/enterprise-sso-webrtc-runbook.md`.
* **Verification**: `pnpm conference:simulate` exits 0 (all 8 stages green), full gate pass (`tsc`, `lint`, `security:tenants`, `security:rbac`, `security:requireauth`).

---

### 🌊 Wave 7: Exploratory QA Audit Remediation (QA-01 through QA-20 Hardening)
* **Goal**: Close and verify all 20 findings (`QA-01` through `QA-20`) identified in `docs/reports/exploratory-qa-report.md`.
* **Deliverables**:
  1. **Public SSO & Proxy Whitelisting (QA-01, QA-08, QA-11, QA-18)**:
     - `src/proxy.ts`: Allowed `application/x-www-form-urlencoded` exclusively for `POST /api/auth/saml/acs`. Exposed public paths for SAML/OIDC.
     - `src/app/api/auth/saml/acs/route.ts`: Fail-closed signature verification against IdP X.509 certificate (rejection of unconfigured IdPs / untrusted KeyInfo), sanitized RelayState via `isSafeInternalPath`, sanitized error responses.
  2. **Multi-Tenant Scoping & Room Identity (QA-02)**:
     - `packages/auth/institution-scope.ts`: Admins without explicit tenant fall back to primary assigned institution before default.
     - `src/app/api/streaming/rooms/route.ts`: Disallows `"global"` on GET and POST.
     - Subresource routes discover concrete `institutionId` when caller holds `"global"`.
  3. **Passcode Sanitization & Constant-Time Verification (QA-03, QA-17)**:
     - `src/lib/streaming/room-manager.ts`: `sanitizeRoom` projects `passcodeHash` out of public returns (`createRoom`, `getRoom`, `listRooms`), exposing only `hasPasscode: Boolean(passcodeHash)`. Constant-time comparison using `crypto.timingSafeEqual` for passcode verification.
  4. **Admin SSO Cockpit Diagnostics (QA-04)**:
     - Fixed payload property mismatch (`data.diagnostic` -> flat diagnostics).
  5. **Signaling & Session Security (QA-05, QA-06, QA-07, QA-19)**:
     - Strict session peer validation in SSE `events`, `signal`, and `leave` endpoints. Disallowed evicting other peers via leave endpoint.
     - Added distributed rate limiting on signal dispatch.
  6. **TURN Secret Fail-Closed & SSRF Egress Defense (QA-09, QA-10)**:
     - `signalingManager.generateTurnCredentials` fails closed if `TURN_SHARED_SECRET` is unset in non-test environments.
     - Protected `/api/auth/sso/test` with `EgressGuard.validateEgressUrl` against SSRF.
  7. **Tenant AST Parity & Allowlist Audit (QA-12, QA-14)**:
     - Replaced non-standard `resolveInstitutionContext` with standard `resolveRequestInstitution`. Added `/api/auth/saml/metadata` to scanner allowlist.
  8. **Real Room Participants & Operations Directory UI (QA-13, QA-20)**:
     - Replaced participant mock with database join of `streamingSessions` and `staff`.
     - Built conferencing directory and management interface at `src/app/(shell)/operations/conferencing/page.tsx`.
* **Verification**: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), 37/37 Jest tests pass, 8/8 simulation stages pass, 100% tenant isolation, 0 naked handlers, 100% RBAC coverage, 691/691 shielded routes.

