# Exploratory QA Report — Presence Enforcement v3.42.0 / v3.42.1

**Date:** 2026-10-16 · **Auditor:** OpenCode (exploratory-qa-auditor skill) · **Mode:** read-only
**Baseline:** `dc92932e` (clean tree, 24 ahead / 0 behind both remotes)

## 1. Executive summary

**Verdict: NOT ship-perfect — feature-complete but with 5 pilot-breaking gaps, all `confirmed-static` and independently re-verified.** 27 findings: 1 critical, 8 high, 12 medium, 6 low. Gates are green (jest 851/851, tsc 0, eslint 0, flutter analyze/test 0, scanners clean) — the gaps are **coverage holes no gate exercises** (missing scheduler, cross-layer contract drift, half-wired clients), not regressions.

Top 3 risks (each independently spot-checked by the lead auditor against source):

1. **QA-01 (critical)** — battery `-1` sentinel poisons the offline buffer permanently → presence uploads can fully stall.
2. **QA-03 (high)** — enabling the pilot flag breaks live/web NFC check-in (403 nonce) because no client sends a nonce.
3. **QA-04 (high)** — the staleness/auto-checkout cron endpoint has **no scheduler anywhere** (grep of `.github/workflows` = 0 hits); the enforcement loop never runs in prod.

Drift note: none — tree clean and unchanged during audit; no external commits observed.

## 2. Scope & method

- **Surface audited:** violations cockpit UI + API, settings API + form, presence-log ingestion, enforcement engine, cron sweep, check-in/check-out hooks, NFC anti-replay, mobile background pipeline (throttle/grace/buffer), env pilot rollout, dev.db pilot config.
- **Method:** full static deep-read by sub-auditor (mobile↔server contract diff line-by-line, all 8 server files, edge auth path); 5 critical findings re-verified by lead; prior-session gate evidence (no code changed since `f41cf8e4..dc92932e`).
- **Limitations:** no live browser/HTTP probing this pass (server not started); no mobile device run; `claude` CLI still unavailable for cross-agent plan review (dead local gateway — qwen review to be run if a remediation plan is approved). Legacy-token mode env value unconfirmed (QA-16 env-dependent).

## 3. Coverage matrix

| Feature | Unit | Route/authz | Live probe | Scanners | Gap found |
|---|---|---|---|---|---|
| Violations API (stats/search/scoping) | ✅ 7 tests | ✅ resolveRequestInstitution fail-closed | ⬜ | ✅ | QA-21 chips, QA-25 UI edges |
| Violations cockpit UI | ⬜ | — | ⬜ | — | QA-13 races, QA-21 |
| Settings GET/PUT + form | ✅ 250-line suite | ✅ principal 403 asserted | ⬜ | ✅ | QA-11 principal save race, QA-12 dead toggles |
| Presence-log ingestion | ✅ mocked | ⚠️ partial | ⬜ | ✅ | QA-01, QA-08, QA-10, QA-17, QA-18, QA-19, QA-27 |
| Enforcement engine | ✅ full branches | — | — | — | QA-09 (infra error charged to staff) |
| Cron sweep | ✅ 8 tests | ✅ system:cron | — | — | QA-04 **no scheduler wired** |
| NFC anti-replay | ✅ engine tests | — | — | — | QA-03 **no client sends nonce** |
| Check-in/out hooks | ✅ | — | — | — | QA-05 no institutionId, QA-07 checkout payload dead |
| Mobile pipeline | ✅ 8 Dart tests | — | ⬜ | — | QA-02, QA-06, QA-14, QA-15, QA-26 |
| Env pilot rollout | ✅ 6 tests | — | — | ✅ | QA-23 load-time cache |

## 4. Findings (prioritized)

### Pilot-breaking tier (fix before enabling shadow pilot beyond TPS-MAJHI)

**QA-01 · critical · payload-contract · confirmed-static** — `presence_verification_service.dart:67-73` returns battery `-1` on error; Zod `presenceLogEntrySchema` (`schemas.ts:2006`) requires `min(0)` → 400; bulk flush (`presence-log/route.ts:41-53`) aborts the whole batch on first invalid entry and the buffer is never cleared on 4xx (`background_presence_service.dart:448-469`) → **one bad entry permanently blocks all presence uploads** (poison-pill).
*Fix:* clamp `-1 → null` client-side; server: per-entry skip or coerce; cap buffer. *Test:* Dart test `toJson()` never emits `<0`; route test batch with 1 bad entry still persists the rest.

**QA-03 · high · half-built-integration · confirmed-static** — flag ON sets `requireAntiReplay` (`check-in/route.ts:50-63`); web `check-in-panel.tsx:26` and mobile live check-in send **no `nfcNonce`/`tapAt`** → 403 "NFC tap nonce is required". Only the offline outbox path (sync-appliers, nonce optional) survives. **Turning the pilot on breaks live NFC check-in.**
*Fix:* nonce handshake in both clients (or capability flag). *Test:* e2e flag-ON NFC check-in.

**QA-04 · high · half-built-integration · confirmed-static** — `/api/cron/presence-sweep` exists + tested but **no `schedule:` workflow, no vercel.json, no in-app scheduler** (grep `.github/workflows` = 0 hits). Stale→violation→auto-checkout never runs in prod. *Fix:* GitHub `schedule:` calling with `x-cron-secret`. *Test:* scheduler-manifest assertion in CI.

**QA-05 · high · tenant-isolation · confirmed-static** — `attendance_logs.institution_id` never populated at check-in (`check-in/route.ts:118-132`) or sync (`sync-appliers.ts:354-363`) → sweep resolves global flag/settings for these rows and violations API (scoped filter, `violations/route.ts:34-36`) **hides NULL-institution rows from tenant admins**. Per-tenant pilot semantics partially defeated. *Fix:* populate on insert + backfill. *Test:* sweep with NULL institutionId; tenant admin sees own rows.

**QA-06 · high · functional · confirmed-static** — `background_presence_service.dart:392` auto-checkouts on `autoCheckoutOnViolation` **without checking `shadowMode`**; server gates on `!shadowMode && autoCheckoutOnViolation` (`presence-sweep/route.ts:147-148`). Shadow+autoCheckout misconfig hard-logs-out users client-side. *Fix:* add `&& settings?.shadowMode != true`. *Test:* Dart unit test.

### Correctness/UX tier

- **QA-02 (high)** — every DioException (400/401/403/500) buffered as "offline"; unbounded, in-memory, cleared only on 2xx → endless retries. Buffer only on connection errors; cap size; quarantine 4xx.
- **QA-07 (med)** — no client sends presence payload to check-out → whole checkout enforcement block (mock-location 403, violation increments) is dead code. Wire payloads or delete + document.
- **QA-08 (med)** — flag-off branch trusts client `isWithinGeofence` to increment `geofenceViolations` while the UI claims "server-recomputed". Skip counter mutation or mark `source: client_claim`.
- **QA-11 (med)** — principal deep-linking `?tab=settings` before `/api/auth/me` resolves → PUT sends `institutionId: null` → 403 "Modifying global settings"; save always fails with bare "Forbidden" toast. Server-resolve principal scope or derive after profile load.
- **QA-09 (med)** — engine fail-closed catch sets `violationsIncrement: true` (`presence-enforcement-engine.ts:418`) → infra errors penalize staff. Set false; keep status only.
- **QA-10 (med)** — server stamps ingestion time as `lastVerifiedAt` (no observation-time/max-age); ticks still mutate checked-out rows; offline checkout never calls `stopTracking()`.
- **QA-12 (med)** — `criticalBatterySuspend` / `lowBatteryIntervalMinutes` fully wired API↔form↔model but **zero consumers** — dead toggles shown to admins.
- **QA-13 (med)** — cockpit fetch: per-keystroke request (no debounce), no AbortController, setState-after-unmount; chips effect does it right — main fetch should copy it.
- **QA-14 (med)** — mobile uploads whenever settings `isEnabled`, never reads the flag → flag-off still ingests for every tenant (feeding QA-08 branch). Expose flag on settings GET; stop ticker when off.
- **QA-15 (med, suspected)** — personal-card/locationless check-in gets no geofence → tracking never starts → sweep (once wired) will mark stale and auto-checkout legitimate staff. Use institution geofences or exempt.
- **QA-19 (med, suspected)** — `db.transaction` callbacks await reads on the shared SQLite connection while the tx is open — interleaving risk under concurrency; resolve context before opening tx.

### Hygiene tier

QA-16 (legacy-token SOFT_ENFORCE would 401 mobile POSTs — env-dependent), QA-17 (malformed JSON → 500 not 400; `limit=abc` NaN), QA-18 (batch counter undercount via non-atomic read-modify-write), QA-20 (no `source`/`observedAt` on presence_logs; auto-checkout hardcoded `source:"self"`), QA-21 (context chips fetch global flags, not tenant pilot state), QA-22 (`attendance-marking-wizard.tsx` — unimported, would always 400), QA-23 (env read at module load — dev restart needed; overrides per-process only), QA-24 (dry-run `baseFlag` field reads global only — reporting nit), QA-25 (from>to silent empty; empty-page traps pagination; UTC default dates), QA-26 (WiFi fallback unreachable — SSID never captured; verificationMethod constant), QA-27 (no batch-size cap — DoS surface).

### Verified CLEAN (spot-checked or proven)

Edge Bearer path (`proxy.ts` accepts cookie **or** Bearer, JWT verify, secret-purpose match; `verifySession` falls back to Authorization header) — **mobile auth path works**. RBAC grants (`staff: attendance:read`, settings PUT `attendance:manage`, sweep `system:cron`+secret). IDOR (all presence rows resolved by `session.staffId`). Settings resolution precedence (institution→global→defaults) identical server/mobile. Null island / NaN guards. Cron timestamp capping + shadow gating + `source:"auto"`. Settings PUT payload complete (`isEnabled` + `shadowMode` saved). Violations API stats/rows scoping parity. Feature-flag env rollout tests.

## 5. Prioritized table

| ID | Sev | Effort | Status | Fix before |
|---|---|---|---|---|
| QA-01 | critical | S | confirmed-static | pilot scale-up |
| QA-03 | high | M (client handshake) | confirmed-static | **flag ON for any tenant** |
| QA-04 | high | S (one workflow file) | confirmed-static | prod cutover |
| QA-05 | high | M (+backfill script) | confirmed-static | prod cutover |
| QA-06 | high | S (one condition) | confirmed-static | flag ON |
| QA-02 | high | S | confirmed-static | flag ON |
| QA-11 | medium | S | confirmed-static | any settings UI use |
| QA-07/08/09/10 | medium | S-M each | confirmed-static | graduation |
| QA-12/13/14/15/19 | medium | S-M | static/suspected | graduation |
| QA-16..27 | low | S | static/suspected | backlog |

## 6. Recommended next steps (approval required)

1. **Wave A — pilot unblockers (S effort, ~6 fixes):** QA-01, QA-02, QA-04, QA-05, QA-06 + QA-03 minimal path (relax `requireAntiReplay` until clients ship the handshake, or ship the web nonce first).
2. **Wave B — correctness:** QA-07..QA-11.
3. **Wave C — backlog:** hygiene tier + decide QA-12/QA-26 dead-field policy (implement vs remove).
4. Per AGENTS.md plan-review rule, any approved remediation plan goes through qwen review (claude CLI unavailable — noted as limitation).

*No fixes were applied during this audit (read-only skill contract).*
