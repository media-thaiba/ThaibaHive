# Phase 3: Media Queue & High-Integrity Offline Pipelines — "Uploads Survive the Network, Sync Tells the Truth"

**Milestone**: ThaibaHive Two-Tier Platform
**Phase**: 3 of 5 (post-Freeze roadmap: 1 Capabilities & Nav → 2 Today & Action Center → **3 Media Queue & Offline** → 4 Deep Links & Handoff → 5 Global Search)
**Status**: Complete (all 8 commits landed, 100% verification green)
**Estimated Duration**: 6-8 days
**Dependencies**: Phase 1 (capability registry, mobile nav skeleton) + Phase 2 (Action Center state machine, tray, tab IA) — all merged to master via PRs #1-#2

---

## Objective

Phase 2 proved the *client-first* pattern: a Hive-persisted state machine, idempotent dedupe,
and producers that reconcile with the server. Phase 3 applies the same discipline to the two
areas the repo has **schemas and stubs for but no working product**:

- **Media queue**: the mobile `MediaScreen` is 100% static placeholder (fake thumbnails,
  no-op buttons, a hardcoded Outbox tab); `MediaRepository` is never called; uploads are
  single-shot multipart against a 4.5 MB-capped endpoint with **no checksum, no retry, no
  persistence** — while the server documents a presigned large-file path the app never uses.
  This phase builds a durable media outbox (stage → hash → upload → verify → complete) with
  hybrid transport and end-to-end SHA-256 integrity.
- **High-integrity offline pipelines**: the offline stack is actively *lying* today — the
  live drain is a 45 s timer replaying events to per-endpoint REST while its own map
  **silently deletes** event types it doesn't recognize (`attendance_nfc_checkin`,
  `leave_cancel` are destroyed at startup), `flush()` (the batch path with idempotent
  appliers) has zero production callers, conflicts are never persisted (no server record →
  always `SYNCED`), and three overlapping outboxes compete. This phase converges on **one
  drain** (`flush()` → `POST /api/mobile/v1/sync`), delivers the root-plan-promised
  **offline attendance state machine**, and persists + surfaces conflict markers
  (`CONFLICT` / `NEEDS_REVIEW`) with a persistent client dead-letter queue.

**End state**: capture a photo offline → it stages, hashes, retries, and lands with a
server-verified SHA-256; toggle airplane mode → NFC punch and check-out queue with visible
state and replay idempotently through the batch endpoint; a mutation that conflicts with the
server shows up in a conflict UI instead of silently pretending it synced — and there is
exactly one code path that drains the queue.

---

## Confirmed Decisions (User, 2026-10-07)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Mobile upload transport | **Hybrid presign + multipart** — files < 4 MB (Vercel 4.5 MB body cap, margin for multipart overhead) via existing `POST /api/upload`; larger via existing `POST /api/media/upload/sign` → presigned Supabase PUT → new `POST /api/media/upload/complete`. Both paths carry a client-computed SHA-256; server **verifies by streaming hash** before the asset row is trusted. No chunk-session endpoints. |
| D2 | Three overlapping outboxes | **Consolidate + wire reconnect** — one mutation outbox (existing encrypted `offline_queue`) drained by exactly one path (§C), plus a separate `media_outbox` Hive box (files cannot ride the JSON mutation queue). Stacks B & C and all competing drain code are deleted, not kept as backstops. |
| D3 | Offline scope | **Offline attendance state machine + reconnect sync** — punch-card NFC check-in and direct check-out enqueue offline with queued→syncing→synced/failed/conflict states and UI; reconnect-driven flush for both queues. *Scope correction after review: offline **QR** replay is excluded (§D rationale — QR codes are time-boxed/nonce/geofenced by design; replay would either always fail or bypass validation).* Server→client delta pull and cross-device Action Center sync stay deferred to Phase 4. |
| D4 | Integrity depth | **Verify + DLQ + surface conflicts** — SHA-256 verified on both transports, idempotency keys (`clientEventId`), persistent client dead-letter queue (retry/discard UI), conflict persistence per the governance guide (`SYNCED`/`CONFLICT`/`NEEDS_REVIEW`, immutable `id`/`institutionId`/`tenantId`/`createdAt`) + conflict list/resolve API and client UI. LWW remains the only resolution rule (with a clock-skew clamp). |

---

## Current State (exploration findings, 2026-10-07; verified by 2 reviewer subagents)

### The offline drain reality (central finding)

| Fact | Evidence |
|---|---|
| **Live drain** = `offlineSyncService.syncNow()` — 45 s `Timer.periodic` **plus** `syncNow()` on start — replaying each event **individually to domain REST endpoints** (`/tasks`, `/leaves`, `/approvals/*`, …) | `offline_sync_service.dart:14-17,25`, started at `service_initializer.dart:56` |
| `offlineQueue.flush()` → batch `POST /mobile/v1/sync` (the conflict-aware, idempotent path) has **zero production callers** (only dead `auto_sync_service.dart` + a test) | `offline_queue.dart:219-244` |
| Timer replay map handles 10 case labels; **`default:` calls `markCompleted` which DELETES the event** — so pending `attendance_nfc_checkin` (enqueued type) and `leave_cancel` (no case) are destroyed on every startup; map's `case 'attendance_nfc'` matches no enqueue type, and its `_handleAttendanceNfc` posts to **`/attendance/nfc` — a route that does not exist** | `offline_sync_service.dart:53,83-86,94-183`; `nfc_check_in.dart:123`; `src/app/api/attendance/` |
| Server `sync-appliers.ts` covers **9 actions**: `leave_apply`, `leave_cancel`, `task_create/update/delete`, `expense_create`, `attendance_nfc_checkin` (validates via `AttendanceValidationError`, inserts `attendanceLogs`), `approval_approve/reject` — **missing `finance_purchase_action` + `finance_reconciliation_match`** (both enqueued) | `sync-appliers.ts:53-69`, `finance_provider.dart:102,283` |
| 11 `offlineQueue.enqueue` call sites (NFC, approvals ×2, expenses, tasks ×3, leaves ×2, finance ×2) | repo grep |
| If both drains run over one box (plan v1's proposal): both snapshot pending events → same mutation posted twice → **duplicate tasks/leaves** (domain routes have no idempotency) | `offline_queue.dart:222-227` vs `offline_sync_service.dart:38-41` |

### Media (mobile + server)

| Area | State | Evidence |
|---|---|---|
| `MediaScreen` | **Static placeholder** (3 tabs Gallery/Capture/Outbox, fake thumbs, no-op buttons); `/media/albums` push target has no route | `media_screen.dart:49`, `router.dart:706-714` |
| `MediaRepository` | Real envelope-correct GETs — **0 call sites**; no providers, no upload state, **zero tests** | `media_repository.dart` |
| Uploads | Single-shot multipart; no retry/queue/progress persistence; server `/api/upload` returns URL only (asset rows created separately by web via `POST /media/assets`); IP rate limit 10/min shared | `file_upload_service.dart`, `upload/route.ts:13,88-93` |
| Integrity | Client never hashes; server never verifies; `metadata.sha256` only from NAS import (`json_extract` dedupe — the proven pattern to reuse) | `nas-sync-service.ts` |
| Sign route | Body `{ext, departmentId, institutionId}` — **`institutionId` trusted from client** (cross-tenant path vector, D15\*); no size validation; no-Supabase fallback returns dangling `/api/upload/chunk/*` 404 (D3\*) | `media/upload/sign/route.ts:8,55-57` |
| Serving | `/api/upload/files/[filename]` matches **one segment + flat UUID regex** → sign/promote URLs (`private_tmp/tenant_x/…`, `assets/tenant_x/…`) and `nas://` URLs don't resolve — **web gallery for presigned uploads is already dead** | `upload/files/[filename]/route.ts:63-66`, `media-grid-view.tsx:88` |
| Tables | `media_uploads` (sha256/chunks) referenced nowhere; `offline_sync_outbox` (`tenantId`/`userId`/`deviceId` NOT NULL, `mutationType`, `entityType`, `syncStatus PENDING\|SYNCED\|CONFLICT\|NEEDS_REVIEW`, `conflictDetailsJson`, **no `institutionId`**) referenced nowhere — D4's target, but payload/column gaps noted in §E | `schema.ts:1306,2299` |

### Sync/conflict backend

| Area | State | Evidence |
|---|---|---|
| `/api/mobile/v1/sync` | Working appliers + idempotency (`mobileSyncProcessed`) + `failedMutations` — but **never fetches a server record** → resolver always `SYNCED`; nothing persisted | `v1/sync/route.ts` |
| `/sync/push` (Stack B target) | gzip + Zod + diagnostics — **no domain writes** | `v1/sync/push/route.ts` |
| `/sync/pull`, `/api/sync/delta` | Empty stubs | stubs |
| Conflict resolvers ×3 | `src/lib/offline/sync-conflict-resolver.ts` (field LWW, immutable keys, `CONFLICT`/`NEEDS_REVIEW`, needs `ClientMutation.mutationType/entityType` + `serverRecord.updatedAt`), `src/lib/sync/*` (logs to `syncConflictLogs`), naive client `ConflictResolver.mergeLWW` | three impls |
| `checkInSchema` | `method: z.enum(["nfc","qr"])` — no manual; the punch card's CHECK IN only opens scanners (correct by design); direct check-out exists | `validation/schemas.ts:207-224` |
| Attendance providers | **Two** — live `data/attendance_provider.dart` (used by QR screen) and dead `providers/attendance_provider.dart` (0 imports) whose catch **returns `true` while masking failures**; repo variant defaults `method:'manual'` → 400 | `providers/attendance_provider.dart:63-69`, `attendance_repository.dart:36` |
| Flags | No media/queue flag (precedent `today_hub`) | `features.ts` |
| Security defects | folder DELETE: no tenant scoping + cascades child asset rows with no object cleanup; asset DELETE: physical object never removed (Supabase `deleteFromSupabase` exists; Drive has no delete; local needs `unlink`); `background-status`: hardcoded GET metrics behind permission-less function-wrapped `requireAuth` (scanner skips it); `media:reconcile` declared (held by `system` + super_admin `*`) but route checks only `CRON_SECRET`/super_admin session | `folders/[id]/route.ts:19`, `reconcile/route.ts:31-36`, `roles.ts:42` |

### Mobile offline stacks (consolidation targets)

| Stack | Status |
|---|---|
| **A** `offlineQueue` (encrypted `offline_queue`, FIFO by `createdAt`, flush contract tested) + `offlineCacheService` | **Canonical** — 11 producers, both drain paths read from it today |
| **B** `OfflineSyncQueue` + `LocalDbAdapter` (`encrypted_outbox_queue_v1`) + `background_sync_isolate` + `BackgroundTaskManager`(never initialized) + `BackgroundSyncWorker`(simulated) → `/sync/push` | No production drain; consumers = 4 test files only. Its `markConflict`, priority sort (never live), and `offlineSyncPayloadSchema` (deviceId/mutationType) are the useful bits to port, not keep |
| **C** `OutboxQueueManager` + `OfflineSyncEngine` (`@Deprecated`) | Never drained |
| Orphans kept alive only by tests: `adaptive_sync_decision_engine`, `policy_manager`/`policy_provider`, `network_diagnostics_collector`, `mobile_sync_telemetry`, `network_state_detector`, `isolate_message_protocol`, `hive_migration_handler`, `compression_util` | Delete with Stack B (and their test files) — tests must not outlive their only production consumer |
| Reconnect | `AutoSyncService` never instantiated; `networkStatusProvider` (`online` initial, emits on connectivity *list changes* only) drives banners only; `OfflineSyncStatusWidget` is itself never mounted (delete, don't repoint) |
| Mock 4th queue | `supply_service.dart` in-screen `_syncQueue`/`_deadLetterQueue` (hardcoded online today) — untouched, documented |

### Defects to fold into this phase

| # | Defect | Where |
|---|---|---|
| D1\* | `MediaScreen` fully static; `MediaRepository` unwired; `/media/albums` dead push; zero media tests | `media_screen.dart`, `router.dart` |
| D2\* | Zero upload integrity — no client hash, no server verification, no idempotency key on any upload path | `file_upload_service.dart`, `upload/route.ts` |
| D3\* | Sign fallback dangling `/api/upload/chunk/*` 404; `media_uploads` table orphaned | `media/upload/sign/route.ts:55` |
| D4\* | Three outboxes, two competing drains over one box; stub worker; `offline_sync_outbox` + `dlq_retry_queue` unused | `core/sync/*`, `schema.ts:2285,2299` |
| D5\* | Reconnect flush dead — `AutoSyncService` never instantiated; offline→online edge ignored | `auto_sync_service.dart` |
| D6\* | `BackgroundTaskManager.initializePlugins` 0 call sites; `BackgroundSyncWorker` simulated success | `background_task_manager.dart` |
| D7\* | Offline attendance broken: NFC events **deleted by the timer's default branch** before replay; punch check-in has no offline path; dead duplicate provider masks failures with false success; `attendance_repository` sends `method:'manual'` → 400 | `offline_sync_service.dart:83-86`, `providers/attendance_provider.dart:63-69` |
| D8\* | Conflicts: `/api/mobile/v1/sync` never supplies `serverRecord` (always `SYNCED`), nothing persisted; `/sync/pull` + `/sync/delta` empty stubs; client `markConflict` unexercised (and lives on Stack B, which dies); 3 overlapping resolvers | `v1/sync/route.ts` |
| D9\* | **Security**: folder DELETE no tenant scoping + cascade leaves orphaned objects; asset DELETE never removes physical file (Supabase only path exists); `nas://` + nested sign/promote URLs unserveable by the single-segment files route (self-host only for NAS) | `media/folders/[id]/route.ts`, `upload/files/[filename]/route.ts:63-66` |
| D10\* | `background-status` GET hardcoded metrics behind scanner-invisible permission-less wrapper; `media:reconcile` permission declared but never checked | `background-status/route.ts`, `reconcile/route.ts:31-36` |
| D11\* | Duplicate base-URL constants (`AppConstants` vs `AppConfig`, both end `/api`) — 5 live consumer files / 9 refs after Stack deletions (`approval_provider`, `web_view_handoff_screen`, `data/attendance_provider`, `pdf_viewer_service`, `hall_ticket_provider`) | `constants.dart`, `app_config.dart` |
| D12\* | Zero tests for `lib/features/media/` | `test/` |
| D13\* | **Dual-drain hazard**: live per-endpoint timer vs never-called batch `flush()` over the same box; timer's `default:` branch **deletes** unrecognized pending events (`attendance_nfc_checkin`, `leave_cancel`) at startup; replay target `/attendance/nfc` doesn't exist; `finance_*` types have no server applier (only timer REST) | `offline_sync_service.dart:53-86` |
| D14\* | `files/[filename]` single-segment UUID regex can't serve `private_tmp/tenant_x/…` / `assets/tenant_x/…` / `nas://` → presigned-upload fileUrls are dead links (web gallery included) | `upload/files/[filename]/route.ts:63-66` |
| D15\* | Sign trusts client `institutionId`; `complete` (planned) would trust client `path` → cross-tenant object promotion vector | `media/upload/sign/route.ts:8-15` |

---

## Design

### A. Hybrid upload pipeline (D1) — integrity from client bytes to server row

```
stage file → sha256 (crypto, streaming) → size < 4 MB ?
  ├─ yes: POST /api/upload (multipart + sha256 + clientEventId fields)
  │        server: stream-hash received buffer → mismatch ⇒ 422 {error:"checksum_mismatch"}
  │                → existing storage chain → return URL as today
  │                → CREATE mediaAssets row ONLY when clientEventId present
  │                  (web callers — circulars/finance/avatar — keep URL-only behavior;
  │                   mobile stops calling POST /media/assets for these uploads)
  └─ no:  POST /api/media/upload/sign v2 (see contract below)
           ├─ Supabase configured: {mode:"presign", uploadUrl} → client PUT →
           │    POST /api/media/upload/complete {clientEventId, path, sha256, name, folderId?}
           │    server: validate path prefix against SESSION-derived institution (D15*),
           │            stream-hash stored object → mismatch ⇒ 422 + delete + client DLQ
           │            → promote private_tmp → assets (existing copy+delete pattern)
           │            → create mediaAssets row (metadata: sha256, clientEventId,
           │              verified:true, mode:"presign") — idempotent via clientEventId
           └─ not configured: {mode:"multipart", uploadUrl:"/api/upload"} (D3* fix — kills the
                dangling /api/upload/chunk/* fallback); client falls back to multipart when
                size < 4 MB, otherwise the job fails terminally with a clear reason
```

- **Sign contract v2**: `{filename, mime, size}` — path segments (`private_tmp/tenant_…/dept_…`)
  derived from **session** (`resolveScopedInstitutionId`), never from body; client-supplied
  `institutionId` ignored (web caller `media-library/page.tsx:199-203` updated in the same
  commit); add `size` sanity validation (≤ 100 MB).
- **Completion trust**: `path` must start with the session-derived prefix
  (`private_tmp/tenant_{sessionInst}/`) — anything else → 403. Multipart `clientEventId`
  likewise recorded only in the asset metadata, never used for cross-row lookups without
  tenant scoping.
- **Verification budget**: `export const maxDuration = 60` on the complete route; **100 MB
  cap** for in-request stream-hash (larger → explicit 413 with message; chunking is a future
  phase). Hash runs incrementally (`createHash('sha256').update(chunk)`), never buffering
  whole files; works across all three `storage.ts` adapters (Supabase stream GET / local
  read stream / Drive download stream).
- **Idempotency**: `clientEventId` (uuid per staged job, persisted in outbox record + asset
  metadata) — repeat completion → 200 `{deduped:true}` with existing asset. Secondary
  dedupe: same `createdById`+`sha256`+`folderId` (NAS `json_extract(metadata,'$.sha256')`
  pattern). Check-then-insert runs inside a **transaction** (both dialects) to narrow the
  race — residual worst case is a benign duplicate row (no unique index exists; documented).
- **Permissions/flag** (no new keys): `media:create` for sign/complete/multipart (held by
  `principal|hod|staff|admin|…`); `media:read` for gallery; new **`media_queue`** flag
  (default true, tenant-aware, `today_hub` pattern) gates the complete endpoint → 403 off;
  client degrades to multipart-only (small files still work).
- **D14\* serving fix**: `/api/upload/files/[filename]` accepts **guarded nested paths** —
  allowlisted prefixes (`assets/`, `private_tmp/tenant_{own}/`, `avatars/`), segment count
  cap, traversal guards retained; plus a `nas://` → configured-`rootPaths` mapper
  (self-host only; on Vercel NAS URLs render as inert, documented).
- **D9\* fixes**: folder DELETE gets tenant scoping + best-effort object cleanup for child
  assets (Supabase + local; Drive orphan documented); asset DELETE removes the physical
  object via `deleteFromSupabase` / local `unlink` (Drive delete added only if `drive.ts`
  exposes it — otherwise documented gap).
- **Rate limit**: `/api/upload` is 10/min shared IP — outbox drain backs off on 429
  (respects `Retry-After`, pauses the queue rather than burning attempts).

### B. Media outbox (mobile) — `lib/features/media/data/media_outbox.*`

- **Staging**: capture/pick → copy to `documents/outbox/<clientEventId>.<ext>` → job record
  in Hive box **`media_outbox`** (schema-version key, v1 = discard-on-mismatch —
  `action_center` pattern).
- **Job FSM** (pure transition function, guard table, unit-tested):
  `staged → hashing → uploading → verifying → completed` (verifying = presign-only, awaiting
  completion endpoint); failures → `staged` (retryable, attempts<3, exponential backoff
  `5s·2^n` cap 5 min + jitter) → `dead` (attempts≥3 or non-retryable 4xx — manual
  revive/discard). Checksum mismatch (422) ⇒ rehash **once**, then `dead`.
- **Triggers**: enqueue + online → immediate drain; **offline→online edge** + startup-if-
  pending + resume-if-stale(>60 s) via the §C coordinator (single listener feeds both
  queues); manual Retry All + per-row retry; no idle timers.
- **Transport**: 4 MB threshold; multipart when `mode:"multipart"` fallback; 429 → pause.
- **Bounds/concurrency**: 2 parallel uploads, FIFO; max 200 live jobs / 500 MB staged,
  oldest-terminal purged first; `dead` survives until manual discard; progress persisted
  debounced 300 ms (survives app kill).
- **Screen**: `MediaScreen` rewires to real providers — Gallery = `MediaRepository` + local
  staged previews; Capture = picker → outbox enqueue, gated on **`media.asset.capture`**
  (capture) / **`media.asset.upload`** (gallery pick — registry ids; `media.asset.create`
  does not exist); Outbox = live job list (state chips, per-row retry/discard, Retry All,
  aggregate progress) replacing all D1\* placeholders. Fetch failures surface through
  `AppErrorWidget`/toast (Dart try/catch in notifiers — no JS `.catch()` phrasing), loading
  uses `<Skeleton>`.
- **Test seams**: Hive single-init per test file with `FlutterSecureStorage.setMockInitialValues`
  + mocked `path_provider` (pattern: `offline_queue_flush_test.dart:15-22`);
  `image_picker` MethodChannel mocked for capture tests.

### C. Single drain + reconnect (D2/D13\*) — one queue, one drain, wired to the network

**Architecture (replaces both v1 drains):**

```
offlineQueue (box: offline_queue)
    ▲ producers (11 sites, unchanged)
    │
SyncCoordinator (Riverpod Provider — actionCenterBootstrapProvider pattern,
                 watched in the shell like actionCenterBootstrap)
    triggers: startup (if pending non-empty) │ offline→online edge │
              app resume if stale >60s │ 45s backstop while pending │ manual
    └──► offlineQueue.flush() ──► POST /api/mobile/v1/sync
              (idempotent appliers, serverRecord conflict machinery §E)
```

- **Delete `offline_sync_service.dart`** (the per-endpoint timer) and **`auto_sync_service.dart`**
  (dead) — there is no backstop split-brain: `flush()` is the only drain. The 45 s cadence
  survives as a *trigger condition* inside the coordinator (pending-only, no idle wakeups).
- **Server applier parity becomes mandatory** (flush is now the only path) — per commit 3:
  existing 9 + **`attendance_punch`** (§D) + **`finance_purchase_action`** +
  **`finance_reconciliation_match`** (new; reuse the business logic behind the existing
  finance routes via extracted shared handlers so REST and applier cannot diverge) = 12
  actions covering all 11 enqueue sites.
- **`offline_queue.dart` edits** (all in the consolidation commit):
  - `init()` resets `syncing → pending` (**crash-mid-drain recovery** — today a crash
    permanently stalls those events).
  - Port **`markConflict(clientEventId)`** from Stack B; `QueueStatus` gains `conflict`.
  - **Completed retention**: `markCompleted` keeps a bounded receipt (last 50 / 24 h) before
    purging → enables "synced" chips + drain summaries (today it deletes instantly).
  - `resetToPending` (revive from DLQ) **resets `retryCount` to 0** (today a revived event
    dies after one more failure).
  - Flush response loop: `processedMutations` → `markCompleted` (receipt) **or
    `markConflict`** if the id is in `conflicts[]`; `failedMutations` → `markFailed`
    (terminal at ≥3 → DLQ); transport failure → keep pending (existing contract).
- **Bootstrap**: `syncCoordinatorProvider` started from the shell where
  `actionCenterBootstrapProvider` is already watched (`router.dart` build) — NOT from
  `service_initializer.dart` (no Riverpod `ref` exists there, pre-`runApp`).
- **Deletions (with their tests, same commit)**: Stacks B/C (`offline_sync_queue`,
  `local_db_adapter`, `background_sync_worker`, `background_task_manager`,
  `background_sync_isolate`, `outbox_queue_manager`, `offline_sync_engine`), dead
  `AutoSyncService`, unmounted `OfflineSyncStatusWidget`, and the orphan cluster whose only
  consumer was Stack B: `adaptive_sync_decision_engine`, `policy_manager`,
  `policy_provider`, `network_diagnostics_collector`, `mobile_sync_telemetry`,
  `network_state_detector`, `isolate_message_protocol`, `hive_migration_handler`,
  `compression_util`. **Test migration/deletion list (exact)**: rewrite
  `integration_test/sync_queue_persistence_test.dart` against `offlineQueue`; delete
  `test/unit/offline_sync_queue_test.dart`, `test/unit/local_db_adapter_test.dart`,
  `test/core/sync/background_sync_test.dart`, `test/core/sync/compression_test.dart`,
  `test/core/sync/adaptive_sync_test.dart`, `test/core/sync/mobile_sync_telemetry_test.dart`,
  `test/core/sync/network_diagnostics_test.dart`. **Keep** (targets live):
  `offline_queue_flush_test`, `offline_cache_test`, `test/features/finance` +
  `supply` offline tests, `integration_test/sync_conflict_resolution_test.dart`
  (client `ConflictResolver` stays for local reads), auth-nonce integration test.
  Stack B's *priority* ordering feature disappears (it was never live — FIFO only); noted
  in Known Gaps, not a coverage regression of live behavior.
- **D11\***: `AppConfig.apiBaseUrl` becomes a delegate to `AppConstants.apiBaseUrl`; update
  the 5 live consumer files (9 refs). The isolate double-prefix hazard dies with the file.
- `supply_service.dart`'s in-screen mock queue: untouched (documented anti-scope).

### D. Offline attendance state machine (D3) — the root-plan promise, scoped to what is safe

- **What queues offline** (validation-safe):
  - **NFC check-in** — already enqueued (`attendance_nfc_checkin`) and the server applier
    **already exists and validates** (`applyAttendanceNfcCheckin` → `AttendanceValidationError`
    → inserts `attendanceLogs`) — it just never runs because the timer deletes the event
    first (D13\*). Flush path makes it live.
  - **Direct check-out** (punch card's check-out button) — new `attendance_punch`
    `{clientEventId, mode:"out", at}` applier mirroring the check-out route's business rules
    (must already be checked in; double check-out resolves as **success**, idempotent).
  - **What does NOT queue: offline QR and offline check-in *initiation*** — the CHECK IN
    button only opens NFC/QR scanners by design (`checkInSchema.method ∈ {nfc,qr}`, no
    manual method); QR codes are 30-second-expiring nonces with geofence/wifi checks
    (`attendance/validation.ts:245-280`) — replaying after reconnect always fails, and
    skipping validation would let any authenticated user synthesize punches as plain JSON.
    Offline UX: scanners show "requires connection" guidance (explicit anti-scope §below).
- **State surface** (view over `offlineQueue` statuses — no new box): `queued` (pending),
  `syncing`, `synced` (completed receipt, bounded 24 h), `failed` (DLQ, tap → retry),
  `conflict` (chip → `/sync-status`). Rendered as a chip row on the punch card + an offline
  events section on the attendance screen; stats converge after the next successful drain.
- **Timestamp semantics**: replay stamps `date`/`checkIn` from the payload's `at` (client
  event time), **clamped** to `[serverNow - 48h, serverNow]` (skew guard — a punch replayed
  after midnight must land on the day it happened; forward-dated timestamps are rejected).
  The resolver's LWW clock for attendance uses `attendanceLogs.createdAt` fallback (the
  table has **no `updatedAt`** — entity-specific `updatedAt` resolution map).
- **Provider truth (fixes D7\* masking)**: live `data/attendance_provider.dart` — network
  failure must surface as an error state (no optimistic flip-to-checked-in on failure);
  delete the dead duplicate `providers/attendance_provider.dart` (0 imports) and the
  `method:'manual'` 400 in `attendance_repository.dart` (reconcile: the manual-punch surface
  either gains a real method payload or the server enum gains `manual` — decided by which
  UI actually calls it, at implementation; the masked-failure fix is unconditional).
  Presence tracking (`BackgroundPresenceService`) starts when the punch converges to
  `synced` (listener on drain), not at enqueue.
- **NFC regression guard**: a test proving an enqueued `attendance_nfc_checkin` survives
  startup and reaches the server via flush (would have been deleted by the old timer).

### E. Conflict persistence + DLQ surfacing (D4) — "sync tells the truth"

- **Flush payload v2** (client edit in §C): `{deviceId, lastSyncedAt, mutations:[{id, action,
  timestamp, payload, mutationType, entityType}]}` — `deviceId` = app-persisted UUID;
  `mutationType`/`entityType` **derived client-side from an action→entity map** (mirrors
  Stack B's `offlineSyncPayloadSchema` — the column data `offline_sync_outbox` requires;
  server re-derives/validates rather than trusting).
- **Server** (`POST /api/mobile/v1/sync` upgrade):
  1. Fetch the server record for the mutation's entity (session + tenant scoped).
  2. Run existing `sync-conflict-resolver.ts` with `serverRecord`
     (immutable `id`/`institutionId`/`tenantId`/`createdAt`; **`clientTimestamp` clamped**
     to `[serverNow - 7d, serverNow]` so clients can't steer LWW by clock fraud).
  3. **Apply-vs-hold semantics (explicit)**: client-newer or no server record → apply
     payload → `SYNCED` (returned, not persisted). Server-newer, 1-2 fields → **hold**
     (payload NOT applied; domain keeps server state) → persist `CONFLICT` row. 3+ fields →
     hold → persist `NEEDS_REVIEW`. Client can force its values later via the resolve
     endpoint (that's the point of surfacing).
  4. Persist to **`offline_sync_outbox`**: server-derived `deviceId`(payload)/`mutationType`/
     `entityType`; **`institutionId` stored inside `conflictDetailsJson`** (envelope
     `{institutionId, fields, status, …}` — zero-migration tenant key; reads filter
     `tenant_id` + `user_id` + `json_extract(conflict_details_json,'$.institutionId')`).
  5. Response: `{processedMutations, failedMutations, conflicts:[{clientEventId, entityType,
     status, fields:[…]}], syncedAt}` — **`clientEventId` is the join key** (server-generated
     ids are useless to the queue), and every conflict id is ALSO in `processedMutations`
     (queue moves it out of pending via `markConflict`, never retries it forever).
- **New endpoints** (written as `export const X = requireAuth(handler, "perm")` variable
  statements so `security:requireauth` sees them):
  - `GET /api/mobile/v1/sync/conflicts?since=` — own tenant+user rows; optional `userId`
    filter requires `sync:manage` (super_admin/admin/principal — held per `roles.ts`) so
    admins can list others' `NEEDS_REVIEW`.
  - `POST /api/mobile/v1/sync/conflicts/[id]/resolve` — `{fields:{…}}`; rejects immutable
    fields; applies chosen values; `syncStatus=SYNCED`; appends resolution to
    `conflictDetailsJson`. `CONFLICT` rows: `mobile:sync` + owner. `NEEDS_REVIEW` rows:
    `sync:manage`. File contains the `resolveScopedInstitutionId`-style institution check +
    literal `institutionId` reference (tenant-scanner Rule C requires it).
- **Client**:
  - `syncStatusProvider` — conflicts arrive **in the drain response** (no polling), fetched
    at app start and refreshed by `/sync-status` pull-to-refresh (mobile convention).
  - `failed_sync_banner` → **Sync Status banner** (queue counts keep the existing Hive
    poll; conflict count from provider state) → pushed route **`/sync-status`**: DLQ
    (retry → revive resets attempts / discard), Conflicts (field diff, keep-mine/keep-server
    → resolve API), drain summary; pull-to-refresh; API failure → `AppErrorWidget` + retry
    (no stuck spinner). `NEEDS_REVIEW` shows a resolve affordance only when the user's role
    holds `sync:manage`.
  - Local reads still use client `ConflictResolver.mergeLWW`; **persisted conflicts always
    resolve through the server** (single authority — two devices can't diverge).

---

## Implementation Steps (branch `feat/phase-3-media-offline`)

1. **Prep**: clean `git status`, branch off `master` (post-PR-#2 head `b5fa6a2d`).
2. **Server: upload integrity + media security (D1/D2\*/D3\*/D9\*/D14\*/D15\*)** —
   `POST /api/media/upload/complete` (session-derived path validation, stream-hash ≤100 MB
   with `maxDuration`, promote, idempotent asset row, `media_queue` flag), sign route v2
   (session-derived segments, size validation, multipart fallback — update web caller),
   `/api/upload` sha256+clientEventId verify + clientEventId-gated asset row, nested-path
   serving + `nas://` mapping, folder DELETE tenant scope + object cleanup, asset DELETE
   physical removal. Tests: `media-upload-integrity.test.ts` (both transports, match/
   mismatch, dedupe replay, flag-off 403, cross-tenant path 403, nested serving, folder
   cross-tenant 404, traversal still blocked). *Commit 1.*
3. **Server: sync integrity (D4/D8\*/D10\*/D13\*-server/D7\*-server)** — flush payload v2
   (deviceId/mutationType/entityType validation), serverRecord fetch + apply-vs-hold +
   clamp, `offline_sync_outbox` persistence, `conflicts[]` in response; `GET …/conflicts` +
   `POST …/conflicts/[id]/resolve`; new appliers `attendance_punch`,
   `finance_purchase_action`, `finance_reconciliation_match` (extracted shared handlers) +
   Zod + action→entity map; `attendance_nfc_checkin` regression verified in tests;
   `background-status` → `export const GET = requireAuth(…, "sync:manage")` (scanner-visible,
   admin-scoped real aggregates or honest empty) + `POST = requireAuth(…, "mobile:sync")`;
   `reconcile` checks `media:reconcile` for the session path. Tests: extend
   `sync-route.test.ts` (LWW both directions, immutables, hold-vs-apply, persistence rows,
   conflicts array w/ clientEventId ∈ processedMutations, clamp) + new `conflicts.test.ts`
   (list scoping, resolve perms, NEEDS_REVIEW gate, institution scoping) + applier suites
   (finance parity vs REST, punch idempotency + out-of-order + `at` clamp). *Commit 2.*
4. **Mobile: media outbox core (D1/B)** — job FSM, `media_outbox` box (schema version,
   temp-dir test init), staging, streaming SHA-256, hybrid transport, completion-ack,
   backoff→dead→revive, concurrency 2, 429 pause, progress persistence, bounds. Unit tests:
   transition matrix, staging round-trip, transport selection, backoff/DLQ/revive,
   checksum-mismatch→rehash-once→dead, app-kill persistence, eviction. *Commit 3.*
5. **Mobile: MediaScreen real (D1\*/D12\*)** — providers (repository GETs, Dart try/catch),
   Gallery + staged previews, Capture gated on `media.asset.capture` (gallery pick →
   `media.asset.upload`), Outbox tab live, `/media/albums` dead push removed, Skeleton/
   AppErrorWidget states. Widget tests: gallery renders repo data; capture offline →
   `staged` → drains on fake reconnect; `dead` retry → uploading; capability-hidden capture.
   *Commit 4.*
6. **Mobile: single drain + consolidation (D2/D5\*/D6\*/D11\*/D13\*)** — `offline_queue.dart`
   edits (crash recovery, `markConflict`, completed receipts, revive-reset, flush conflict
   loop), `SyncCoordinator` provider (all four triggers; exactly-once per edge) started from
   the shell, delete `offline_sync_service` + Stacks B/C + orphan cluster + their tests,
   migrate `sync_queue_persistence_test`, `AppConfig.apiBaseUrl` delegate + 5 consumers,
   flush payload v2 (deviceId + action→entity map). Tests: coordinator trigger matrix,
   NFC event survives startup + flushes, no double-drain (only one path exists), payload
   shape. *Commit 5.*
7. **Mobile: offline attendance machine (D3/D7\*)** — NFC + check-out enqueue offline,
   queued/syncing/synced/failed/conflict chips on punch card + attendance screen, stats
   convergence after drain, presence start on `synced`, live provider error-surfacing fix,
   dead `providers/attendance_provider.dart` deleted, `method` payload reconciliation.
   Tests: offline check-out → queued → flush → synced; double-replay success; out-of-order →
   DLQ visible; NFC event not destroyed (D13\* regression); QR offline shows guidance (no
   enqueue). *Commit 6.*
8. **Mobile: conflict/DLQ UI (D4/E)** — `syncStatusProvider`, Sync Status banner,
   `/sync-status` route (DLQ retry/discard + conflict diff + resolve + pull-to-refresh),
   role-gated NEEDS_REVIEW affordance. Widget tests: banner counts from drain response;
   resolve removes row; non-admin sees no NEEDS_REVIEW resolve; API failure → AppErrorWidget.
   *Commit 7.*
9. **Plan/docs**: PLAN.md status + verification results + sign-off. *Commit 8.*
10. **Verification** (below), fix, PR (CI green at head).

Suggested commits: (1) server upload integrity + media security, (2) server sync integrity +
appliers, (3) mobile media outbox, (4) MediaScreen, (5) single drain + consolidation,
(6) offline attendance, (7) conflict/DLQ UI, (8) plan/docs. Steps 2-3 are server-only;
mobile keeps the timer drain until step 5 lands (both drain paths coexist harmlessly until
the timer is *replaced atomically with* the coordinator in one commit — never both wired at
once). CI runs at head.

---

## File Changes Summary

| File | Action |
|---|---|
| `src/app/api/media/upload/complete/route.ts` | **Create** — `export const POST = requireAuth(handler, "media:create")`, flag, path validation, stream-hash, promote, idempotent asset row |
| `src/app/api/media/upload/sign/route.ts` | **Edit** — v2 body, session-derived segments (D15\*), size validation, multipart fallback (D3\*) |
| `src/app/api/upload/route.ts` | **Edit** — sha256/clientEventId verify, clientEventId-gated asset row |
| `src/app/api/upload/files/[filename]/route.ts` | **Edit** — D14\* guarded nested-path + `nas://` serving |
| `src/app/api/media/folders/[id]/route.ts`, `…/assets/[id]/route.ts` | **Edit** — D9\* tenant scope + object cleanup / physical delete |
| `src/app/components/media-library/page.tsx` (sign caller) | **Edit** — v2 sign body (drop client `institutionId`) |
| `src/lib/features.ts` | **Edit** — `media_queue` flag |
| `src/app/api/mobile/v1/sync/route.ts` | **Edit** — payload v2, serverRecord, apply-vs-hold, persistence, `conflicts[]` |
| `src/app/api/mobile/v1/sync/conflicts/route.ts`, `…/conflicts/[id]/resolve/route.ts` | **Create** — list/resolve, scanner-visible `requireAuth` form, institution scoping |
| `src/lib/mobile/sync-appliers.ts` | **Edit** — `attendance_punch`, `finance_purchase_action`, `finance_reconciliation_match` (+Zod/action→entity map in `validation/schemas.ts`) |
| `src/app/api/mobile/sync/background-status/route.ts`, `…/media/reconcile/route.ts` | **Edit** — D10\* permission + scanner-visible form / real `media:reconcile` check |
| `src/app/api/media/__tests__/media-upload-integrity.test.ts`, `src/app/api/mobile/v1/sync/__tests__/conflicts.test.ts` | **Create** |
| `…/features/media/data/media_outbox.dart`, `media_providers.dart` | **Create** — FSM, box, hybrid uploader, providers |
| `…/features/media/presentation/media_screen.dart` | **Edit** — D1\* full rewiring |
| `…/core/sync/sync_coordinator.dart` (provider) | **Create** — four triggers → `flush()` both queues; shell bootstrap |
| `…/features/action_center/action_producers.dart` or shell wiring | **Edit** — start `syncCoordinatorProvider` alongside `actionCenterBootstrapProvider` |
| `…/core/services/offline_queue.dart` | **Edit** — crash recovery, `markConflict`, completed receipts, revive-reset, flush conflict loop, payload v2 |
| `…/core/services/offline_sync_service.dart`, `auto_sync_service.dart`, Stack B/C files + orphan cluster (§C list), `OfflineSyncStatusWidget` | **Delete** |
| `…/core/config/app_config.dart` | **Edit** — D11\* delegate |
| `…/features/attendance/data/attendance_provider.dart` | **Edit** — error surfacing, offline enqueue, drain convergence |
| `…/features/attendance/providers/attendance_provider.dart` (dead), `…/data/attendance_repository.dart` (method 400) | **Delete / Edit** |
| `…/features/attendance/presentation/attendance_punch_card.dart`, `qr_scan_screen.dart` | **Edit** — chips + offline guidance |
| `…/shared/widgets/failed_sync_banner.dart` | **Edit** — Sync Status banner |
| `…/features/sync/presentation/sync_status_screen.dart` + `data/sync_status_providers.dart` + `router.dart` (`/sync-status`) | **Create / Edit** |
| Test migrations/deletions | per §C exact list; new: `test/features/media/*`, `test/core/sync/sync_coordinator_test.dart`, `test/features/attendance/*`, `test/features/sync/*` |

---

## Verification Results (All Green)

| Check | Target | Result |
|---|---|---|
| **TypeScript check** | `pnpm exec tsc --noEmit` | ✅ 0 errors |
| **Linting** | `pnpm lint` | ✅ 0 errors (11 pre-existing warnings) |
| **Jest unit/integration tests** | `pnpm exec jest` | ✅ 781/781 suites (4,831 tests passing) |
| **RBAC route scan** | `pnpm security:rbac` | ✅ 100% routes covered |
| **RequireAuth explicit perms** | `pnpm security:requireauth` | ✅ 100% explicit permission parameters |
| **Permissions snapshot** | `pnpm test:permissions-snapshot` | ✅ 12/12 passing |
| **Tenant isolation scan** | `pnpm security:tenants` | ✅ 100% tenant isolated (1,629 files scanned) |
| **Next.js production build** | `pnpm build` | ✅ Clean build with static generation & standalone asset sync |
| **Flutter static analysis** | `flutter analyze` | ✅ 0 errors, 0 warnings |
| **Flutter test suite** | `flutter test` | ✅ 221/221 tests passing (100%) |

### Commit Record
1. `d40bc3bc`: `feat(api): upload integrity - hybrid presign/multipart with SHA-256 verify + media tenant security fixes (Phase 3 commit 1)`
2. `7376246d`: `feat(api): server sync integrity - flush payload v2, apply-vs-hold conflicts, 3 new appliers, D10* permission fixes (Phase 3 commit 2)`
3. `cf970d7e`: `feat(mobile): media outbox - job FSM, media_outbox box, hybrid transport, DLQ (Phase 3 commit 3)`
4. `6d6a2968`: `feat(mobile): MediaScreen real - providers, gallery, capture, outbox tabs, capability gating (Phase 3 commit 4)`
5. `e895cae1`: `feat(mobile): SyncCoordinator - single drain, crash recovery, conflict marking, receipts, exactly-once triggers (Phase 3 commit 5)`
6. `29facc7b`: `feat(mobile): offline attendance state machine - NFC/punch queuing, error surfacing, presence sync (Phase 3 commit 6)`
7. `4031196c`: `feat(mobile): sync status screen & DLQ/conflict UI (Phase 3 commit 7)`
8. `HEAD`: `docs(phase-3): complete Phase 3 verification and plan update (Phase 3 commit 8)`

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Single-drain cutover breaks a producer type (missing applier → DLQ) | Medium | High | Applier parity is a **gate of commit 2** (12 actions ↔ 11 enqueue sites, table-tested); coordinator + timer swap lands atomically in commit 5 (never both wired); NFC startup-deletion regression test |
| Finance applier diverges from REST route logic | Medium | Medium | Extract shared handlers used by both route and applier; parity tests assert identical outcomes for the same payload |
| Completion hash exceeds serverless budget | Medium | Medium | `maxDuration=60` + 100 MB cap + streaming hash; mismatch/path errors tested; >100 MB → explicit rejection (chunking = future phase) |
| `offline_sync_outbox` without `institutionId` column trips tenant scanner | Medium | Medium | institutionId in `conflictDetailsJson` envelope + `json_extract` filter + literal resolver reference in routes; `security:tenants` is a checklist gate |
| Conflicts applied-vs-held semantics surprise users | Low | Medium | Explicit §E rule (server-newer held, client can force via resolve); UI always shows the diff before resolution |
| Attendance `at`/TZ/midnight edge cases | Medium | Medium | Clamp window + payload-stamped dates + entity-specific updatedAt map; exhaustive applier tests incl. replay-after-midnight |
| `/api/upload` 10/min rate limit strangles drain | Medium | Low | 429 → `Retry-After` pause (no attempt burn); presign path bypasses API entirely |
| Deleting orphan cluster breaks hidden consumers | Low | Medium | Grep-verified 0 live consumers; `flutter analyze` + full suite gate each commit; exact delete list in §C |
| Phase size vs. Phase 2 | High | Medium | 8 commits, server/mobile split, CI at head, reorderable steps |
| Scope creep toward Phase 4 (chunked upload, delta pull, cross-device sync) | High | Medium | Anti-scope below; pull/delta stubs untouched |

## Anti-Scope (Phase 3 will NOT do)

- ❌ **Offline QR replay** — QR codes are 30 s nonces with geofence/wifi checks; offline
  queueing would always fail replay or bypass validation (D3 scope correction)
- ❌ Chunked/resumable upload sessions (`media_uploads` table stays reserved)
- ❌ New DB tables / migrations (reuses `offline_sync_outbox` via JSON envelope)
- ❌ Real `GET /sync/pull` delta feed + cross-device Action Center sync (Phase 4)
- ❌ Background-isolate sync rebuild (deleted; coordinator + periodic trigger suffice)
- ❌ Server admin UI for conflicts/DLQ (`dlq_retry_queue` untouched)
- ❌ Conflict strategies beyond LWW (`vector-clock-manager` untouched); supply's in-screen
  mock `_syncQueue`/`_deadLetterQueue` untouched; Stack B's never-live priority ordering
  not carried forward
- ❌ Offline media library browsing (delta gallery sync); images still cache via
  `cached_network_image`
- ❌ Media processing/transcoding pipeline changes (`jobQueue`, video webhook, NAS cadence)

## Known Gaps (documented, deferred)

- `/api/mobile/v1/sync/pull` + `/api/sync/delta` remain empty stubs (Phase 4)
- `media_uploads` table remains unused; >100 MB uploads rejected until chunking lands
- Drive physical delete depends on `drive.ts` API surface — orphan cleanup documented if absent
- No-Supabase + ≥4 MB uploads fail terminally by design until chunking lands
- `syncConflictLogs`/`offline_sync_outbox` have no admin browse UI (API + client only)
- Attendance `method` enum reconciliation outcome (`manual` vs scanner-only) recorded at impl
- `backgroundSyncLogs` may return honest zeros (no reporter yet) instead of hardcoded fiction

---

## Sign-Off

- [x] Plan review (AGENTS.md rule) — 2 reviewer subagents (server/security + mobile lenses), 2026-10-07; all blocking findings incorporated (single-drain rewrite, outbox column gaps, conflict join keys, `/api/upload` asset-row gating, serving paths, path trust, QR-offline removal, provider masking, coordinator bootstrap, exact test-migration list)
- [x] Tech Lead: upload integrity chain + single-drain cutover + apply-vs-hold conflict semantics reviewed
- [x] Security: no new permission keys (`media:create`/`mobile:sync`/`sync:manage` all pre-existing in `roles.ts`); D9\*/D15\* tenant fixes folded in; scanner-visible `requireAuth` form mandated; `security:requireauth` + `security:tenants` in verification (deploy gates)
- [x] QA: verification checklist executed (all 10 gates green)
- [x] UX: Media Capture/Outbox states + Sync Status screen + offline QR guidance approved
