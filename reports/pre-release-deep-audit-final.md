# ThaibaHive Pre-Release Deep Audit — Final Consolidated Report

**Date:** 2026-10-02
**Status:** FINAL (merged, cross-verified)
**Sources:** (1) opencode deep audit — 604 API routes, 528 shell/component TSX files, 77 Flutter files, core finance/agent engines; (2) Devin AI audit report.
**Verification method:** Every finding below was re-read against source. Disputed findings between the two audits were individually adjudicated (see §2). Line references are 1-indexed and verified.

---

## 1. Executive Summary

**9 release-blocking (P0) flaws**, **5 high (P1) flaws**, **4 UI/UX defect classes (P2)**, and **2 mobile defect classes (P3)**. The two most consequential facts:

1. **Tenant isolation is structurally broken.** The session payload carries no `institutionId` and RBAC is role-only, so `requireAuth` proves *role*, never *tenant*. ~144 `update()/delete()` call sites lack tenant predicates (~75 in files with zero tenant markers). CI's tenant scanner does not inspect any of them (§6, SEC-07).
2. **The edge does not verify tokens.** `middleware.ts` only checks that a token *exists*; combined with 8 fully unwrapped routes and a static-header super_admin bypass, this yields unauthenticated endpoints that return `matched: true` for any enrolled staff.

Payroll batch generation duplicates deductions on every re-run (and mutates disbursed amounts), exam scheduling detects only exact-start-time collisions (room double-booking guaranteed), and the agent audit ledger has no flush timer, silently resets its Merkle chain to genesis on every restart, and swallows DB write failures.

---

## 2. Reconciliation with the Devin AI Report

### 2.1 Devin findings independently VERIFIED as true (merged in)

| Devin claim | Verification |
|---|---|
| IDOR in `academic/classes/[id]/route.ts` | ✅ **Confirmed — worse than reported**: `updatableFields` includes `"institutionId"` (line 45 → cross-tenant re-parent), session discarded as `_session` (lines 36, 61), PATCH/DELETE unscoped |
| IDOR in `help-desk/[id]/route.ts:51` | ✅ Confirmed — `.where(eq(helpDeskTickets.id, id))`, session unused for scope |
| Payroll deduction idempotency gap (`payroll-engine.ts:185+`) | ✅ Confirmed (LOGIC-01) — plus Devin missed that re-runs also silently mutate **disbursed** records |
| Exam collision = exact start time only (`schedules/route.ts:43`) | ✅ Confirmed (LOGIC-02) |
| Merkle ledger missing background flush | ✅ Confirmed (LOGIC-03) — Devin missed the deeper issues: in-memory-only chain, restart→genesis fork, silent `catch{}` on DB writes |
| Missing `.catch` on `admin/leave-types`, `admin/shifts`, `recognition` | ✅ Confirmed (UI-01) |
| Custom `fixed inset-0` overlays (`add-user-modal.tsx:91`, `diagnostics-button.tsx`) | ✅ Confirmed (UI-02); the higher-severity instance Devin missed is `admin/agents/page.tsx:318` kill-switch modal |
| Mobile missing `RefreshIndicator` (`more_screen.dart:93`, `analytics_dashboard`, `purchase_approval_detail`, `ev_smart_charge`) | ✅ Confirmed (MOB-01) |
| Badge hardcoded colors | ✅ Real class of issue exists — but see 2.2 for Devin's specific false positives |

### 2.2 Devin findings DISPROVEN (excluded from this report)

| Devin claim | Adjudication |
|---|---|
| `admin/sub-departments/page.tsx` infinite spinner | ❌ Line 18 is `.catch(() => setLoading(false))` — loading **does** reset. Not a stuck spinner. |
| `agent_hub_screen.dart:176/219/232` missing pull-to-refresh | ❌ `RefreshIndicator` at line 170 wraps the entire `TabBarView` including all three lists. Compliant. |
| Badge violations at `regional-analytics/hierarchy:61`, `assets:252,254`, `staff/[id]/edit:64,199`, `advising-desk:44` | ❌ None are `<Badge>` elements: line 61 is a `<Button>`, assets lines are `color:` strings in a stats config, edit:64 is a color-map object and edit:199 is a `<div>` dot. False positives. |
| `attendance/page.tsx` "Loading..." vs Skeleton | ❌ Line 288 is a **disabled-button label** ("Loading…" / "Load More"), not a page loader. Borderline state text; not a Skeleton violation. |
| "25 critical issues" in exec summary | ❌ Self-inconsistent: Devin's own table totals 13. |
| Recommended fix `eq(table.institutionId, session.institutionId)` | ⚠️ **Will not compile** — `SessionPayload` has no `institutionId` field (`packages/auth/session.ts:20-28`). Correct pattern: `resolveScopedInstitutionId()` / `getUserInstitutionScope()` (`src/lib/finance/institution-context.ts`). |
| Exam-overlap fix via `sql\`...\`` snippet | ⚠� Directionally right, but works only for zero-padded `HH:MM` text; omits instructor conflict, `endTime > startTime` validation, TOCTOU/unique constraint, and tenant scoping. See LOGIC-02. |
| `admin/institutions/[id]:54` listed as critical IDOR | ⚠️ Mitigated — `org:manage` maps to `admin` only (global role). Downgraded to Tier 3. |

### 2.3 Critical flaws Devin MISSED (all verified in §3)

Middleware never verifies JWT signatures (SEC-01) · unauthenticated biometric/MDM oracles with no template comparison (SEC-02) · `x-cron-secret` → super_admin bypass (SEC-03) · 41 `requireAuth` sites with no permission string incl. approvals PATCH and global search (SEC-05) · body-trusted approver identity (SEC-06) · `resolveInstitutionId` returns client value unvalidated; fee checkout omits the store's tenant arg (SEC-04) · TaxRateEngine non-deterministic override pick + 0% fallback (LOGIC-04) · payroll non-deterministic structure selection + flat TDS + no status state-machine (LOGIC-05) · timetable teacher/room conflicts + client-chosen tenant (LOGIC-07) · CI scanner blind spots (SEC-07) · 10 stuck-spinner files (UI-01) · Merkle restart chain-reset (LOGIC-03b).

---

## 3. Findings — Prioritized

### 🔴 P0 — Release Blockers

**SEC-01 — Middleware never verifies the JWT signature**
`src/middleware.ts:73` checks only token presence; `extractRoleFromToken` (`:159-171`) base64-decodes without signature verification. Any `Bearer <garbage>` passes the edge. Real verification exists only inside `requireAuth → verifySession()` — so every unwrapped route (SEC-02) is fully unauthenticated.

**SEC-02 — Unauthenticated fake-auth oracles & static-token enrollment (8 routes)**
- `api/biometric/verify-face/route.ts`, `api/biometric/verify-fingerprint/route.ts` — no `requireAuth`; `staffId` from body; submitted `embedding`/`templateHash` is **never compared to the stored value** — line 24 returns `{ matched: true, confidence: 0.95 }` for any enrolled staff. (`biometric/settings` *is* wrapped — these two were plainly missed.)
- `api/mobile/mdm/enroll/route.ts:17` — static credential `'valid_enterprise_token'`, `tenantId` from body. `mdm/verify` leaks tenant status unauthenticated.
- `api/mobile/v1/sync/{push,pull}` — unauthenticated (in-memory today; landmine once persistence lands).
- `api/engage/chat/route.ts:10` — public but takes `institutionId` **from body** → cross-tenant LLM retrieval. `engage/voice` hardcodes `'global'`.

**SEC-03 — `requireAuth` built-in super_admin backdoor**
`src/lib/api/auth-guard.ts:47-61` — `x-cron-secret` / `x-dr-secret` / `x-cache-secret` matching env grants `{ staffId:"system", role:"super_admin" }` **for any route, zero permission check**. One leaked `CRON_SECRET` = total takeover.

**SEC-04 — Cross-tenant IDOR on update/delete (systemic)**
Session has no tenant; RBAC is role-only. Confirmed exploitable, ranked:

| Tier | Location | Flaw |
|---|---|---|
| 🔴 | `students/[id]/route.ts:46,56` | PATCH/DELETE `eq(id)` only; pre-fetch selects `{id}` — no tenant compare. `students:delete` held by `principal` → cross-campus delete. GET `:29` leaks PII by ID |
| 🔴 | `academic/students/[id]/route.ts:45,56` | `updatableFields` **includes `institutionId`** → re-parent attack (Devin ✅) |
| 🔴 | `academic/classes/[id]/route.ts:45,52,70` | Same `institutionId` in updatableFields + `_session` discarded (Devin ✅) |
| 🔴 | `approvals/route.ts:703-914` | approve/reject where = `id + status` only; compounded by no permission string (SEC-05) |
| 🔴 | `finance/fees/{allocations,structures}` | tenant from client query/body (`|| 'global'`), never compared to scope |
| 🔴 | `finance/fees/checkout/route.ts:16` | `getAllocationById(allocationId)` **omits the 2nd tenant arg the store supports** → pay another school's allocation |
| 🟠 | `help-desk/[id]/route.ts:51` (Devin ✅), `staff/[id]/route.ts:197-225` (DELETE skips `canAccessStaff()`), `purchases/[id]` (`isManagedBy()` returns `true` unconditionally for `principal/accounts/purchase` — `department-scope.ts:50`) | |
| 🟠 | exams `DELETE` (`exams/[id]:62`), report-card publish `:24`, marks moderate `:53`, `vehicles/[id]:85` (cascade), `visitors/[id]`, `academic/timetables/route.ts:190`, `performance/*`, `media/*`, `tasks/[id]` | all `eq(id)`-only |

**Scale:** 145 `.update(` + 49 `.delete(` in routes; ~144 lack tenant predicates; ~75 in files with zero tenant markers. Safe resolver `resolveScopedInstitutionId()` used by only **8 routes**; `resolveInstitutionId()` (`institution-context.ts:7-11`) returns the **client-supplied value unvalidated**. Correct fix pattern: `where(and(eq(t.id, id), eq(t.institutionId, scope)))` with scope from `resolveScopedInstitutionId()` — **not** `session.institutionId` (field does not exist).

**SEC-05 — RBAC silently skipped: 41 `requireAuth` sites with no permission string**
`requiredPermission` is optional (`auth-guard.ts:17`). Worst: `approvals/route.ts:645` (PATCH approve/reject — any role), `finance/reject/route.ts:4`, `search/route.ts:8` (**session discarded (`_session`)** → cross-tenant global search), `graphql/federated:7`, `activity-logs:7`, `circulars:13`, `attendance/settings:56,:114`, mobile sync/notification block. Plus **5 DELETEs gated by the wrong permission**: `reports:read` (`analytics/schedules/[id]:122`), `bookings:create` (`bookings/[id]:28`), `tasks:create` (`tasks/[id]:100`), `exam:create` (`exams/[id]:62`), `org:manage` (`checklists/assignments/[id]:119`).

**SEC-06 — Body-trusted actor identity**
✅ Correct elsewhere: `finance/approve:79`, `leaves/[id]:54`, `expense-claims:87`, `tax-rates/overrides:37`, `approvals/route.ts:646` all use `session.staffId`.
❌ Violations: `public/affiliations/route.ts:71` (`approvedById` from body — approver spoofable), `performance/reviews:106` (reviewer fallback chain), `performance/goals:31-39` (**institution derived from body staffId**), `docgen/mobile/tokens:20` (`userId` from body), `canteen/passes:29-36` (`userId` from body + hardcoded `institutionId: "inst_001"`), `notifications/broadcast:22`, `vehicles/maintenance:35` (`performedBy` from body).
❌ **Hardcoded-tenant cluster (added on Antigravity cross-review, code-verified):** `canteen/menu:32,55`, `visitors/pre-register:31`, `visitors/pass/issue:16,19,30`, `vehicles/routes:8,27` (**GET filters + POST inserts all hit inst_001**), `vehicles/maintenance:8,41`, `mobile/v1/visitors/sync:30` — every tenant reads/writes a single hardcoded institution instead of its own scope.

**LOGIC-01 — Payroll batch idempotency broken**
`payroll-engine.ts:185-210`: `payrollRecords` upserts correctly (unique idx `staff+year+month`, schema `:6998`), but `payrollDeductions` is a plain insert with **no cleanup and no unique constraint** (schema `:7010-7012` = non-unique index). Re-running `POST /finance/payroll/generate` for the same period: (a) appends **3 duplicate deduction rows per staff per run** → downstream SUMs double/triple-count; (b) upsert `set` rewrites gross/net of **already-`disbursed` records while leaving `status` untouched** → paid amounts mutate post-disbursement. Devin ✅ on (a), missed (b).

**LOGIC-02 — Exam schedule collision checks exact start time only**
`examinations/schedules/route.ts:43` — conflict = same `date + room + startTime`. 09:00–12:00 and 10:00–11:00 in the same room **both pass** → guaranteed double-booking. Missing: interval overlap (`existing.start < new.end && existing.end > new.start` on zero-padded `HH:MM` text), instructor conflict, `endTime > startTime` validation, tenant check on `examId`, unique constraint (check-then-insert is TOCTOU-racy), and IDs are `sched_${Date.now()}` (same-ms collision).

**LOGIC-03 — MerkleAuditLedger: no flush timer, chain resets on restart, silent write loss**
- **No background flush anywhere.** `flushAll()` is dead code (no callers outside its file); `instrumentation.ts` registers only the revocation mesh — no SIGTERM/SIGINT flush → buffered entries lost on restart/deploy. Sibling `src/lib/audit/crypto-writer.ts:35-59` *does* implement a 50 ms `setInterval` flush — the pattern exists but was not applied here.
- **LOGIC-03b (deeper): chain lives only in memory.** `agent-store.ts:333-340` `listToolInvocations` never reads the DB; `recordToolInvocation`'s DB insert is wrapped in a silent `catch {}` (`:327-329`). After restart, `getLatestAuditHash` returns GENESIS → **chain silently forks from genesis, orphaning DB history**; `verifyChainIntegrity` then validates only the since-restart window. Multi-instance deployments fork independent chains.
- **Provisional ≠ persisted hash:** buffered path hashes with `Date.now()` (`merkle-ledger.ts:103`) but flush recomputes with `item.timestamp` (`:125`) → stored client hashes mismatch → false tamper alarms.
- **No flush mutex:** two concurrent flushes read the same `getLatestAuditHash` → forked chain. Load gate holds up to 5,000 entries/tenant in memory.
- Mitigating fact: `executor.ts:237` always passes `immediateFlush: true`, so the production tool path flushes per call — the timer/shutdown hook is still required for the buffered API and for `flushAll()` hygiene.

---

### 🟠 P1 — High

**LOGIC-04 — TaxRateEngine non-deterministic rate selection**
`tax-rate-engine.ts:36-53` fetches **all** matching active overrides with **no `.orderBy()`** and takes `overrides[0]` — with overlapping/duplicate overrides the effective rate is arbitrary row order. `createOverride` has no dedup. `calculateTax` falls back to **0.0%** when `jurisdictionId` omitted (`:77-81`), and `finance/tax-rates/calculate/route.ts:9-20` passes **client-chosen `institutionId` (via non-enforcing `resolveInstitutionId`) and `jurisdictionId`** through → clients can select a zero-tax outcome.

**LOGIC-05 — Payroll structure selection non-deterministic + dead tax logic + no status state-machine**
`payroll-engine.ts:134-142`: structures fetched with **no `orderBy`, no effective-date filter for the pay period** — a staff with multiple rows gets whichever the DB returns last (random) via upsert. `taxBracketCode` stored but never used: TDS = flat `gross × 0.1` (`:57`), PT = flat ₹200 (`:56`). `updateRecordStatus` (`:221-241`) has no state machine: `draft → disbursed` skips approval; `disbursed → draft` reverts; approver optional.

**LOGIC-07 — Academic timetable: no teacher/room conflict + client-chosen tenant**
`academic/timetables/route.ts:128-138` checks only `classId+slotId+dayOfWeek` — **same teacher in two classes one slot passes**, as does room double-booking. `:113` trusts `body.institutionId` **first** (class lookup only as fallback) → cross-tenant insert; `:120`'s `session.institutionId` fallback is dead code (field doesn't exist). DELETE `:190` is id-only IDOR. TOCTOU race — no unique constraint.

**SEC-07 — CI scanners give false assurance**
`scripts/security/tenant-isolation-scan.ts` flags only literal `SELECT * FROM institutions` without WHERE — it never inspects `.update()/.delete()` where-clauses, missing permission args, or body-derived identity (none of SEC-04..06). `rbac-permission-audit.ts` checks permission *mapping*, not missing permission *arguments*. The "603/603 shielded, 0 leaks" sprint log does not mean what it appears to.

---

### 🟡 P2 — UI/UX Frontend Resilience

**UI-01 — `useEffect` fetch missing `.catch()` — infinite loading spinners (10 confirmed)**
| File | Stuck gate |
|---|---|
| `checklists/page.tsx:43-50` | `<Skeleton>:90` — bare `.then().then()`, `setLoading(false)` success-only |
| `admin/checklists/page.tsx:33-40` · `admin/checklists/assignments/page.tsx:45-56` · `assignments/[id]/page.tsx:48-58` · `admin/checklists/[id]/page.tsx:39-51` | pulse gates `:62/:78/:80/:109` |
| `admin/leave-approvals/page.tsx:64-79` | `<Skeleton className="h-64">:147` |
| `staff/[id]/edit/page.tsx:83-116` | `<Skeleton>:172` |
| `admin/shifts/page.tsx:69-84` | `.catch(() => {})` swallows error, **never resets loading** |
| `admin/leave-types/page.tsx:42-49` | same catch-swallow anti-pattern (Devin ✅) |
| `admin/attendance-locations/page.tsx:60-70` | unguarded awaits |

Medium (5): `assets/page.tsx:152` (detail drawer), `recognition:73` (Devin ✅), `grievances:53`, `canteen:92`, `media-library:111`.
Low (4): `.finally` without `.catch` — `timeline:70`, `reviews:92`, `admin/reviews:139`, `components/portal/safety-status-canvas:19`.
Disproven: `admin/sub-departments` (§2.2).

**UI-02 — Raw `fixed inset-0` overlays instead of Radix `<Dialog>` (2 + 2 informational)**
- `admin/agents/page.tsx:318-356` — **kill-switch modal**: no `Dialog` import, no `role="dialog"`/`aria-modal`/Escape/focus-trap, raw `<input>:333`. Worst possible place for an inaccessible modal (Devin missed this one).
- `components/chat/add-user-modal.tsx:91` — same pattern (Devin ✅).
- Informational: `diagnostics-button.tsx:84` (popover-like, use `Popover`), `guided-tour.tsx:55` (has `role="dialog"`/`aria-modal`, bypasses shared Dialog).
- Clean: no native `<dialog>`, no `createPortal` modals, no `z-[9999]` conflicts.

**UI-03 — Hand-rolled pulse/text loaders instead of `<Skeleton>` (10)**
`approvals/page.tsx:130-137`, `assets:247`, `tasks:307`, `admin/checklists ×4`, `admin/shifts:134`, `components/workspaces/widgets/analytics-charts.tsx:27`, `components/ui/image-cropper.tsx:211` ("Loading..." text).

**UI-04 — Hardcoded Tailwind colors on `<Badge>` (8 verified)**
`announcements:232` (`bg-amber-*` → `warning`), `operations/supply:225` + `components/operations/supply/supply-cockpit-kpi-cards.tsx:74` (`emerald` → `success`), `staff/[id]/timeline:112` (`bg-amber-500`, **no variant at all**), `components/operations/vision/vision-radar-tab.tsx:80` (`rose` → `destructive`), `components/twin/portal/space-discovery-canvas.tsx:91-93` (hover overrides). Devin's 6 additional claims were false positives (§2.2).

---

### 🔵 P3 — Mobile UX (Flutter)

**MOB-01 — 28 files with scrollables and no `RefreshIndicator` (47 compliant)**
No alternative mechanism exists anywhere (zero `SmartRefresher`/`CupertinoSliverRefreshControl`); `AppScaffold` doesn't inject one — hard misses.
**P1 screens (9):** `admin_dashboard_screen.dart` (5 ListViews `:35/:148/:347/:440/:575`, **no error branch**), `canteen_screen.dart:52` (no error branch), `analytics_dashboard_screen.dart:185/:254/:303` (Devin ✅), `technician_workorder_screen.dart:66` (AppBar refresh *button* only), `federated_edge_scanner_screen.dart:26` (same), `campus_resource_booking_screen.dart:19` (no error branch), `nfc_tag_management_screen.dart` (3 tabs), `availability_screen.dart:41`, `leave_balance_screen.dart:28`.
**P2 (5):** `crash_logs_screen.dart` (2 tabs), `student_roster_screen.dart`, `ev_smart_charge_screen.dart` (Devin ✅), `campus_map_screen.dart`.
**P3 (14):** detail/form/chat/settings screens incl. `more_screen.dart:93` (Devin ✅ — static directory, low impact), `purchase_approval_detail_screen.dart:80` (Devin ✅), `settings_screen.dart:24`.
Disproven: `agent_hub_screen.dart` (§2.2).

**MOB-02 — Mobile error-handling gaps**
No error branch (failed fetch → silent empty list): `admin_dashboard_screen.dart`, `canteen_screen.dart`, `campus_resource_booking_screen.dart`. Bare `Text('Error:…')` without `AppErrorWidget(onRetry:)`: `technician_workorder:184`, `federated_edge_scanner:25`, `hall_ticket:30`. Raw `CircularProgressIndicator` instead of `PageShimmer`: 4 files. Reference implementation exists: `leave_balance_screen.dart:19-40`.

---

## 4. Statistics

| Pillar | P0 | P1 | P2 | P3 | Total findings |
|---|---:|---:|---:|---:|---:|
| 1. Security & Tenant Isolation | 6 (SEC-01…06) | 1 (SEC-07) | — | — | 7 |
| 2. Backend Business Logic | 3 (LOGIC-01…03) | 3 (LOGIC-04,05,07) | — | — | 6 |
| 3. UI/UX Frontend Resilience | — | — | 4 | — | 4 |
| 4. Mobile UX (Flutter) | — | — | — | 2 | 2 |
| **Total** | **9** | **4** | **4** | **2** | **19** |

Volume metrics: 604 routes scanned (61 without `requireAuth` → 8 critical, 53 justified; 825 call sites parsed → 41 missing permission strings); 145 `.update(` + 49 `.delete(` → ~144 unscoped; 528 TSX scanned (10 stuck spinners, 2 raw modals, 10 pulse loaders, 8 Badge violations); 77 Dart files with scrollables (28 non-compliant).

---

## 5. Verdict

**Do not ship** until all P0 items are fixed and re-verified (SEC-01…06, LOGIC-01…03). P1 items should ship in the same release if at all possible — LOGIC-04/05 touch money calculation and SEC-07 determines whether any of this stays fixed. P2/P3 may trail as a fast follow-up patch, but UI-01 (10 stuck spinners) is user-visible on first login and should ride along if capacity allows.

The companion fix plan is at `reports/pre-release-audit-fix-plan.md`.
