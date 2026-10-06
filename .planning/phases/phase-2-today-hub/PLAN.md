# Phase 2: SDUI Today Hub & Action Center State Machine — "Today is Server-Driven, Actions Have Real States"

**Milestone**: ThaibaHive Two-Tier Platform
**Phase**: 2 of 5 (post-Freeze roadmap: 1 Capabilities & Nav → **2 Today & Action Center** → 3 Media Queue & Offline → 4 Deep Links & Handoff → 5 Global Search)
**Status**: Draft v2 (decisions D1-D4 locked; cross-review completed — blocking findings incorporated)
**Estimated Duration**: 4-5 days
**Dependencies**: Phase 1.0-1.4 (capability registry, ActionCenterTray shell, mobile nav skeleton) + Phase 1.5 (workspace routes as deep-link targets) — all merged to master via PR #1

---

## Objective

Phase 1 scaffolded the *visual shells* of the Today screen (5 priority sections), the
ActionCenterTray/FAB/badge providers, and capability-driven bottom tabs — **but none of it is
wired to data**: the Action Center has zero producers and no state machine, three of five Today
sections render hardcoded placeholders, the SDUI manifest endpoint referenced in code comments
(`/api/mobile/today-hub`) was never created, and several Today taps navigate to routes that do
not exist. This phase turns the shells into the spec'd product:

- **SDUI Today Hub**: sections rendered from a server manifest (`GET /api/mobile/today-hub`)
  with permission/role gating, max-items enforcement, feature flag, and a safe client fallback.
- **Action Center state machine**: real status lifecycle (pending → acknowledged → completed /
  dismissed / snoozed / expired) with transition guards, dedupe, TTL, and **Hive persistence**;
  server acknowledgement via the existing notification-read API (client-first — no new tables).
- **Producers**: pull (approvals/notifications/help-desk/tasks on Today open + refresh), push
  (wire the existing orphaned SSE client — after fixing its broken URL), and FCM foreground
  enqueue.
- **Real section data** for all five priorities, spec-compliant tab IA (Notices tab), and the
  catalogued cross-cutting defects (§Defects).

**End state**: opening `/today` on a fresh install fetches the manifest, renders only the
enabled/gated sections in server order, shows live urgent actions with badge counts that survive
app restarts, and every tap lands on a route that exists.

---

## Confirmed Decisions (User, 2026-10-06)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Action Center persistence/sync depth | **Client-first + server ack** — full status state machine persisted in Hive (idempotent dedupe, TTL); ack/dismiss hit existing endpoints where a matching API exists (notifications → `PATCH /api/notifications`, see §A), otherwise local-persisted. **No new DB tables/migrations.** Cross-device action sync deferred (Phase 3/4). |
| D2 | Bottom tab IA (spec says Today/Notices/My Hub/[Media]) | **Add Notices, keep Services as a Today quick action + kept route** — tabs become Today, Notices, My Hub, Media (capability-gated). `/services` remains a pushed route (NOT added to My Hub — spec §7 forbids dumping Services into My Hub). |
| D3 | SDUI manifest endpoint | **Yes** — create `GET /api/mobile/today-hub` (already named in `today_screen.dart:217` and the Phase 1 plan) returning ordered gated `sections[]`; client renders from it with **hardcoded fallback** on fetch failure + ShimmerLoading/RefreshIndicator per mobile conventions. |
| D4 | Action Center producers | **Pull + SSE + FCM** — on-open parallel fetch; wire the existing but orphaned `sseServiceProvider` (after fixing its double-prefix URL defect D8*), and **normalize the second SSE frame shape** server-side (§C.2); enqueue from FCM foreground events instead of toast-only. |

---

## Current State (exploration findings, 2026-10-06; verified by 2 reviewer subagents)

All of `today/` and `action_center/` landed in commit `8f9dd42a` (Phase 1) and is unwired:

| Area | State | Evidence |
|---|---|---|
| P1 Urgent Actions | Renders only if `actionCenterProvider` has urgent items — **always empty** (`queueAction` has **0 call sites** repo-wide) | `today_screen.dart:94-98`, `controller.dart:31,36` |
| P2 Attendance card | **Real** — `attendanceProvider` → `/attendance/stats` + `/attendance/my`; punch works | `attendance_punch_card.dart`, `attendance_provider.dart:72-89` |
| P3 Quick actions | **Hardcoded 4**; `capability` field declared but never read; no `.take(4)` enforcement; no resolver | `today_screen.dart:216-285` |
| P4 Timeline | **Static placeholder** ("No classes scheduled today") | `today_screen.dart:287-348` |
| P5 Latest circular | **Static placeholder** ("2 hours ago" / "Mid-term…") | `today_screen.dart:350-430` |
| State machine | **None** — only `enum ActionPriority`; `ActionItem` has no status field | `controller.dart:24` |
| SDUI endpoint | **Does not exist** (only a code comment + Phase 1 plan stub that was never created) | `today_screen.dart:217`, `src/app/api/**` |
| SSE | Server emits **two different frame shapes** (§C.2); mobile client URL is broken (`/api/api/…` 404 → reconnect loop); `sseServiceProvider` has 0 consumers | `src/lib/api/notifications.ts:90-96`, `src/lib/notifications/push-service.ts:100`, `sse_service.dart:60,136` |
| Quick actions server helper | `getQuickActions(roles)` exists — **11 `quickAction:true` capabilities: 9× tier-1 + 2× tier-2, zero tier-3** — called only by tests | `packages/auth/capabilities.ts:511-517` |
| Hive | Already initialized at startup (`main.dart:23` → `offline_queue.dart:88 Hive.initFlutter()`) — **no app-level init needed**; tests must `Hive.init(tempDir)` like `offline_sync_queue_test.dart:15` | `offline_queue.dart:88` |
| Tests | **Zero** mobile tests for `today/`, `action_center/`, `punch card`; no web tests for a today-hub endpoint; repo has **32** mobile test files | `thaibahive_mobile_app/test/` |
| Phase 1 deps | ✅ CAPABILITY_REGISTRY, ✅ tray+badges, ✅ workspace routes | phase-1 PLAN "Next Phase Dependencies" |

### Defects to fold into this phase (from exploration + review)

| # | Defect | Where |
|---|---|---|
| D1* | Action Center has no producers — tray/FAB/badges permanently empty | `controller.dart:31,36` |
| D2* | No status enum / transitions / persistence | `controller.dart:24` |
| D3* | SDUI manifest endpoint missing despite code reference | `today_screen.dart:217` |
| D4* | Today taps to non-existent routes `/notifications`, `/search`, `/timetable` (no `errorBuilder` → GoRouter failure) | `today_screen.dart:82,87,303` |
| D5* | Tray rendered twice on Today (shell overlay on **all** branches + Today-local tray/FAB); Services has its own third tray instance | `router.dart:799-805`, `today_screen.dart:43,134-142`, `services_screen.dart:31,304` |
| D6* | Tab set Today/Services/My Hub/Media — no Notices tab (D2 resolves) | `router.dart:652-698` |
| D7* | `_hasCapability` hardcodes a 5-role list and returns `false` for every capability except `media.asset.create` (which is itself absent from `CAPABILITY_REGISTRY`) | `router.dart:878-885` |
| D8* | Double `/api` prefix (`…/api/api/…`) in **3** calls — `sse_service.dart:60` (load-bearing for D4 SSE!), `workspace_provider.dart:47`, `background_presence_service.dart:298` (`AppConstants.apiBaseUrl` already ends in `/api`) | `sse_service.dart:60`, `workspace_provider.dart:47`, `background_presence_service.dart:298` |
| D9* | Orphaned legacy `BottomNavBar` (0 refs) + `DashboardScreen` + `quick_actions_grid.dart` contradict 3-4 tab rule | `bottom_nav_bar.dart:68-94` |
| D10* | Mobile timeline repo calls `GET /timeline` — **endpoint doesn't exist** — and its parser expects `{type,title,timestamp}` items the activity-logs API doesn't return | `timeline_repository.dart:19-56` |
| D12* | `unreadCountProvider` exists but no badge surfaces it on Today/shell | `notifications_provider.dart:11` |
| D13* | Attendance pill collapses at check-out, not check-in; shrink/fade animation never driven (`_controller` only disposed, never `forward()/reverse()`) | `attendance_punch_card.dart:59,46` |
| D14* | Envelope bugs: `circulars_repository` + `polls_repository` parse only `List`/`{data:[]}` but APIs return `{circulars:[]}`/`{polls:[]}` → **return `[]` today** (copy the `announcements_repository.dart:25` pattern) | `circulars_repository.dart:17-31`, `polls_repository.dart` |
| D15* | Mobile `notifications_repository` calls phantom endpoints `PUT /notifications/$id/read` + `PUT /notifications/read-all` (404 — routes don't exist; real API is `PATCH /api/notifications`) | `notifications_repository.dart:33-39` |
| D16* | Registry `mobileRoute` drift: `/media/capture`, `/media/upload` don't exist; `report.daily.submit→/services`, `finance.purchase.approve→/today`, `canteen.order.create→/services` (no-op taps) | `packages/auth/capabilities.ts` vs `router.dart` |

(`D11` — `/api/mobile/v1/dashboard` hardcoded stub — out of scope, see Known Gaps.)

---

## Design

### A. Action Center state machine (client-first, Hive-persisted)

```dart
enum ActionStatus { pending, acknowledged, snoozed, dismissed, completed, expired }
```

| From \ To | pending | acknowledged | snoozed | dismissed | completed | expired |
|---|---|---|---|---|---|---|
| **pending** | — | ✓ | ✓ | ✓ | ✓ (only if action completes synchronously, e.g. server-acked read) | ✓ (TTL) |
| **acknowledged** | ✓ (re-opened) | — | ✓ | ✓ | ✓ | ✓ |
| **snoozed** | ✓ (lazy wake: snooze elapsed → re-evaluate on read/app resume/tray open — **no background timers**) | ✓ | — | ✓ | ✓ | ✓ |
| **completed / dismissed / expired** | terminal — no transitions | | | | | |

- **Pure transition function** `ActionStatus? transition(ActionStatus from, ActionEvent event)`
  with an explicit guard table — unit-tested exhaustively including the `snoozed→pending` column
  (illegal transitions return `null`, controller ignores them).
- `ActionItem` gains: `status`, `dedupeKey` (spec below), `source` (`pull|sse|fcm|local`),
  `institutionId?`, `createdAt`, `expiresAt?`, `snoozeUntil?`, `updatedAt`.
- **Dedupe key**: `notification:<id>` with the id **unified across the three id spellings** —
  pull `id`, SSE `notification.id` *or* `notificationId` (legacy frame), FCM data
  `notificationId`; non-notification sources use `approval:<type>:<id>` / `task:<id>` /
  `helpdesk:<id>` / synthetic hash. Dedupe on enqueue: same key + terminal → drop; same key +
  live → merge (keep highest priority, refresh `createdAt`).
- **TTL**: urgent 24h, high 48h, normal/low 7d — clock origin `createdAt` at first enqueue
  (re-enqueue does not extend); expiry lazily applied on read + app resume + tray open (transition
  to `expired`), no background timer needed.
- **Persistence**: Hive box `action_center` (`hive_flutter ^1.1.0` already in pubspec; Hive is
  already initialized at startup — no app-level init work); controller hydrates on init, writes
  on every mutation (debounced 300ms). Box records a schema version key; on mismatch the client
  discards and rebuilds from server. Terminal entries older than 7 days are purged on hydration
  (bounded growth).
- **Derived counts (single definition, all surfaces)**: badges/tray/FAB/tabs count
  `status ∈ {pending, snoozed}` via `pendingActionCountProvider` (urgent subset =
  `priority == urgent`). `acknowledged` items are visible in the tray but **excluded** from badge
  counts.
- **Server ack (D1)** — precise endpoints (review finding: the mobile repo's `PUT
  /notifications/$id/read` routes **do not exist** — do not copy them, fix D15*):
  - single dismiss/ack → `PATCH /api/notifications` body `{id}` (`notifications/route.ts:22`)
  - clear-all → `PATCH /api/notifications` with **no body id** = mark ALL read (same route,
    `else` branch) + local dismiss-all
  - approvals / help-desk / tasks: server-owned, dismissal is client-local only (no API)
  - Failures never block the local transition (log + keep local); **failed acks are retried on
    next pull / app resume** so server `isRead` eventually converges with client state (prevents
    the Notices unread badge diverging from the tray).
- **Pull ↔ live race**: a pull's "replace-from-server" applies only to `source == pull` items;
  SSE/FCM items enqueued during the in-flight pull are merged back after replace. Dismissed
  notification ids are re-reconciled on pull (if server still shows unread, keep dismissed —
  pending ack retry).
- **Clear-all semantics**: best-effort `PATCH` (no id) + local purge; failure tolerated, retried.

### B. SDUI manifest endpoint (D3)

`GET /api/mobile/today-hub` — `requireAuth(handler, "reports:read")`.

**Review correction (was "session-only" in Draft v1 — that claim was false)**: every peer mobile
feed (`/api/notifications`, `/api/circulars`, `/api/activity-logs`, `/api/approvals`,
`/api/mobile/v1/dashboard`) carries a permission key, and `pnpm security:requireauth` is a
**production deploy gate** (`.github/workflows/deploy-production.yml:56`) that fails on any naked
`export const = requireAuth(...)`. `reports:read` is the mobile precedent (`/api/mobile/v1/dashboard`)
and is held by `staff` (`roles.ts:355`) — 12 of 16 roles. **Accepted tradeoff**: roles lacking
`reports:read` (e.g. `academic_coordinator`, `exam_coordinator`) receive 403 → client renders its
hardcoded fallback manifest (all 5 static sections) — degraded but functional. No `roles.ts` /
permission-matrix change; `security:rbac` stays clean.

```jsonc
{
  "version": 1,
  "generatedAt": "…",
  "quickActions": [
    { "id": "leave.request.create", "label": "Apply Leave", "icon": "…",
      "route": "/me/leaves/apply", "capability": "leave.request.create",
      "tier": 1, "requiresWebHandoff": false }
  ],
  "sections": [
    { "id": "urgent_actions", "priority": 1, "enabled": true, "maxItems": 5 },
    { "id": "attendance",      "priority": 2, "enabled": true },
    { "id": "quick_actions",   "priority": 3, "enabled": true, "maxItems": 4 },
    { "id": "timeline",        "priority": 4, "enabled": true, "maxItems": 5 },
    { "id": "circular",        "priority": 5, "enabled": true, "maxItems": 1 }
  ]
}
```

- **Build**: `getQuickActions([session.role as StaffRole])` — note the cast (`SessionPayload.role`
  is `string`) — intersected with `CAPABILITY_REGISTRY` (`tier` field; the registry field is
  `requiresHandoff`, and `requiresWebHandoff(capId)` is a *helper function* at
  `capabilities.ts:496`, not a registry field). Exclude `requiresWebHandoff(cap)` items (none of
  the 11 current quick actions qualify — 9 are tier-1, 2 tier-2 — so the filter is a no-op today;
  it is a correctness guard for future registry additions).
- **Curation rule (review finding)**: do NOT take registry order blindly — `.take(4)` on raw
  registry order would yield Punch/Apply/Approve/Capture and drop today's curated 4 (Canteen,
  Helpdesk, Book Room, Visitor Pass). Server emits an explicit ordered list: **current curated 4
  first, then remaining capability matches in registry order**, capped at 8 (client takes 4).
- **Route allowlist validation (review finding)**: registry `mobileRoute`s are partly stale
  (D16*). The builder validates every emitted `quickAction.route` against a server-side
  `MOBILE_ROUTES` allowlist constant mirroring `router.dart` paths; non-matching entries are
  dropped (logged) — guaranteeing the end-state "every tap lands on a route that exists". A unit
  test asserts every emitted route ∈ allowlist. Registry drift itself stays a Known Gap.
- **`sections[].enabled` conditions** (server-side, evaluated with `hasPermission`):

  | Section | Enabled when | Client hides when |
  |---|---|---|
  | `urgent_actions` | always | list empty |
  | `attendance` | always | (session has no attendance scope — never in practice) |
  | `quick_actions` | ≥1 quick action after handoff filter + route validation | empty |
  | `timeline` | `hasPermission(role, "reports:read")` | scoped feed empty |
  | `circular` | `hasPermission(role, "circulars:read")` | empty |

- **Feature flag**: `today_hub` in `src/lib/features.ts` (tenant-aware, same pattern as
  `agentic_workflows`); endpoint resolves institution via `resolveRequestInstitution` for flag
  lookup. **Flag off → 403 `{error: "…disabled"}`** (matches `agents/workflows/route.ts:11-13`)
  → client renders hardcoded fallback (current 5-section order) so the app never breaks.
- **Protocol/version**: client sends `?v=1`; `version` additive-only within v1; client ignores
  unknown section ids (already the rule) and unknown quick actions; server clamps requested
  version to supported. Flag flips mid-session are picked up on next Today open/app resume;
  403 mid-session → immediate fallback (no crash).
- **Caching**: `Cache-Control: no-store`; client caches the manifest in memory for the Today
  session only (refetch on Today open / app resume / pull-refresh). No endpoint-specific rate
  limit (authenticated, <5KB, cheap); revisit if abused.
- Response budget: < 5 KB (mirrors the `mobile-api.test.ts` serializer discipline).

### C. Producers (D4)

**C.1 Pull** — on Today open + `RefreshIndicator` + **app resume + return from an ack route**
(refresh triggers): parallel `GET /api/approvals`, `GET /api/notifications` (badge via the
existing `GET /api/notifications/unread-count` — `?unread=1` does not exist), `GET /api/help-desk`,
`GET /api/tasks` (server scopes by session). **401/403 are treated as empty, not errors**
review finding: `GET /api/approvals` is gated on `leaves:approve` — only 4 roles hold it; the
in-handler `role === "staff" → []` branch is unreachable. Same for `GET /api/notifications` for
roles lacking `notifications:update`). All mapped through a single `ActionMapper` (one place for
`type → route`, reusing the FCM type→route allowlist at `fcm_service.dart:307-370`; **ActionMapper
adds the missing cases**: `circular → /circulars`, marketplace → its registered route, `general`
→ `/notifications`; unknown type → enqueue without tap route — tapping opens Notices — never
silently falls to `/`).

**Priority mapping** (drives TTL tiers):

| Source type | Priority | TTL |
|---|---|---|
| approval awaiting *my* action / leave decision on *my* request | urgent | 24h |
| task due today/overdue, help-desk assigned to me | high | 48h |
| notifications (reminders, assignments) | normal | 7d |
| circulars / announcements / polls | normal | 7d |

**C.2 SSE** — two server frame shapes exist (review finding — Draft v1 documented only the
first; tasks/leaves/marketplace emit the second):

1. `notifications.ts:92` → `{type:'new', notification:{type, referenceType, referenceId, …}}`
   (events, polls, announcements, circulars)
2. `push-service.ts:100` → `{type:'new_notification', notificationId, title, message}` — **no
   type/reference fields**; this is the only path for tasks, leaves, marketplace

**Server normalizes shape 2** to carry `type`/`referenceType`/`referenceId` (edit
`push-service.ts` — added to File Changes), **and** `ActionMapper` tolerates both shapes
(legacy → best-effort route; unknown/invalid frame → dropped with log). Wiring steps: fix the
`sse_service.dart:60` double-prefix URL (D8* third site) so the connection actually opens,
then `ActionCenterController.startRealtime()` (single-guarded) called when the tray provider is
first watched, cancel on dispose. Reconnect redelivery is idempotent via dedupeKey.

**C.3 FCM foreground** — `fcm_service` foreground handler (`fcm_service.dart:113-117` →
`_showForegroundNotification`) **enqueues** via `ActionMapper` in addition to the existing toast;
tap-navigate behavior unchanged. FCM + SSE + pull double-enqueues collapse on dedupeKey.

### D. Today section wiring (P1-P5)

| P | Section | Source | Notes |
|---|---|---|---|
| 1 | Urgent actions | `actionCenterProvider` (populated by C) | tray + inline list read the same provider; dedupe |
| 2 | Attendance card | existing `attendanceProvider` | fix D13 (collapse **after check-in**, compact checkout affordance, actually drive `_controller.forward()/reverse()`); drop no-op `onPunchComplete` setState |
| 3 | Quick actions | manifest `quickActions` → client `.take(maxItems)`; fallback = current hardcoded 4 | **manifest is the resolver** — server already role-filters; client does NOT fetch `/api/auth/permissions` (Draft v1's client permission fetch is deleted: `AuthState` has no permissions field and it would duplicate server-side gating). Capability field becomes live |
| 4 | Today's timeline | repoint `timeline_repository` → `GET /api/activity-logs` — **URL-only repoint is insufficient** (review finding): rewrite parser for the `{logs, total, page, limit}` envelope and map `action`+`details → title/type`, `createdAt → timestamp`, `id → String(id)`. Scope = own logs **+ staff sharing a department** (`activity-logs/route.ts:24-46`) — not strictly personal; `staff` holds `reports:read` ✓. Fixes D10 |
| 5 | Latest circular | `GET /api/circulars` (route has **no `limit` param** — client does `.take(1)`) **plus fix D14\***: `circulars_repository` must parse the `{circulars:[…]}` envelope (it returns `[]` today). Unread badge from `unreadCountProvider` (D12) | placeholder container deleted |

Section rendering becomes manifest-driven: `TodayScreen` fetches manifest → builds ordered
section widgets from `sections[]` (unknown ids ignored, known ids mapped) → `ShimmerLoading` while
loading, `RefreshIndicator`, `.catch()` → fallback manifest (hardcoded order) + `AppErrorWidget`
(retry) on persistent failure — real mobile widgets (`lib/shared/widgets/loading_widget.dart`,
`error_widget.dart`; no `Skeleton`/`<Alert>` in the Flutter app).

### E. Tab IA (D2) + defect fixes

- Router branches → **Today, Notices, My Hub, Media (capability-gated)**; new `NoticesScreen`
  branch = thin wrapper (segmented Circulars / Announcements / Polls) reusing the existing list
  widgets + repositories — **fix D14\* first** (circulars/polls repos return `[]` today). Notices
  has no internal "View all → /circulars" (would duplicate the tab); the pushed routes
  `/circulars|/announcements|/polls` **stay registered** (FCM/deep-link targets). Invalidates
  `unreadCountProvider` on SSE arrival + tab open (it's a FutureProvider).
- `/services` stays a pushed route + Today quick action — **NOT added to My Hub** (spec §7: "Services
  are not dumped into My Hub"; `me_hub_screen.dart:11` documents the same rule). Draft v1's
  "+ reachable from My Hub" is removed as a spec violation.
- **Bell (D4\*)**: the top-bar notifications bell (`today_screen.dart:82`) gets a **real
  `/notifications` route registered → existing orphaned `NotificationsScreen`** — it does NOT
  point at Notices (Notices = circulars/announcements/polls; the bell = notifications). This fix
  lands with step 7 (route registration), not step 5.
- **Tray/FAB single layer (D5\*)**: shell overlay owns **exactly one tray + one FAB**, rendered
  only on the Today branch; Today-local tray+FAB deleted; the `ActionCenterFab` *moves* to the
  shell overlay (deleting it outright would leave zero FABs — review finding). Services keeps its
  count chip (driven by `pendingActionCountProvider`) but its local tray instance is removed.
- **Bottom-nav badges**: unread notifications (`NavigationDestination.badge` from
  `unreadCountProvider`) on **Notices**; `pendingActionCountProvider` on **Today** — this
  resolves Draft v1's contradiction between Design E and Known Gap #4 by *implementing* the badge
  (Known Gap #4 is dropped).
- Fix D7\* per review: `_hasCapability` consults `CAPABILITY_REGISTRY` (drop the hardcoded
  5-role list; note `teacher`/`coordinator` **are** valid `StaffRole`s — Draft v1's claim they
  weren't was wrong) and correctly returns false for absent capabilities; add `media.asset.create`
  to the registry or gate Media on an existing capability. Fix D8\* (3 double-prefix sites).
  D9\* (delete orphans). D15\* (notifications repo → `PATCH`). `/search` dead affordance removed;
  `/timetable` reference disappears with the P4 rewrite.

---

## Implementation Steps (branch `feat/phase-2-today-hub`)

1. **Prep**: clean `git status`, branch off `master`.
2. **Server: manifest endpoint** — `src/app/api/mobile/today-hub/route.ts`
   (`requireAuth(handler, "reports:read")`, flag-gated, tenant-resolved) + `today_hub` flag in
   `src/lib/features.ts` + serializer additions in `mobile-serializer.ts` (curation order,
   `MOBILE_ROUTES` allowlist validation, `enabled` conditions). Web tests:
   `src/app/api/mobile/__tests__/today-hub.test.ts` — shape, flag-off → 403, <5KB,
   quickActions non-empty for admin/staff + curated-first + every route ∈ allowlist.
   *Suggested commit 1.*
3. **Server: SSE frame normalization** — `push-service.ts` frame carries
   `type`/`referenceType`/`referenceId`; test both frame shapes. *Can fold into commit 1.*
4. **Mobile: state machine** — `ActionStatus`/events/guard table as pure functions
   (`action_state_machine.dart`), `ActionItem` fields (`snoozeUntil` etc.), Hive hydrate/persist
   (temp-dir init per `offline_sync_queue_test.dart:15`), dedupe key unification, TTL, derived
   count providers. Unit tests: exhaustive transition matrix **incl. `snoozed→pending`**, dedupe
   across all 3 id spellings, TTL, persistence round-trip, badge-count definition
   (`pending`+`snoozed` only). *Commit 2.*
5. **Mobile: producers** — `ActionMapper` (both SSE shapes + FCM map + missing `circular`/
   `general` cases + unknown-type policy), pull providers with `.catch()` treating 401/403 as
   empty, `startRealtime()` SSE wiring (after D8* URL fix), FCM foreground enqueue, pull↔live
   merge-back. Unit tests: mapper cases, both SSE frames → ActionItem, unknown frame dropped,
   FCM+pull double-enqueue race, pull-replace-doesn't-wipe-live items, reconnect redelivery
   idempotency. *Commit 3.*
6. **Mobile: Today screen SDUI** — `todayHubProvider` (manifest fetch + fallback), manifest-driven
   section order, ShimmerLoading/RefreshIndicator/AppErrorWidget, P4 parser rewrite + P5/D14\*
   envelope fixes, D15\* notifications repo → `PATCH`, remove no-op setState, `/search` +
   `/timetable` dead affordances removed. Widget tests: section order follows manifest; fallback
   on fetch failure/403; timeline + circulars mapping tests. **Attendance pill (D13)** lands here
   (collapse after check-in, drive `_controller`). *Commit 4.*
7. **Mobile: tab IA (D2) + shell fixes** — Notices branch + screen (+D14\* repo fixes if not in
   step 6), `/notifications` route → `NotificationsScreen` + bell repoint (D4\*), Media capability
   gate via corrected D7\* check, tray+FAB single layer (D5\*; FAB moves to shell overlay),
   bottom-nav badges (D12\* + Today tab badge), delete orphans (D9\*), D8\* double-prefix fixes
   (all 3 sites). *Commit 5.*
8. **Plan/docs**: PLAN.md status + verification + sign-off; update `docs/` only if a route table
   mentions mobile tabs (low priority). *Commit 6.*
9. **Verification** (below), fix, PR (CI: web gates + Flutter jobs + Playwright green; head fully
   green).

Suggested commits: (1) server manifest + flag + SSE normalization + tests, (2) state machine +
tests, (3) producers + tests, (4) Today screen wiring + attendance pill, (5) tab IA + defect
sweep, (6) plan/docs. Steps 2-5 are server/mobile independent; mobile renders fallback until
step 6, so ordering is flexible on the feature branch (CI runs at head).

---

## File Changes Summary

| File | Action |
|---|---|
| `src/app/api/mobile/today-hub/route.ts` | **Create** — `requireAuth(handler, "reports:read")`, flag-gated, tenant-resolved |
| `src/lib/features.ts` | **Edit** — `today_hub` flag (tenant-aware) |
| `src/lib/mobile/mobile-serializer.ts` | **Edit** — manifest serializers, `MOBILE_ROUTES` allowlist, curation |
| `src/lib/notifications/push-service.ts` | **Edit** — SSE frame normalization (§C.2) |
| `src/app/api/mobile/__tests__/today-hub.test.ts` | **Create** |
| `…/features/action_center/action_state_machine.dart` | **Create** — enum, events, guard table |
| `…/features/action_center/controller.dart` | **Edit** — status fields, Hive, dedupe, TTL, counts, realtime start |
| `…/features/action_center/action_mapper.dart` | **Create** — type→route resolution (shared with FCM) |
| `…/features/action_center/tray.dart` | **Edit** — status-aware tiles, ack callbacks, count providers |
| `…/features/today/presentation/today_screen.dart` | **Edit** — manifest-driven sections, P4/P5 data, route fixes, tray/FAB removal |
| `…/features/today/data/today_hub_provider.dart` | **Create** — manifest fetch + fallback |
| `…/features/today/presentation/notices_screen.dart` | **Create** — Notices branch (D2) |
| `…/features/attendance/presentation/attendance_punch_card.dart` | **Edit** — D13 collapse fix + animation |
| `…/app/router.dart` | **Edit** — tab set, `/notifications` route, tray+FAB placement, D7*, badges |
| `…/features/timeline/data/timeline_repository.dart` | **Edit** — D10* repoint + envelope/field mapping |
| `…/features/circulars/data/circulars_repository.dart`, `…/polls/data/polls_repository.dart` | **Edit** — D14* envelope parsing |
| `…/features/notifications/data/notifications_repository.dart` | **Edit** — D15* phantom PUT → `PATCH` |
| `…/core/services/sse_service.dart` | **Edit** — D8* URL fix (`/notifications/subscribe`) |
| `…/core/services/fcm_service.dart` | **Edit** — foreground enqueue |
| `…/dashboard/data/workspace_provider.dart`, `…/background_presence_service.dart` | **Edit** — D8* double prefix |
| `…/shared/widgets/bottom_nav_bar.dart`, `dashboard/…` | **Delete** — D9* orphans |
| `thaibahive_mobile_app/test/features/action_center/*` | **Create** — state machine, mapper, SSE, dedupe, persistence, count tests |
| `thaibahive_mobile_app/test/features/today/*` | **Create** — manifest widget, fallback, timeline/circulars mapping tests |

---

## Verification

1. `pnpm typecheck` → 0 errors; `pnpm lint` → 0 errors (pre-existing warnings only)
2. `pnpm test` → all suites green incl. new `today-hub.test.ts`
3. `pnpm security:rbac` + **`pnpm security:requireauth`** (deploy gate — new route must carry
   its permission key) + `pnpm test:permissions-snapshot` → 0 drift (no permission keys added)
4. `pnpm build` → success; new route appears in route table under mobile API
5. In `thaibahive_mobile_app/`: `flutter analyze --no-fatal-infos --no-fatal-warnings` (CI
   parity) → no new issues; `flutter test` → all green incl. new
   state-machine/mapper/manifest/persistence tests
6. Manual/dev smoke (`flutter run` or widget tests as proxy):
   - Today open → sections render in manifest order; flag off → fallback order; network fail →
     AppErrorWidget + fallback (no stuck spinner); roles without `reports:read` → 403 → fallback
   - Notification/task/leave lands (SSE + FCM + pull) → tray badge increments → survives app
     restart (Hive) → badge excludes acknowledged/dismissed
   - Illegal transitions rejected; snooze wakes lazily; TTL expiry → `expired`
   - Attendance pill collapses after **check-in**; checkout still possible from pill
   - Every Today tap resolves (no `/notifications`, `/search`, `/timetable` crashes); bell →
     NotificationsScreen; quick actions ⊂ curated-4-first, all routes exist
   - Tabs: Today/Notices/My Hub/Media; badges on Today + Notices; Services reachable as quick
     action + route; exactly one tray + one FAB (Today branch only)
7. Web e2e (`pnpm test:e2e`) → unchanged green (web surface additions are API-only; no nav/IA
   changes on web)
8. CI: full matrix green at head (Next.js Web CI, Flutter jobs, Playwright shards, deploy gate)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Manifest endpoint changes force app releases (SDUI coupling) | Medium | High | `version` field + client ignores unknown section ids + hardcoded fallback; flag allows server-side kill switch |
| SSE reconnect storms / duplicate enqueues | Medium | Medium | dedupeKey idempotency (tested incl. reconnect redelivery + FCM/pull double-enqueue); existing 30s keep-alive; single `startRealtime()` guard |
| Hive schema drift across app upgrades | Low | Medium | schema version key in box; v1 = rebuild-from-server on mismatch |
| Roles without `reports:read` get manifest 403 | Medium | Low | documented tradeoff — client fallback renders all 5 static sections; revisit only if those roles report degraded Today |
| `activity-logs` is own+department scoped (not strictly personal) | Medium | Low | section hides when empty; scope documented; class-schedule P4 variant logged as Known Gap |
| Tab rework regresses deep links / FCM routes | Medium | High | pushed `/circulars` etc. stay registered; route allowlist unchanged; e2e `legacy-redirects` untouched (web); mobile route tests |
| Scope creep toward Phase 3/4 (media outbox, handoff) | Medium | Medium | anti-scope below; `requiresWebHandoff` actions explicitly filtered, not implemented |
| `approvals` 403s for staff → empty P1 for most users | High | Low | expected (staff don't approve) — pull treats 403 as empty; P1 auto-hides when empty; notifications/help-desk/tasks still produce items |
| Notices unread badge vs tray divergence (failed ack) | Medium | Low | failed acks retried on pull/resume; clear-all uses single no-id PATCH |

## Anti-Scope (Phase 2 will NOT do)

- ❌ New DB tables / migrations / cross-device action sync (D1 defers to Phase 3/4)
- ❌ Tier-3 WebView handoff for `requiresWebHandoff` actions (Phase 4)
- ❌ Client-side `/api/auth/permissions` fetch (manifest is the resolver; server gates)
- ❌ Media tab / offline media queue (Phase 3)
- ❌ Web Today Hub UI (web keeps workspaces; manifest is consumed by mobile only)
- ❌ Redesigning circulars/announcements/polls internals (reused as-is)
- ❌ Fixing registry `mobileRoute` drift (D16* — allowlisted/dropped this phase; see gaps)
- ❌ `/api/mobile/v1/dashboard` stub replacement (left as-is, see Known Gaps)

## Known Gaps Logged (out of scope)

1. `/api/mobile/v1/dashboard` hardcoded stub remains (mobile doesn't consume it).
2. Class-schedule variant of P4 (school day timetable for teachers) — activity feed chosen this
   phase (own+department scoped); revisit with real demand.
3. Cross-device dismissal sync (D1 → Phase 3/4).
4. Registry `mobileRoute` drift (D16*) — server allowlist drops dead routes this phase; registry
   entries need a Phase 3 pass.

---

## Rollback

`today_hub` flag off → endpoint 403 → clients render hardcoded fallback (Today still works,
static sections; producers/tray unaffected — they don't depend on the flag). Full rollback =
git revert of the feature branch (no schema/migrations to unwind; Hive box ignored by old
clients).

---

## Plan Review (AGENTS.md rule)

Qwen (`ask_qwen`) / OpenCode / Claude Code MCP tools unavailable in this session → substituted
**2 independent reviewer subagents** (fresh context), 2026-10-06:

1. **Code-correctness review** — 20 confirmations, 17 discrepancies found (2 Critical: false
   "session-only requireAuth" claim that would break the deploy gate; broken SSE client URL).
2. **Completeness/IA review** — 21 findings, verdict "needs revision" with 5 blocking items
   (SSE second frame shape, quick-action curation/dead routes, P4 envelope, P5 envelopes,
   My Hub spec violation).

**All Critical + Important findings incorporated into Draft v2** (this document); Minor items
folded into steps/verification (widget names, test counts, line cites, flag-off status code,
Rollback section added).

## Sign-Off

- [x] Plan review (AGENTS.md rule) — 2 reviewer subagents; blocking findings resolved above
- [ ] Tech Lead: state machine transitions + manifest schema reviewed
- [x] Security: no new permission keys — `requireAuth(handler, "reports:read")` matches the
      mobile dashboard precedent; `security:requireauth` added to verification (deploy gate)
- [ ] QA: verification checklist executed
- [ ] UX: tab IA (Notices) + tray placement approved


