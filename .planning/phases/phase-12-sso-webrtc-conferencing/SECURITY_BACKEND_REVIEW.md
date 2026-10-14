# Phase 12 — Security & Backend Cross-AI Plan Review (Track 3A)

**Rule Source**: `AGENTS.md` "Plan Review Rule" — Qwen, OpenCode, and Claude Code must each review every plan before execution.  
**Status**: CONVERGED — APPROVED (Round 1 Review Dispositions Incorporated into Draft v2).

---

## 1. Executive Summary & Convergence

All three review legs evaluated the Phase 12 architecture covering **Enterprise Campus Identity (SAML 2.0 / OIDC SSO)** and **Real-Time E2EE Multi-Party WebRTC Conferencing**:
* **Claude Code** (`qwen2.5-coder`): 22 structured findings across Security (Q1–Q10), WebRTC (O1–O6), Database Parity (C1–C6), and Next.js 16 Edge/Serverless Runtime (R1–R3).
* **OpenCode** (`qwen3.5`): 10 core architectural controls covering XML canonicalization, DTLS/SFrame key rotation, TURN credential HMAC expiration, and ICE candidate privacy masking.
* **Qwen** (`qwen3.6`): Deep cryptographic validation on SAML XML signature trust bounds, replay window caching, and JIT role escalation prevention.

**Result**: 100% of critical security and architectural items have been triaged and adopted into `SPEC.md` and `PLAN.md` Draft v2. **Zero open HIGH blockers remain.**

---

## 2. Review Dispositions Matrix

| # | Leg | Sev | Category | Finding Description | Disposition & Resolution in Draft v2 |
|---|---|---|---|---|---|
| **Q1** | Claude / Qwen | **HIGH** | SAML Security | XML Signature validation without proper XML canonicalization (C14N) allows signature wrapping/forgery attacks. | **ACCEPT** — Enforce exclusive XML Canonicalization (C14N `http://www.w3.org/2001/10/xml-exc-c14n#`) prior to crypto hash verification. Validate certificate chain against registered IdP X.509 cert. |
| **Q2** | Claude / Qwen | **HIGH** | SAML Security | XML External Entity (XXE) attacks via malicious DTD/entity expansion payloads. | **ACCEPT** — Strict fail-closed XXE parser rejecting `<!DOCTYPE`, `<!ENTITY`, and external schema references before parsing. |
| **Q3** | Claude / OpenCode | **HIGH** | SAML Security | Assertion replay attack if SAML Response ID is re-submitted within the validity window. | **ACCEPT** — In-memory/Redis assertion replay cache tracking `Assertion ID` + `InResponseTo` with strict 600s TTL (2x clock skew). |
| **Q4** | Claude / OpenCode | **HIGH** | SAML Security | Clock skew vulnerability if `NotBefore` and `NotOnOrAfter` lack strict bounds. | **ACCEPT** — Enforce maximum $\pm 300\text{s}$ tolerance window on `NotBefore` and `NotOnOrAfter`. |
| **Q5** | Claude | **HIGH** | SAML Security | Missing `Destination` and `AudienceRestriction` checks allow token forwarding from foreign SPs. | **ACCEPT** — Strict assertion checks ensuring `Destination` equals the configured ACS URL and `Audience` equals the SP Entity ID. |
| **Q6** | Claude / OpenCode | **HIGH** | OIDC Security | Lack of PKCE `code_challenge` verification enables authorization code interception on mobile/public clients. | **ACCEPT** — Mandatory PKCE S256 code challenge generation on `/login` and verification against `code_verifier` on `/callback`. |
| **Q7** | Claude | **HIGH** | OIDC Security | Insecure ID Token parsing without cryptographic signature verification against provider JWKS. | **ACCEPT** — Integrate `jose.jwtVerify` with `jose.createRemoteJWKSet(new URL(provider.jwksUri))` with key caching. |
| **Q8** | Claude / OpenCode | **HIGH** | OIDC Security | CSRF on SSO callback without cryptographically bound state/nonce parameters. | **ACCEPT** — State parameter is a tamper-evident HMAC-SHA256 signed token containing `tenantId`, `nonce`, and timestamp with 10-minute expiry. |
| **Q9** | Claude / Qwen | **HIGH** | Auth Escalation | JIT auto-provisioning role escalation where IdP asserts `admin`/`super_admin` without tenant verification. | **ACCEPT** — Strict negative role boundary: JIT auto-provisioning defaults to `staff` or `teacher`. Administrative roles (`admin`, `principal`, `super_admin`) require pre-existing tenant assignment or explicit white-listed IdP group mapping. |
| **Q10** | Claude | **HIGH** | Multi-Tenancy | Tenant IDOR leaks where SAML/OIDC providers or rooms from Tenant B are accessed by Tenant A. | **ACCEPT** — All SSO and conferencing queries enforce `resolveScopedInstitutionId()`. Strict tenant scoping matching Rules A–D. |
| **O1** | Claude | **HIGH** | WebRTC | Signaling race conditions when offer and answer arrive out of order or simultaneous offer collisions occur. | **ACCEPT** — Perfect Negotiation pattern (Polite vs Impolite peer role) with sequence-numbered signaling queue in `conferenceSignals`. |
| **O2** | Claude | **HIGH** | WebRTC | Room capacity race condition allowing participant overflow beyond `maxParticipants`. | **ACCEPT** — Atomic participant admission gate: count active `streamingSessions` within a database transaction; reject with `429 Room Full` if at capacity. |
| **O3** | Claude | **HIGH** | WebRTC | Orphaned peer sessions when client abruptly disconnects without emitting `peer_left`. | **ACCEPT** — Heartbeat watchdog with 30s ping timeout; automated sweeper transitions stale peers to `DISCONNECTED` and alerts remaining peers. |
| **O4** | Claude / OpenCode | **HIGH** | WebRTC | Hardcoded or leaked long-lived TURN credentials. | **ACCEPT** — Ephemeral TURN credentials using RFC 5766 time-limited HMAC-SHA1 tokens with 24-hour validity. |
| **O5** | Claude / OpenCode | **HIGH** | WebRTC / E2EE | Missing forward secrecy and post-compromise security in SFrame / MLS media encryption. | **ACCEPT** — Ephemeral ECDH (P-256) per-room key agreement with epoch key derivation (AES-128-GCM / SFrame). |
| **O6** | Claude | **HIGH** | WebRTC / E2EE | Removed participant retains cryptographic room key and can decrypt subsequent media frames. | **ACCEPT** — Immediate key rotation epoch upon participant removal or exit. Remaining peers re-key; evicted peer is isolated. |
| **C1** | Claude | **HIGH** | Database | SQLite vs PostgreSQL column type divergence. | **ACCEPT** — Dual-dialect schema parity enforced via automated `schema-drift.test.ts` (100% table and column alignment). |
| **C2** | Claude | **HIGH** | Database | Concurrent overlapping room bookings across campuses. | **ACCEPT** — Leverage Phase 11 atomic interval conflict defense (`EXCLUDE USING gist` in PG / transactional overlap check in SQLite). |
| **C3** | Claude | **HIGH** | Database | Duplicate federated identity mapping rows on concurrent logins. | **ACCEPT** — Unique composite index on `(institution_id, provider_type, external_subject_id)` across both schemas. |
| **C4** | Claude | **HIGH** | Database | Orphaned sessions/signals on room deletion. | **ACCEPT** — Explicit `ON DELETE CASCADE` foreign keys on `institutionId` and `roomId`. |
| **C5** | Claude | **HIGH** | Database | Unindexed `institution_id` causing full table scans. | **ACCEPT** — Add explicit `institution_id` indexes on all new tables: `saml_providers`, `oidc_providers`, `federated_identity_mappings`, `streaming_rooms`, `streaming_sessions`, `conference_signals`, and `sso_audit_logs`. |
| **C6** | Claude | **HIGH** | Database | Audit ledger bloat over time. | **ACCEPT** — Documented 90-day retention policy on `sso_audit_logs` and `conference_signals` with automated daily TTL purge. |
| **R1** | Claude | **HIGH** | Serverless / Edge | Next.js Server-Sent Events (SSE) stream socket holding and timeout exhaustion on Vercel/Edge. | **ACCEPT** — Heartbeat keep-alive pings every 15s; client auto-reconnect with last-event-id; graceful stream termination when client disconnects. |
| **R2** | Claude | **HIGH** | Serverless / Edge | Node.js `crypto` vs WebCrypto API incompatibility in Edge middleware and serverless routes. | **ACCEPT** — Use WebCrypto (`globalThis.crypto.subtle`) and `jose` for all token validation and cryptographic operations in edge-compatible modules. |
| **R3** | Claude | **HIGH** | Serverless / Edge | Route handler concurrency bottlenecks during mass student conference join. | **ACCEPT** — In-memory Redis pub/sub signaling adapter for high-volume room fan-out; connection rate limiting (30 requests/min/peer). |
