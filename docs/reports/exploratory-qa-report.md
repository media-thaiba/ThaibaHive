# Exploratory QA Report — Phase 12 SSO & WebRTC Conferencing (Waves 1–6)

**Date:** 2026-10-14
**Auditor:** OpenCode (mimo-v2.6-flash-free) via `exploratory-qa-auditor` skill (created this phase)
**Branch:** `feat/phase-12-sso-webrtc-conferencing`
**Scope:** Enterprise SAML 2.0 / OIDC federation, JIT provisioning, WebRTC conferencing (rooms, signaling, SSE, E2EE), SSO admin cockpit, conferencing room UI, Flutter conference companion, simulation harness
**Plan position:** Phase 1 of 4 — audit only. **Phases 2–4 (Stryker mutation testing, fast-check property tests, Maestro mobile e2e) must not start until this report is reviewed and approved.**

---

## 1. Executive Summary

**Verdict: DO NOT merge/ship the SSO track as-is. The WebRTC track is partially functional but has broken admin workflows and authorization gaps.**

The Phase-12 code passes every project scanner and 99.8% of the unit suite, but the scanners and unit tests do not exercise the HTTP surface, and live probing of the running app contradicts the green dashboards in three decisive ways:

1. **The entire SAML/OIDC login surface is unreachable.** `src/proxy.ts` requires a session cookie for every non-public API path, and none of `/api/auth/saml/acs`, `/api/auth/saml/metadata`, `/api/auth/saml/sso`, or `/api/auth/oidc/login` are on the public list. Even with a session, the ACS rejects the standard `application/x-www-form-urlencoded` POST binding with 415. SSO login cannot complete end-to-end today — and the route-level SAML code underneath contains a latent signature-verification bypass that activates the moment the routes are whitelisted (QA-08).
2. **Core conferencing workflows break for admins.** `resolveRequestInstitution` resolves admins to `"global"`, which violates the `streaming_rooms.institution_id` foreign key → `POST /api/streaming/rooms` returns **500**, and `GET /api/streaming/rooms/[id]` returns **404** because the new UI pages never pass `institutionId`.
3. **Room passcodes leak their SHA-256 hashes** in room detail and list responses to any `conference:join` holder (staff included), over an unsalted, minimum-4-character secret.

Additionally, the full jest baseline is **not green**: `b8-tenant-bypass-guard` fails because the new `saml/metadata` route reads an institution parameter without calling a resolver.

### Counts

| Status | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Confirmed (live probe) | 2 | 1 | 3 | 0 | **6** |
| Confirmed (static code path) | 1 | 3 | 6 | 3 | **13** |
| Suspected | 0 | 0 | 3 | 1 | **4** |
| Untested (coverage gaps) | — | — | — | — | **7 flows** |

### Top 3 risks

1. **QA-01 + QA-08 (coupled):** SSO is dead on arrival (functional), and the obvious fix (whitelisting the routes in `proxy.ts`) silently arms an unsigned-SAML authentication bypass that JIT-provisions an `admin`-role session.
2. **QA-02/QA-03:** Admins cannot create or open conference rooms (500/404), while everyone who can see a room also receives its passcode hash for offline brute-forcing.
3. **QA-05/QA-06/QA-07:** The signaling plane trusts client-supplied peer identities — signals can be spoofed, stolen, dropped, and participants evicted with only `conference:join`.

### Honest disclosures

- **Tree drift during audit:** baseline snapshot showed waves 1–4 as uncommitted diff (`baseline.diff`, 24,884 bytes, temp dir). During this audit an external agent (`media-thaiba`) committed `9b5e4ea7` (wave 4), `421d1583` (wave 5 — the two UI pages I had observed as untracked), and `d634717d` (wave 6). Final `git status` at report time: clean. All findings reference the wave-1–6 disk state at audit time.
- **Cross-AI plan review (AGENTS.md plan-review-rule): NOT performed.** Qwen (`ask_qwen`) and OpenCode (`chat-with-local-ollama`) MCP tools were unavailable this session (`claude-flow` `autoStart: false` in `.mcp.json`); starting servers or editing config was prohibited by the engagement rules. Per the rule, that review must still happen before Phases 2–4 are approved.
- **Test artifacts:** three QA probe rooms were created in local `dev.db` and deleted afterwards; the dev server was stopped; probe scripts live only in `%TEMP%\opencode\qa-phase1\`.

---

## 2. Scope & Method

### 2.1 Baseline evidence (temp dir: `%TEMP%\opencode\qa-phase1\`)
`baseline.diff` (24,884 B), `baseline-status.txt`, `baseline-log.txt`, `dev-server.log`, `acs-probe.js`, `probe-db.js`.

### 2.2 Gates executed (all read-only)

| Gate | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, 0 errors |
| `pnpm security:requireauth` | ✅ 0 naked handlers |
| `pnpm security:rbac` | ✅ 0 unmapped permission keys |
| `pnpm security:tenants` | ✅ 0 leaks (58 allowlisted) |
| `pnpm gateway:scan` | ✅ 691/691 routes shielded, 0 unshielded |
| `npx tsx scripts/identity/identity-coverage-scanner.ts` | ✅ 15/15 modules, 0 leaks |
| `npx tsx scripts/security/count-error-message-leaks.ts` | ✅ exit 0 — but **258 raw message returns remain allowlisted** (streaming: 5) |
| `pnpm test` (full jest) | ❌ **845/846 suites; 1 failed, 29 skipped; 5406/5436 tests** (see QA-12) |
| `pnpm jest webrtc-conferencing.test.ts` | ✅ 13/13 (fully mocked db; no route/authz/IDOR coverage) |
| `pnpm jest saml-oidc-security.test.ts` | ✅ 10/10 (service-level only: XXE, C14N, replay, skew, signature, PKCE, state HMAC, Merkle) |
| `pnpm conference:simulate` (wave-6 harness) | ✅ 8/8 stages — **library-level; bypasses `proxy.ts`, HTTP, and RBAC entirely** |
| Playwright e2e | ⚠️ not run; grep shows **no spec references streaming/conferencing/SSO/saml/oidc** |

### 2.3 Live environment
- `next dev` (Next.js 16.3.8 Turbopack), SQLite `dev.db`, `.env.local` + `.env`.
- Accounts: `test-admin@thaibahive.local`, `test-staff@thaibahive.local` / `Password123` (both bound to `inst_campus_main`).
- Redis absent (rate-limiter in-memory fallback logs `rate_limit_redis_fallback_activated`), no TURN server, no real IdP — TURN relay and IdP round-trips not exercisable.

### 2.4 Limitations
- No browser/Playwright run of the two new UI pages (verified via code + API probes only).
- SSE streams observed by code-reading, not by a connected streaming client.
- Real SAML/OIDC IdP round-trip impossible while QA-01 blocks the endpoints.
- Flutter conference screen (`wave 5`) not built/run.
- Multi-instance behavior assessed architecturally (in-memory state), not deployed.
- Cross-AI plan review unavailable (see Executive Summary).

---

## 3. Coverage Matrix

Legend: ✅ covered & passing · ⚠️ partial/mocked · ❌ absent · 🧪 live-probed this audit

| Feature | Unit tests | Route/authz tests | E2E (Playwright) | Scanners | Live probe | Simulation harness |
|---|---|---|---|---|---|---|
| SAML response validation (XXE/C14N/replay/skew/sig) | ✅ 10 | ❌ | ❌ (blocked) | ✅ identity | ❌ blocked by QA-01 | ✅ stage 3 |
| SAML ACS / OIDC callback HTTP flow | ❌ | ❌ | ❌ | ⚠️ B8 now failing | 🧪 QA-01 (401/415) | ❌ |
| SSO admin cockpit (`/admin/sso`) | ❌ | ❌ | ❌ | — | 🧪 QA-04 (400) | ❌ |
| SSO providers CRUD API | ❌ | ❌ | ❌ | ✅ rbac/requireauth | 🧪 QA-04 | ❌ |
| SSO test probe (SSRF surface) | ❌ | ❌ | ❌ | — | 🧪 QA-10 | ❌ |
| JIT provisioning + escalation guard | ✅ sim stage 5 | ❌ | ❌ | ✅ rbac | ❌ | ✅ stage 5 |
| Room create/list/get | ⚠️ mocked | ❌ | ❌ | ✅ tenants | 🧪 QA-02/QA-03 | ✅ stage 6 |
| Room join / passcode / capacity | ⚠️ mocked | ❌ | ❌ | — | ⚠️ partial (create only) | ✅ stage 6 |
| Leave / moderate / record | ❌ | ❌ | ❌ | — | ❌ | ⚠️ stage 7 partial |
| Signaling POST (spoofing, schema, rate) | ❌ | ❌ | ❌ | ❌ (0 rate-limits in streaming) | ❌ | ⚠️ queue only (stage 7) |
| SSE events stream | ❌ | ❌ | ❌ | — | ❌ | ❌ |
| E2EE epoch / fingerprint | ✅ 13 | ❌ | ❌ | — | ⚠️ epoch via API | ✅ stage 7 |
| TURN credential issuance | ❌ | ❌ | ❌ | ❌ (B7 gate misses TURN) | 🧪 creds returned (QA-09) | ❌ |
| RBAC matrix (16 roles) | ✅ 26 | ✅ scanner | ⚠️ generic rbac spec | ✅ rbac | 🧪 role probes | ❌ |
| Tenant isolation | ✅ | ✅ scanner | ⚠️ | ✅ tenants 100% | 🧪 cross-tenant 403 correct | ❌ |
| Error-message hygiene | ❌ | ❌ | ❌ | ⚠️ 258 allowlisted | 🧪 several leaks | ❌ |
| UI: `/admin/sso`, `/operations/conferencing/[id]` | ❌ | ❌ | ❌ | — | code-read only (QA-04, QA-20) | ❌ |
| Flutter conference screen | ❌ | ❌ | ❌ | — | not built | ❌ |

**Key gap:** every green gate is either AST-based or library-level. **Zero automated tests cross `src/proxy.ts` → `requireAuth` → Zod → tenant resolver for the new routes**, which is precisely where all critical findings live.

---

## 4. Findings — Confirmed (live-reproduced)

### QA-01 · CRITICAL · functional/authn · confidence: high · confirmed-live
**SSO login surface is unreachable: proxy blocks all SAML/OIDC endpoints.**

- **Repro:**
  1. `POST /api/auth/saml/acs` with body `SAMLResponse=...&RelayState=/dashboard` (no cookie) → `401 {"error":"Not authenticated"}`
  2. Same POST **with** valid `thaibahive_session` cookie (IdP POST binding, `application/x-www-form-urlencoded`) → `415 {"error":"Invalid content type."}`
  3. `GET /api/auth/saml/metadata` (no cookie) → `401`
  4. `GET /api/auth/oidc/login?provider=x` (no cookie) → `401`
  5. `GET /api/auth/saml/sso?provider=x` (no cookie) → `401`
- **Expected:** unauthenticated IdP callbacks and SSO entry points are public; ACS accepts `application/x-www-form-urlencoded`.
- **Actual:** all five paths dead — SAML/OIDC login cannot complete in any environment.
- **Evidence:** live probe results above; `src/proxy.ts:20-52` (`exactPublicPaths`/`prefixPublicPaths` contain none of these paths), `src/proxy.ts:195-204` (write-route content-type allowlist includes only `application/json` and `multipart/form-data`).
- **Root cause:** SSO endpoints were never added to the proxy public lists, and the JSON-only write guard rejects the standard SAML HTTP-POST binding.
- **Suggested regression test:** Playwright/API e2e asserting `POST /api/auth/saml/acs` with urlencoded body and no cookie reaches the route handler (expect the route's own validation response, not 401/415); plus a `proxy.ts` unit test snapshotting the required public SSO paths.

### QA-02 · CRITICAL · functional/tenant · confidence: high · confirmed-live
**Admin room creation returns 500 (FK violation on `"global"`) and admin room detail returns 404.**

- **Repro:**
  1. Login `test-admin@thaibahive.local`.
  2. `POST /api/streaming/rooms` body `{"roomName":"QA Probe Room A","roomType":"MEETING","maxParticipants":5}` → **500** `{"error":"Internal server error"}`.
  3. `GET /api/streaming/rooms` (no query) → `200 {"rooms":[]}` even when rooms exist in real institutions.
  4. `GET /api/streaming/rooms/{id}?institutionId=inst_campus_main` → 200; **without** `institutionId` → **404** — exactly what `src/app/(shell)/operations/conferencing/[id]/page.tsx:55` sends.
  5. With `?institutionId=inst_campus_main` → 201 (works).
- **Expected:** 201 on create; room page loads for admins.
- **Actual:** server log: `api_route_error ... Failed query: insert into "streaming_rooms" (...) values (...) params: room_…,global,global,QA Probe Room A,…` — `LibSQLPreparedQuery` FK failure; UI dead-ends on 404.
- **Evidence:** `packages/auth/institution-scope.ts:105-107` (admin → `requested || session.institutionId || "global"`; admin JWT carries no institutionId so `"global"` wins); `packages/db/schema.ts` `streamingRooms.institutionId` → `institutions(id) ON DELETE CASCADE`; no `institutions.id = 'global'` row (verified readonly); room-manager.ts:94-116.
- **Root cause:** default admin scope `"global"` is not a valid institution row; every streaming route funnels through it when the UI omits `institutionId`.
- **Suggested regression test:** route-level test: admin session, no `institutionId` → expect 201 (or a structured 4xx), never 500; assert no SQL text in error responses.

### QA-03 · HIGH · data-exposure/crypto · confidence: high · confirmed-live
**Room `passcodeHash` (unsalted SHA-256, min 4 chars) disclosed in API responses.**

- **Repro:** admin creates room with `"passcode":"s3cret"` → response contains `"passcodeHash":"1ec1c26b…cba0"`; `GET /api/streaming/rooms/{id}` returns same hash; `GET /api/streaming/rooms` list returns it for every passcode-protected room to any `conference:join` caller (staff included — live-confirmed with `test-staff`).
- **Expected:** passcode digests never leave the server.
- **Actual:** hash returned in create/detail/list JSON; offline brute-force of ≥4-char passcodes is trivial.
- **Evidence:** room-manager.ts:96-98 (unsalted `sha256`), rooms/route.ts & rooms/[id]/route.ts return full rows (`db.select()`), live JSON captured.
- **Root cause:** `getRoom`/`listRooms` return raw rows with no field projection; create echoes the record.
- **Suggested regression test:** response-shape test asserting `passcodeHash` absent (and `passcode` rejected) on create/get/list; property test that no response body contains `passcodeHash`.

### QA-04 · HIGH · functional · confidence: high · confirmed-live
**SSO admin cockpit cannot load or create providers for admins; test-probe result never renders.**

- **Repro:** admin `GET /api/auth/sso/providers` (no query) → **400** `{"error":"Institution context required"}`. Staff → 403. The page (`src/app/(shell)/admin/sso/page.tsx:74-91`) fetches with no `institutionId` and no `x-institution-id` header; same omission on POST create (L99) and POST test (L139).
- **Expected:** cockpit lists/creates providers for the signed-in admin.
- **Actual:** every operation 400s for the default admin persona; additionally the UI reads `data.diagnostic` (L146) but the API returns a flat object (`success, providerType, ssoUrl, …`, test/route.ts:162-171), so even a successful probe renders nothing.
- **Evidence:** providers/route.ts:20-28 (rejects `global`), page.tsx (no institution wiring), live 400.
- **Root cause:** mismatch between admin-scoped API contract and UI that never supplies institution context; second bug: response contract mismatch (`diagnostic` wrapper doesn't exist).
- **Suggested regression test:** component/e2e test: admin loads `/admin/sso` → provider table renders; probe result panel populates after a successful `sso/test`.

### QA-05 · HIGH · authz/data-exposure · confidence: high · confirmed-static
**SSE `events` accepts arbitrary `peerId`, steals and burns victims' pending signals.**

- **Repro (code path):** any user with `conference:join` opens `GET /api/streaming/rooms/{id}/events?peerId={victimPeerId}` → route uses the query value verbatim (events/route.ts:27), fetches that peer's pending signals, pushes them to the attacker, then calls `markSignalsDelivered` on them (L42-48) — the legitimate peer never receives them. Live SSE connect not performed (no streaming client harness), but the handler requires no session binding.
- **Expected:** `peerId` derived from the caller's own active session in that room.
- **Actual:** client-controlled identity on a channel that also mutates delivery state; can capture/drop `key_exchange`, `offer/answer`, `candidate` payloads (E2EE disruption + confidentiality loss).
- **Evidence:** events/route.ts:27,42-48; join route assigns `peerId` server-side (room-manager.ts:201) but events never verifies it.
- **Root cause:** identity parameter taken from the query string without join-table verification.
- **Suggested regression test:** route test: session A calls events with session B's peerId → 403 or falls back to A's peer; assert pending signals of B remain undelivered.

### QA-06 · HIGH · authz/injection · confidence: high · confirmed-static
**Signal POST trusts client `senderPeerId`, never verifies room membership, never applies `conferenceSignalSchema`, no rate limit.**

- **Repro (code path):** `POST /api/streaming/rooms/{id}/signal` with `{"senderPeerId":"<any peer>","signalType":"anything","payloadJson":"<up to 5 MB>"}` → dispatched to DB and broadcast (signal/route.ts:20-41). Caller only needs `conference:join` + same institution.
- **Expected:** sender identity from session; caller must hold an active session in the room; Zod-validated bounded payload; rate limited.
- **Actual:** spoofable sender, no membership check, `conferenceSignalSchema` (schemas.ts:1957) has **zero call sites**, no `checkDistributedRateLimit` anywhere under `src/app/api/streaming/**` (grep: 0 matches), payload bounded only by proxy's 5 MB write cap.
- **Evidence:** signal/route.ts:23-41; schemas.ts:1957-1974; gateway of `src/proxy.ts:179-193` (content-type/size only).
- **Root cause:** "legacy compatibility" branch adopted client fields wholesale; validation schema written but not wired.
- **Suggested regression test:** route tests: (a) `senderPeerId` override ignored in favor of session, (b) non-member rejected, (c) oversized/unknown `signalType` rejected 400, (d) burst → 429.

### QA-07 · HIGH · authz/availability · confidence: high · confirmed-static
**`leave` evicts any participant via client-supplied `peerId`.**

- **Repro (code path):** user A (member of room, or even a non-member with `conference:join` in the institution) sends `POST .../leave {"peerId":"<victim>"}` → route prefers body `peerId` (leave/route.ts:23-24) and calls `leaveRoom`, marking the victim `leftAt` and rotating the room epoch (room-manager.ts:255-289).
- **Expected:** a caller can only leave with their own session's peerId.
- **Actual:** arbitrary in-institution eviction DoS; no check that the caller ever joined.
- **Evidence:** leave/route.ts:23-43; room-manager.ts:255-275.
- **Root cause:** convenience "lookup own session only when peerId absent" logic inverts the security default.
- **Suggested regression test:** route test: body `peerId` differing from caller's active session → 403; victim session remains active.

### QA-08 · CRITICAL (currently latent) · authn/crypto · confidence: high · confirmed-static
**SAML ACS accepts unsigned assertions for unknown issuers → JIT login as attacker-chosen identity/role (blocked today only by QA-01).**

- **Repro (code path):** POST SAMLResponse whose `<Issuer>` matches no configured provider → `provider = null` → institution falls back to hardcoded `'inst-001'` (acs/route.ts:23,47-58) → `providerConfig.wantAssertionsSigned = provider?.wantAssertionsSigned ?? false` (L72) → `shouldVerify = config.wantAssertionsSigned ?? …` evaluates to **`false`** (saml-service.ts:174-176 — nullish coalescing on a defined `false`) → signature verification **skipped entirely** (L178-180) → claims extracted from attacker XML → `FederatedUserMapper.mapOrCreateUser` JIT-provisions with `role` from the assertion (only `super_admin`/`system` clamped to `admin`; `admin`, `principal`, `accounts`… accepted — federated-user-mapper.ts:55-61) → `createSession` issues a real cookie.
- **Mitigating fact (verified live):** the whole chain is currently unreachable because of QA-01 (401/415 at the proxy). In this dev DB the chain also dies at `staffInstitutions` FK (`inst-001` row absent), surfacing as 400 **with raw `err.message`** (acs/route.ts:153-156). In any environment where `inst-001` exists (legacy default tenant referenced across the codebase), full session issuance succeeds.
- **Secondary defect in the same path:** when a signature *is* present but the configured cert is empty, `verifyDigitalSignature` falls back to the attacker-controlled `<KeyInfo>` certificate (saml-service.ts:322-333) — attacker-signed equals "verified".
- **Expected:** fail-closed: unknown issuer → reject; missing configured cert → reject; `wantAssertionsSigned=false` must not mean "skip signature entirely".
- **Actual:** as above.
- **Evidence:** acs/route.ts:23,47-78,153-156; saml-service.ts:174-180,322-333; federated-user-mapper.ts:55-61; live 401/415 probe proving current unreachability.
- **Suggested regression test:** route test posting an unsigned assertion with unknown issuer → must 401/400 at every layer (proxy, route, service); test that KeyInfo fallback is refused when config cert is present/absent per policy.

---

## 5. Findings — Confirmed (static code paths; not live-exercised)

### QA-09 · MEDIUM-HIGH · config/crypto · confidence: high · confirmed-static (credential issuance live-verified)
**TURN credentials mint with a hardcoded development secret and are handed to every `conference:join` caller.**
- **Repro:** `generateTurnCredentials` defaults `secret = process.env.TURN_SHARED_SECRET || 'thaibahive_webrtc_turn_secret_dev_2026'` (webrtc-signaling.ts:54); live `GET /rooms/{id}` returned valid 24 h credentials to **staff** (`username:"1792089723:…", credential:"L90L8l9S…"`) and to admin. `TURN_SHARED_SECRET` appears in **no** env template and is **not** covered by the B7 secret-fallback gate (`secret-fallbacks-b7.test.ts` covers engage/MDM/razorpay/stripe/payment only).
- **Expected:** prod refuses to start / fails closed without `TURN_SHARED_SECRET`; long-term TURN creds admin-gated or short-TTL per-join.
- **Actual:** anyone who deploys without the env var silently shares the published GitHub secret → anyone can mint relay credentials → TURN relay hijack (traffic interception/DoS).
- **Suggested regression test:** B7-style test: with `TURN_SHARED_SECRET` unset (non-test), `generateTurnCredentials` throws; assert the dev literal is dead.

### QA-10 · MEDIUM · injection (SSRF) · confidence: high · confirmed-live
**`POST /api/auth/sso/test` fetches attacker-chosen URLs (internal network reachable).**
- **Repro (live):** admin with `?institutionId=inst_campus_main`, body `{"providerType":"OIDC","targetUrl":"http://127.0.0.1:3000"}` → 200 with `discoveryUrl:"http://127.0.0.1:3000/.well-known/openid-configuration"`, `latencyMs:4310`, `findings:["Discovery endpoint returned HTTP 404"]` — server-side request performed; status/latency/reachability reflected (oracle for internal port-scan).
- **Expected:** scheme+host allowlist (HTTPS, public DNS, block RFC1918/link-local/metadata IPs) or no arbitrary-URL fetch at all.
- **Actual:** `fetch(discoveryUrl)` on user input (sso/test/route.ts:119-150); only `new URL()` syntax check.
- **Mitigations present:** requires `sso:test` permission, `sso_federation` flag, non-`global` institution context.
- **Suggested regression test:** unit test asserting `http://127.0.0.1`, `http://169.254.169.254`, `http://localhost` targets are rejected before fetch (mock fetch to assert non-invocation).

### QA-11 · MEDIUM · authn (open redirect) · confidence: high · confirmed-static
**Post-login/SSO redirects accept protocol-relative URLs; one is unauthenticated.**
- **Repro (code path):** ACS `relayState.startsWith('/')` accepts `//evil.com` → `new URL('//evil.com', request.url)` redirects off-site (acs/route.ts:139-140); OIDC callback same pattern on signed `returnUrl` (callback/route.ts:148-152), and `oidc/login?returnUrl=//evil.com` signs whatever it receives (login route) → phishing redirect after a genuine login. Worse: `saml/sso?ssoUrl=https://evil.com` redirects the browser to an arbitrary URL when no provider is configured (sso/route.ts:52) — unauthenticated open redirect (latent behind QA-01).
- **Expected:** reject `//`, `/\`, `\\`, and absolute URLs; allowlist paths.
- **Suggested regression test:** table-driven test of `relayState`/`returnUrl`/`ssoUrl` values (`//x`, `/\x`, `https://x`, `%2f%2fx`) expecting safe fallback.

### QA-12 · MEDIUM · testing-gap (baseline regression) · confidence: high · confirmed-live (test run)
**Full jest baseline fails: `b8-tenant-bypass-guard` (1 of 846 suites).**
- **Repro:** `pnpm test` → `Tests: 1 failed, 29 skipped, 5406 passed`; failure: `[GET] src/app/api/auth/saml/metadata/route.ts: Reads query tenant/institution parameter without calling resolver`.
- **Expected:** green baseline before Phase-12 merge.
- **Actual:** AST tenant-guard red; `saml/metadata/route.ts:11` reads `institutionId` for the feature-flag check without a resolver (route returns only static SP XML — no tenant data — but the guard's contract is unconditional).
- **Note:** the same test's allowlist calls `oidc/login` and `saml/sso` "Public SSO entry", contradicting `proxy.ts` where they are **not** public — test contract and runtime contract disagree (ties to QA-01).
- **Suggested regression test:** resolve by either wiring a resolver/allowlisting with justification — and add a CI assertion that `pnpm test` exit code gates the merge.

### QA-13 · MEDIUM · functional/data-integrity · confidence: high · confirmed-static
**`rooms/[id]/participants` is a stub that fabricates data.**
- **Repro (code path):** `GET .../participants` for any roomId → `mediaManager.getRoom(roomId)` misses → **creates** a fake room `"Hybrid Lecture Hall A"` with `hostId:"prof-001"` and joins `stu-001`/`stu-002` (participants/route.ts:13-18); tenant falls back to hardcoded `"inst-001"` (L11); errors return `err.message` (L31). It never reads `streaming_sessions`.
- **Expected:** real participant list from DB, institution-scoped.
- **Actual:** in-memory demo data, potential row fabrication, `streaming:access`-gated but scope-unsound.
- **Suggested regression test:** route test: real joined session appears; unknown room → 404, not synthetic participants.

### QA-14 · MEDIUM · availability/config · confidence: high · confirmed-static
**Security-critical state lives in per-process Maps: room locks, E2EE epochs, SSE fan-out, SAML replay cache.**
- **Repro (code path):** `roomEpochs`/`roomLocks` (room-manager.ts:22-24), SSE `listeners` (webrtc-signaling.ts:28), `replayCache` (saml-service.ts, module-level Map). On multi-instance deployments (Vercel/serverless — the repo deploys there): locking a room on instance A does not block joins on instance B → **lock bypass**; epoch rotation desyncs → E2EE fingerprint/decrypt failures; signals dispatched on A never reach SSE subscribers on B (DB queue only replays on next connect, and only to `peerId`-matching readers — QA-05/16); SAML replay protection becomes per-instance.
- **Expected:** shared store (DB/Redis) or single-writer sticky routing; documented single-instance constraint.
- **Suggested regression test:** two RoomManager/signaling instances in one test: lock on A must block join on B; replay on A then B must reject.

### QA-15 · MEDIUM · availability · confidence: high · confirmed-static
**Capacity gate is SELECT-then-INSERT (not atomic despite the comment) and joins are not deduplicated.**
- **Repro (code path):** `joinRoom` counts active sessions then inserts (room-manager.ts:186-221) — concurrent joins over-fill; repeated joins by the same user create new sessions each time (`peerId` regenerated) → seat-filling DoS by one user; every join rotates the room epoch (L224) → thrash.
- **Expected:** transactional/upsert gate keyed by `(room,user)`; idempotent rejoin.
- **Suggested regression test:** concurrency test joining N=2×capacity simultaneously → exactly `maxParticipants` sessions; same user joining twice → single active session.

### QA-16 · MEDIUM · data-exposure/availability · confidence: high · confirmed-static
**SSE connect replays the entire signal history of a room; `delivered` flag is never used for reads; no retention.**
- **Repro (code path):** `getPendingSignals` filters institution/room/recipient only — **no `delivered=false`, no time bound, no limit** (webrtc-signaling.ts:117-143). Every SSE connect pushes all historical signals (past SDP with IPs, `key_exchange` payloads, even of departed participants) to the connecting peer, then marks them delivered — a flag that read paths ignore. Tables grow forever (no TTL cleanup anywhere for `conferenceSignals`).
- **Expected:** pending = undelivered ∧ recent ∧ capped; TTL purge job.
- **Suggested regression test:** insert 1000 historical signals, connect SSE → receives only undelivered/new; assert purge removes rows past retention.

### QA-17 · LOW-MED · functional · confidence: high · confirmed-static
**Dead and wrong support logic in room-manager.**
- `sweepStaleSessions` has **zero callers** (repo-wide grep) and compares against `joinedAt`, not heartbeat — if ever wired it would evict every session older than 30 s (room-manager.ts:391-404).
- `handleRecording` stop hardcodes `durationSeconds:300`, `fileSizeBytes:15MB`, and a synthetic checksum `sha256(id+streamId)` (L467-476); start never verifies the room exists (L437-451); `recordingUrl` points at a file nothing writes.
- `moderateRoom` accepts `moderatorUserId` but never uses it (L295-304) — no audit of who kicked whom beyond best-effort signals.
- Join assigns `HOST` only when the **caller's role** is admin/principal (route logic), ignoring `room.hostUserId` — the room's actual host can join as ATTENDEE.
- **Suggested regression test:** unit tests asserting join role honors `hostUserId`; recording stop computes real deltas from `createdAt`.

### QA-18 · LOW · data-exposure · confidence: high · confirmed-static + scanner
**Raw `err.message` returns and SSE cache headers.**
- ACS (L154), OIDC callback (L168), sso/test (L175), sso/providers (L82/190), record (L35), participants (L31) return `err.message` on 4xx/5xx — the leak scanner exits 0 only because **258 raw message returns are allowlisted** (streaming: 5). Live proof: SQL/`Failed query` text reached server logs on QA-02 (client got generic 500 — good — but the pattern is one refactor away). SSE headers set `Cache-Control: no-cache, no-transform` without `private, no-store` (events/route.ts:81).
- **Suggested regression test:** error-shape test over the Phase-12 routes asserting `{error}` never contains `SQL`/`query`/`stack`; shrink the allowlist rather than grow it.

### QA-19 · LOW · crypto · confidence: high · confirmed-static
**Passcode comparison is non-constant-time.**
- `providedHash !== room.passcodeHash` (room-manager.ts:175) — with the hash also exposed (QA-03) this compounds; use `crypto.timingSafeEqual`.
- **Suggested regression test:** behavior test + static assertion that `timingSafeEqual` is used.

### QA-20 · LOW · ux/functional · confidence: high · confirmed-static
**Conferencing room page is an orphan; no list surface exists.**
- Only `operations/conferencing/[id]/page.tsx` exists (no `page.tsx` list), and grep finds **zero** navigations to `operations/conferencing/…` anywhere in the shell UI. Even if a user reaches a room URL as admin, QA-02 makes it 404. Hardcoded display fingerprint `"B82F-1A4C-99E0-442D"` (page.tsx:48) risks being mistaken for real E2EE verification.
- **Suggested regression test:** e2e: from a list/entry point, create → open room page → participants render (admin and staff personas).

---

## 6. Findings — Suspected (need one more verification step)

### QA-S1 · MEDIUM · authn · suspected
**OIDC callback never verifies an ID-token `nonce`** — flow relies on PKCE + HMAC state only (callback/route.ts:37-86). Needs confirmation in `OidcService.processCallback`; if absent, ID-token replay within code-exchange window is possible against a compromised/leaking redirect. *Verify: read `oidc-service.ts` token handling; add nonce round-trip test.*

### QA-S2 · MEDIUM · tenant-isolation · suspected
**JWT `institutionId` claim is added to the membership set without DB re-check** (`institution-scope.ts:111-113`: `membershipSet.add(session.institutionId)`), so a user removed from an institution retains access to it until token expiry. *Verify: remove membership mid-session and probe; decide if re-validation is required for high-risk ops.*

### QA-S3 · MEDIUM · config · suspected
**Production risk that `TURN_SHARED_SECRET`/`FEATURE_SSO_FEDERATION`/`FEATURE_WEBRTC_CONFERENCING` are unset** in deployment config (no env template entries found), which would mean (a) prod TURN runs on the leaked dev secret (QA-09) or (b) flags silently default false and features are dead rather than secure. *Verify: deployment env review (outside repo scope).*

### QA-S4 · LOW · availability · suspected
**No rate limiting anywhere in `src/app/api/streaming/**`** (grep: 0 matches) combined with QA-06 suggests cheap in-institution flooding (DB write per signal, 5 MB cap each). *Verify: burst probe on signal endpoint once a room exists.*

---

## 7. Untested flows (explicitly not exercised)

1. Full SAML/OIDC login round-trip with a real IdP (blocked by QA-01).
2. Connected SSE clients and live signal fan-out (no streaming test client run).
3. In-browser WebRTC media, TURN relay, and actual E2EE decrypt/fingerprint comparison (no TURN server, no browser session).
4. Both new UI pages in a real browser (Playwright not run; code-read + API probes only).
5. Flutter conference screen (not built/run; CI `flutter-ci.yml` state not re-verified this phase).
6. Multi-instance/production-parity behavior of locks/epochs/SSE/replay (QA-14 assessed architecturally).
7. Load/concurrency behavior of join capacity (QA-15 static; k6 voice profile not run).

---

## 8. Prioritized Findings Table

| ID | Severity | Category | Status | Effort to fix (est.) | Phase |
|---|---|---|---|---|---|
| QA-01 | Critical | functional/authn | confirmed-live | S — proxy public list + content-type allowlist | P1 fix |
| QA-08 | Critical | authn/crypto | confirmed-static (latent) | M — fail-closed issuer/cert policy | P1 fix (with QA-01) |
| QA-02 | Critical | functional/tenant | confirmed-live | M — admin default scope vs FK (or `"global"` row strategy) | P1 fix |
| QA-03 | High | data-exposure | confirmed-live | S — field projection | P1 fix |
| QA-05 | High | authz | confirmed-static | S — bind peerId to session join row | P1 fix |
| QA-06 | High | authz | confirmed-static | M — identity from session + wire `conferenceSignalSchema` + rate limit | P1 fix |
| QA-07 | High | authz | confirmed-static | S — ignore body peerId unless = caller's session | P1 fix |
| QA-04 | High | functional | confirmed-live | M — institution context in UI + response contract | P1 fix |
| QA-09 | Med-High | config/crypto | confirmed-static | S — fail closed + B7 gate entry | P1 fix |
| QA-10 | Medium | SSRF | confirmed-live | S — URL allowlist | P1 fix |
| QA-11 | Medium | open redirect | confirmed-static | S — strict path validation | P1 fix |
| QA-12 | Medium | testing-gap | confirmed-live | S — resolver/allowlist in metadata route | P1 fix |
| QA-13 | Medium | functional | confirmed-static | M — real query or delete stub | P1 fix |
| QA-14 | Medium | availability | confirmed-static | L — shared state or documented constraint | P2 |
| QA-15 | Medium | availability | confirmed-static | M — transactional gate + dedupe | P1 fix |
| QA-16 | Medium | data-exposure | confirmed-static | M — delivered/limit/TTL on reads | P1 fix |
| QA-17 | Low-Med | functional | confirmed-static | S each | P2 |
| QA-18 | Low | data-exposure | confirmed-static | S — error shaping + `private, no-store` | P1 fix |
| QA-19 | Low | crypto | confirmed-static | S — `timingSafeEqual` | P1 fix |
| QA-20 | Low | ux | confirmed-static | S — list page/links | P1 fix |
| QA-S1–S4 | Med/Low | mixed | suspected | — | verify next |

---

## 9. Recommended Next Steps (gated — do NOT start until approved)

1. **Approval checkpoint:** review this report; run the pending cross-AI plan review (Qwen `ask_qwen`, OpenCode local Ollama, Claude) per AGENTS.md once those tools are available.
2. **P1 fix wave (separate task, still no Phase 2–4):** address QA-01 → QA-08 in that order (fixing QA-01 **must** ship with QA-08), then QA-02/03/04, then QA-05/06/07, then QA-09/10/11/12/13/15/16/18/19/20. Each fix lands with the regression test suggested in its finding.
3. **Phase 2 — Stryker mutation testing** (targeted: `packages/auth/institution-scope.ts`, `src/lib/auth/saml-service.ts`, `src/lib/streaming/room-manager.ts`) — measure mutation score on the security-critical branches this audit found untested (nullish-coalescing signature gate, membership checks).
4. **Phase 3 — fast-check property tests** (passcode hashing/verification invariants, signal schema bounds, redirect-path validation, institution resolver invariants across 16 roles).
5. **Phase 4 — Maestro mobile e2e** (Flutter conference room screen handoff + WebView SSO handoff).
6. **Coverage to add regardless of phase:** first-ever route-level e2e for `/api/streaming/**` and SSO crossing `src/proxy.ts`; Playwright specs for the two new UI pages; CI gate on `pnpm test` exit code (QA-12); add `TURN_SHARED_SECRET` to the B7 secret-fallback gate.

---

*Artifacts: `%TEMP%\opencode\qa-phase1\` (baseline diff/status/log, dev-server log, probes). Skill created: `.claude/skills/exploratory-qa-auditor/SKILL.md`. Working tree at report time: clean except these two new files. No application code, config, dependencies, or commits were modified; three probe rooms created in local dev.db were removed.*
