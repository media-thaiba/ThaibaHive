# Pre-Release Audit Fix Plan

**Companion to:** `reports/pre-release-deep-audit-final.md` (19 findings: 9 P0, 4 P1, 4 P2, 4 P3-class — IDs below match that report)
**Goal:** Zero P0/P1 findings before production release; P2/P3 as fast-follow in the same train if capacity allows.
**Repo conventions honored:** Zod validation, `requireAuth(handler, "perm")`, `resolveScopedInstitutionId()`, UI primitives from `src/components/ui/`, Riverpod + `RefreshIndicator` on Flutter lists.

---

## Phase 0 — Safety net (before touching code)

| # | Task |
|---|---|
| 0.1 | Record baseline: `pnpm lint`, `pnpm typecheck`, `pnpm test` — note pre-existing failures so new breakage is attributable. |
| 0.2 | Create working branch `audit/pre-release-fixes`; commit per phase (small, revertible commits). |
| 0.3 | Add a regression test per Phase 1–2 fix as you go (Jest); no fix lands without one. |

**Verification gate (run after every phase):**
`pnpm typecheck && pnpm lint && pnpm test && pnpm security:rbac && ppm security:tenants && pnpm gateway:scan` (use `pnpm security:tenants`; run Flutter gate in Phase 5: `flutter analyze && flutter test`).

---

## Phase 1 — P0 Security (SEC-01 → SEC-06)

### SEC-01 — Verify tokens in middleware
- `src/middleware.ts`: replace presence-only check (`:73`) with real verification using `jwtVerify` from `jose` (already a project dep) against `AUTH_JWT_SECRET`. Reject invalid/expired signatures with 401 (API) or redirect (pages). Keep `extractRoleFromToken` only for the `/workspace` redirect **after** signature passes.
- **Edge-runtime caution (Qwen review):** middleware runs on the Edge runtime — `jose` must use WebCrypto (`globalThis.crypto`); pass it explicitly if the default resolves to Node crypto, and verify the middleware bundle compiles for Edge/Vercel (add a build check for `next build` in Phase 6).
- **Accept:** request with `Authorization: Bearer garbage` → 401 from middleware on a non-public route; existing sessions unaffected; `next build` succeeds. Test: e2e login flow + a unit test on the verifier helper.

### SEC-02 — Close unauthenticated routes (8)
- `api/biometric/verify-face`, `api/biometric/verify-fingerprint`: wrap in `requireAuth(..., "staff:read")` (or dedicated `biometric:verify` — if added, register it in `packages/auth/roles.ts` for all tiers). **Also fix the logic bug:** compare submitted `embedding`/`templateHash` against `staff.faceEmbedding`/`staff.fingerprintHash` with a proper similarity/threshold check — never return `matched: true` unconditionally. Add in-route rate limiting (the audit found these and `finance/approve` have no throttle).
- `api/mobile/mdm/enroll`: `requireAuth(..., "mdm:manage")` (register permission, admin+super_admin) **and** replace static `'valid_enterprise_token'` with env secret + `timingSafeEqual`. Derive `tenantId` from `resolveScopedInstitutionId()`, not body. `mdm/verify`: `requireAuth(..., "mdm:read")`.
- `api/mobile/v1/sync/{push,pull}`: wrap with `requireAuth(..., "mobile:sync")` (register permission) — do this now even though persistence is pending.
- `api/engage/chat`: keep public if product requires, but resolve `institutionId` server-side (signed scope token issued at session start, or derive from caller) — remove body trust. `engage/voice`: validate Twilio signature (HMAC) before processing.
- **Accept:** all 8 routes return 401 without a valid session; biometric unit test proves mismatched template → `matched: false`.

### SEC-03 — Kill the super_admin secret bypass
- `src/lib/api/auth-guard.ts:47-61`: restrict each `x-*-secret` to an **explicit path allowlist** (e.g., `CRON_SECRET_ROUTES=/api/system/update,/api/media/reconcile`), and stop granting `super_admin` — grant a dedicated machine role (add `role: "system"` to `packages/auth/roles.ts` with only the permissions those cron routes need). Fail closed when env allowlist unset.
- **Accept:** `x-cron-secret` on `/api/students` (or any non-allowlisted route) → 401; on allowlisted route → passes with limited role. Unit test both.

### SEC-04 — Tenant-scope update/delete (systemic, ~144 sites)
**Canonical pattern (do NOT use `session.institutionId` — field does not exist):**
```ts
const scope = await resolveScopedInstitutionId(institutionIdFromParams);
await db.update(students)
  .set({ ... })
  .where(and(eq(students.id, id), eq(students.institutionId, scope)))
  .returning();
// 404 if no row returned
```
- **Wave 1 (Tier 1, do first):**
  - `students/[id]/route.ts` — scope GET/PATCH/DELETE (`:29,:46,:56`).
  - `academic/students/[id]/route.ts` — **remove `"institutionId"` from `updatableFields` (`:56`)**, add scope to PATCH/DELETE.
  - `academic/classes/[id]/route.ts` — same two fixes (`:45` updatableFields, `:52,:70` where-clauses), stop discarding `_session`.
  - `help-desk/[id]/route.ts:51` — scope PATCH.
  - `staff/[id]/route.ts` DELETE (`:197-225`) — add the `canAccessStaff()` check its PATCH sibling uses.
- **Wave 2 (Tier 2 money paths):**
  - `approvals/route.ts` — add `eq(table.institutionId, scope)` to all six update blocks (`:703-914`) + permission string (SEC-05).
  - `finance/approve`, `finance/fees/checkout:16` (**pass 2nd `institutionId` arg to `getAllocationById`**), `finance/fees/receipts:37` (same omission), `finance/fees/{allocations,structures}` (reject client-chosen tenant; use `resolveScopedInstitutionId`), `purchases/[id]` (fix `isManagedBy` at `department-scope.ts:50` — remove unconditional `true` for `principal/accounts/purchase`; compare institutions).
  - `payroll-engine.updateRecordStatus` — accept `institutionId` and scope the where (callers in `finance/payroll/*` already resolve scope).
- **Wave 3 (Tier 3):** exams (`exams/[id]`, `report-cards/publish`, `marks/moderate`, `marks/batch`), `vehicles/[id]`, `visitors/[id]`, `academic/timetables` DELETE, `performance/*`, `media/assets|folders/[id]`, `tasks/[id]`, `admin/{leave-balances,leave-types,shifts,sub-departments}/[id]`, `checklists/*`, `grievances/[id]`, `reports/[id]`, `bookings/[id]`, `announcements|events|circulars/[id]` (admin-only — still scope), store layers `src/db/supply-store.ts`, `src/db/alumni-store.ts`, `src/db/fee-store.ts` (thread optional `institutionId` through and use it when provided).
- Rule for every site: **fetch-then-verify is insufficient alone** — the where-clause must carry the tenant predicate (or use returned-row-null → 404).
- **Stretch (post-release, Qwen review):** to prevent drift across ~144 sites long-term, introduce a `scopedDb(tenantScope)` Drizzle wrapper that auto-injects `institutionId` predicates (and a dev/test-time query hook that warns on unscoped writes). Release scope stays manual-fix + AST gate; the wrapper is the follow-up hardening.
- **Accept:** for each Tier-1/2 route, a Jest test proves user scoped to `inst_A` targeting an `inst_B` row gets 404/403 and the row is unchanged.

### SEC-05 — Missing permission strings (41 sites) + wrong-permission DELETEs (5)
- Add `scripts/security/requireauth-permission-audit.ts`: AST-scan every `requireAuth(` call; fail (exit 1) if 2nd arg missing **or not a plain string literal** (template literals/variables are a bypass vector — reject them at build time) unless the file is in an explicit allowlist with a written justification (e.g., `auth/logout`, `webauthn` self-ops). Wire as `pnpm security:requireauth`.
- Fix the 41 sites: add correct permissions — **priority order:** `approvals/route.ts:645` → `"approvals:manage"` (verify mapping in `packages/auth/roles.ts`), `finance/reject:4` → `"finance:approve"`, `search:8` → `"search:query"` **and stop discarding the session** — pass scope into `globalSearch`, `graphql/federated:7`, `activity-logs:7` → `"audit:read"`, `circulars:13`, `attendance/settings:56,:114`, mobile block → appropriate `mobile:*`/`notifications:*` perms. Register any new keys in `roles.ts` for the correct tiers.
- Fix wrong-permission DELETEs: `analytics/schedules/[id]:122` → `reports:manage`; `bookings/[id]:28` → `bookings:manage`; `tasks/[id]:100` → `tasks:manage`; `examinations/exams/[id]:62` → `exam:delete` (or `exam:manage`); `checklists/assignments/[id]:119` → keep `org:manage` but confirm intended.
- **Accept:** `pnpm security:requireauth` exits 0 with zero allowlist entries beyond the justified list; `pnpm security:rbac` still exits 0.

### SEC-06 — Body-trusted actor identity
- Replace with `session.staffId`: `public/affiliations:71,81` (`approvedById`), `performance/reviews:106` (unless a documented delegation model — then verify delegation), `docgen/mobile/tokens:20` (`userId`), `notifications/broadcast:22` (validate target ∈ caller's institution), `canteen/passes:29-36` (`userId` + replace hardcoded `"inst_001"` with `resolveScopedInstitutionId()`), `vehicles/maintenance:35` (`performedBy`).
- **Hardcoded `institutionId: "inst_001"` cluster (Antigravity cross-review — verified against code):** replace every hardcoded tenant constant with `resolveScopedInstitutionId()` (server-resolved, never body-trusted) in:
  - `canteen/menu:32,55` (two inserts),
  - `visitors/pre-register:31`,
  - `visitors/pass/issue:16,19,30` (`instId` const → inserts `visitorPasses` for whichever tenant the caller *isn't*),
  - `vehicles/routes:8,27` (**GET filters + POST inserts** — every tenant currently reads/writes inst_001's fleet routes),
  - `vehicles/maintenance:8,41`,
  - `mobile/v1/visitors/sync:30` (gate-log inserts; has `visitor:verify` perm but ignores tenant).
  Verify no other literal tenant IDs remain: `rg`/grep gate — `grep -rn '"inst_00' src/app/api` must return only test fixtures (`services-security.test.ts`).
- `performance/goals:31-39`: derive target staff from session OR verify `body.staffId` is managed by caller **and** same institution before deriving institution from it. Same for `admin/performance/reviews:29-30`, `admin/leave-balances:37`, `chat/rooms/…participants:57`.
- **Accept:** unit tests asserting actor fields written to DB equal `session.staffId` regardless of body content.

---

## Phase 2 — P0 Backend (LOGIC-01 → LOGIC-03)

### LOGIC-01 — Payroll idempotency + disbursed guard
- `payroll-engine.ts:184-210`: add a schema unique index `idx_payroll_deduction_unique` on `(payrollRecordId, deductionType)` in `packages/db/schema.ts` **and** `schema.pg.ts` (parity!). Preferred fix (Qwen review): **upsert** the deductions with `onConflictDoUpdate` on that unique target — avoids destructive delete-then-insert on accounting records. If any legacy duplicate rows exist, one-time cleanup migration first (keep a deleted-rows snapshot for audit). Delete-then-insert is acceptable **only** inside a `db.transaction` and only for `draft` records.
- Wrap each staff's record+deductions writes (and ideally the whole batch loop) in `db.transaction(async (tx) => …)` so a mid-loop failure can't leave a record without deductions.
- Add disbursed guard: if existing record `status === "disbursed" || "approved"`, either skip it (return as-is) or 409 from `finance/payroll/generate` route listing locked periods. Default: **skip locked records, don't rewrite amounts.**
- **Accept:** run `generateMonthlyPayroll` twice for same `(inst, 2026, 10)` in a test → deduction rows count identical both runs; disbursed record untouched (amounts + status); simulated mid-batch failure leaves no orphaned records. Add regression tests for all three.

### LOGIC-02 — Exam schedule overlap detection
- `examinations/schedules/route.ts:34-54`: replace exact-`startTime` equality with interval overlap on same `examDate + roomNumber`: `existing.startTime < parsed.endTime AND existing.endTime > parsed.startTime`. **String comparison is only safe for zero-padded `HH:MM`** — enforce `/^([01]\d|2[0-3]):[0-5]\d$/` in `examScheduleCreateSchema` for `startTime`/`endTime` (reject anything else), and document the timezone policy (institution-local wall clock; no DST-ambiguous storage needed for pure `HH:MM` slots). Also:
  - Validate `endTime > startTime` in `examScheduleCreateSchema` (Zod refinement).
  - Add **instructor conflict** check (same `invigilator`/teacher id — extend schema if column missing; if not modeled, add `teacherId` optional column + check).
  - Scope GET/POST by tenant: verify `examExists.institutionId` matches caller scope; scope the conflict SELECT.
  - Fix ID: `sched_${randomUUID()}` instead of `Date.now()`.
  - Close TOCTOU: add unique index on `(examDate, roomNumber, startTime)` — partial/nullable-aware — so a race yields 409, not a double-booking; perform the conflict-check + insert inside one `db.transaction`.
- **Accept:** unit tests: 09:00–12:00 vs 10:00–11:00 same room → 400; adjacent 09:00–10:00 vs 10:00–11:00 → allowed; different rooms → allowed.

### LOGIC-03 — MerkleAuditLedger durability + integrity
- **Flush timer:** in `MerkleAuditLedger`, add `startFlushTimer(intervalMs = 5_000)` → `setInterval(() => this.flushAll().catch(log)).unref()`; start it lazily from `getInstance()` (guard for test env via `NODE_ENV === "test"`).
- **Shutdown drain:** `src/instrumentation.ts` — register `SIGTERM`/`SIGINT`/`beforeExit` handlers that call **one drain path**: stop the timer, then `await merkleAuditLedger.flushAll()` with a timeout guard — and make `flushAll` await any in-flight per-tenant flush (mutex below) so timer + shutdown can't run two concurrent drains (Qwen review).
- **Boot hydration atomicity:** initialize `latestHashCache` from the DB **before** the first flush/`enqueueInvocation` is accepted (an init promise/lock awaited by `flushPendingInvocations`) so a restart can't race the first write into a genesis-gap fork (Qwen review).
- **LOGIC-03b chain persistence:** `agent-store.ts`:
  - `listToolInvocations`: read **DB first** (`orderBy(asc(agentToolInvocations.createdAt))`, or better an explicit monotonic `seq` column), fall back to memory; merge strategy: DB is source of truth, memory holds unflushed rows.
  - `recordToolInvocation`: remove the silent `catch {}` — log + surface failure (at minimum `console.error` with structured event; better: re-queue for retry so the chain doesn't silently diverge).
  - On boot, hydrate `latestHashCache` from DB `getLatestAuditHash` (already DB-derived once list is DB-backed) so new entries link to pre-restart history instead of GENESIS.
- **Hash determinism:** make provisional hash use `entry.timestamp` exactly as flush does (compute `timestamp` once at enqueue, use it in both `merkle-ledger.ts:103` and `:125`), or mark provisional hashes explicitly as non-authoritative in the API contract.
- **Flush mutex:** add per-tenant `flushing: Promise` chain — concurrent `flushPendingInvocations(tenant)` awaits the in-flight flush (or serializes via a simple promise queue) so two flushes can't read the same `prevAuditHash`.
- **Accept:** tests — (1) enqueue buffered entries → simulated restart (new store instance reading same DB) → `verifyChainIntegrity` links to pre-restart genesis; (2) provisional hash === persisted hash for buffered path; (3) 100 concurrent flushes produce one valid unbroken chain (`pnpm test -- agent-security-governance`).

---

## Phase 3 — P1 (SEC-07, LOGIC-04, LOGIC-05, LOGIC-07)

### SEC-07 — Make scanners catch what this audit caught
- `scripts/security/tenant-isolation-scan.ts`: AST-walk `src/app/api/**/route.ts`; for every `.update(`/`.delete(` assert the enclosing `.where()` references `institutionId`/`tenantId` **or** the file proves fetch-verify ownership; fail on misses. Maintain `tenant-scan-allowlist.json` with per-site justification (target: empty).
  - **Two-stage rollout (Qwen review):** upgrading the scanner and fixing ~144 sites in one PR blocks CI red until SEC-04 fully lands. Stage A: merge the upgraded scanner with the full current finding set seeded into `tenant-scan-allowlist.json` (CI green, no new misses allowed). Stage B: burn down SEC-04 waves, removing allowlist entries per PR. Stage C: empty allowlist → scanner is a hard gate. Sequence it as its **own PR** right after SEC-04 Wave 1 starts, not bundled with the route fixes.
- `scripts/security/requireauth-permission-audit.ts` — from SEC-05.
- Optional: extend `rbac-permission-audit.ts` to also flag `requireAuth` calls whose handler writes without scope (heuristic), and keep `security:tenants`/`security:rbac` in the Phase-0 gate so regressions fail CI.

### LOGIC-04 — Deterministic, enforced tax rates
- `tax-rate-engine.ts:36-53`: add `.orderBy(desc(taxRateOverrides.effectiveFrom), desc(taxRateOverrides.createdAt))` — most recent specific override wins; document precedence. Add a partial unique index `(institutionId, category)` where `isActive = true` (or add explicit `priority` column) in both schema files; make `createOverride` reject duplicates for an active window (Zod + DB constraint).
- `calculateTax`: when `jurisdictionId` omitted, resolve the institution's **default jurisdiction** (add lookup: jurisdiction linked to institution or its region); only fall back to 0% if truly none — and return a `rateSource` field so callers/tests can see why.
- `finance/tax-rates/calculate/route.ts`: switch `resolveInstitutionId` → `resolveScopedInstitutionId`; ignore client `jurisdictionId` unless it matches the resolved scope (or drop the param entirely and always resolve server-side).
- **Accept:** tests — two overlapping overrides → deterministic (latest) wins; no jurisdiction → institution default, not 0; scoped user requesting foreign institution → 403.

### LOGIC-05 — Deterministic payroll inputs + status state machine
- `payroll-engine.ts:133-142`: filter structures `effectiveDate <= payPeriod` (derive period end date from `year`/`month`), `.orderBy(desc(payrollSalaryStructures.effectiveDate))`, and pick **one row per staff** (`group staffId` or take first after sort). Deterministic pay.
- Wire `taxBracketCode`: either implement bracket tables (new `taxBrackets` lookup + progressive calc) or remove the field from the API — do not ship a field that silently does nothing. Same honesty check for flat PT (`:56`).
- `updateRecordStatus`: enforce transitions `draft → approved → disbursed`, `draft/approved → voided`; forbid `disbursed → *` and skipping `approved`; require `approvedById` when `status === "approved"` (400 otherwise).
- **Accept:** tests — regenerating with 2 structures uses the latest effective one, twice in a row (deterministic); `draft → disbursed` direct → 400; missing approver → 400.

### LOGIC-07 — Timetable conflicts + tenant
- `academic/timetables/route.ts`:
  - Add **teacher conflict** check: same `teacherId + slotId + dayOfWeek` (excluding self on update) → 409. Add **room conflict** check on `roomNumber` similarly.
  - Trust order at `:113`: derive institution from `classId` first, then scope; **reject if body `institutionId` ≠ resolved scope**. Remove dead `session.institutionId` fallback (`:120`).
  - DELETE `:185-190`: scope where by `institutionId` (+ verify parent class scope).
  - Add unique index `(classId, slotId, dayOfWeek)` to close TOCTOU (both schema files).
- **Accept:** tests — same teacher double-booked → 409; foreign `institutionId` in body → 403/404.

---

## Phase 4 — P2 UI/UX

### UI-01 — Fix 10 stuck spinners (+5 medium, +4 low)
- For each file: move `setLoading(false)` into `finally`, or add `.catch()` that resets loading and surfaces an error state (use `<Alert>` or `toast.error()` per conventions):
  - **Batch A (checklists family):** `checklists/page.tsx:43-50`, `admin/checklists/page.tsx:33-40`, `admin/checklists/assignments/page.tsx:45-56`, `admin/checklists/assignments/[id]/page.tsx:48-58`, `admin/checklists/[id]/page.tsx:39-51`.
  - **Batch B:** `admin/leave-approvals/page.tsx:64-79`, `staff/[id]/edit/page.tsx:83-116`, `admin/shifts/page.tsx:69-84`, `admin/leave-types/page.tsx:42-49`, `admin/attendance-locations/page.tsx:60-70`.
  - **Batch C (medium):** `assets/page.tsx:152` (detail drawer), `recognition:73`, `grievances:53`, `canteen:92`, `media-library:111`.
  - **Batch D (low):** add `.catch` to the `.finally` chains in `timeline:70`, `reviews:92`, `admin/reviews:139`, `safety-status-canvas:19`.
- House pattern to apply consistently:
  ```ts
  useEffect(() => {
    let cancelled = false;
    loadData()
      .catch((e) => { if (!cancelled) toast.error("Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  ```
- **Accept:** jest component tests (or manual) simulating `fetch` rejection → loader resolves, error surfaced. Add an AST grep to CI later: flag `setLoading(true)` files whose loader lacks `finally`/`catch` (optional, stretch).
- **Scope note (Qwen review):** these pages are client components — the minimal `catch/finally` fix above is the release-scope fix. Migrating initial fetches to server components / `<Suspense>` streamers is architecturally cleaner but too invasive for a pre-release patch; log it as a post-release backlog item.

### UI-02 — Migrate raw overlays to Radix `<Dialog>`
- `admin/agents/page.tsx:318-356` (kill-switch — **highest priority**): move into shared `<Dialog>` (+ `AlertDialog` confirm for the destructive action), replace raw `<input>:333` with `<Input>`.
- `components/chat/add-user-modal.tsx:91`: same migration (focus trap, Escape, `aria-modal` come free).
- `diagnostics-button.tsx:84`: convert to `Popover`/`DropdownMenu`. `guided-tour.tsx:55`: adopt shared Dialog or document exception.
- **Accept:** `pnpm a11y:audit` passes; manual Escape/focus-trap check.

### UI-03 — Replace 10 hand-rolled loaders with `<Skeleton>`
- `approvals:130-137`, `assets:247`, `tasks:307`, `admin/checklists ×4`, `admin/shifts:134`, `analytics-charts.tsx:27`, `image-cropper.tsx:211` (`"Loading..."` → `<Skeleton>` or spinner-in-button).
- **Accept:** grep gate — no `animate-pulse` divs outside `components/ui/skeleton.tsx` in `(shell)` (stretch: add to CI).

### UI-04 — Semantic Badge variants (8)
- `announcements:232` → `variant="warning"`; `operations/supply:225` + `supply-cockpit-kpi-cards.tsx:74` → `variant="success"`; `staff/[id]/timeline:112` → `variant="warning"`; `vision-radar-tab.tsx:80` → `variant="destructive"`; `space-discovery-canvas.tsx:91-93` → drop raw hover colors (use variant hover styles).
- **Accept:** grep — no `(bg|text|border)-(green|red|amber|emerald|rose|blue)-` inside `<Badge …>` classNames.

---

## Phase 5 — P3 Mobile (Flutter)

### MOB-01 — Add `RefreshIndicator` to 28 files (P1 first)
- **Batch 1 (9 P1 screens):** wrap each primary scrollable with `RefreshIndicator(onRefresh: () => ref.read(provider.notifier).load()/refresh(), child: …)`:
  `admin_dashboard_screen.dart` (wrap outermost ListView at `:35` — the tab-scoped ones at `:148/:347/:440/:575` can share the screen-level indicator or get per-tab providers), `canteen_screen.dart:52`, `analytics_dashboard_screen.dart` (3 ListViews — wrap at scrollview root), `technician_workorder_screen.dart:66` (keep AppBar button, add pull), `federated_edge_scanner_screen.dart:26`, `campus_resource_booking_screen.dart:19`, `nfc_tag_management_screen.dart` (3 tabs), `availability_screen.dart:41`, `leave_balance_screen.dart:28`.
- **Batch 2 (5 P2):** `crash_logs_screen.dart`, `student_roster_screen.dart`, `ev_smart_charge_screen.dart`, `campus_map_screen.dart`, `more_screen.dart:93` (static — either add no-op refresh or document exemption).
- **Batch 3 (14 P3):** detail/form screens — wrap where a remote reload is meaningful; exempt pure forms (`booking_create`, `grievance_submit`, `report_create`) and horizontal chip lists with documented justification.
- Convention: `onRefresh` must call a real provider refresh (not `Future.value()`); `AppScaffold` does not inject indicators, so wrap at screen level.
- **Boilerplate reduction (Qwen review):** for the ~28-file sweep, first extract a shared `RefreshableScreen`/`BaseScreen` widget (wraps `RefreshIndicator` + optional shimmer/error branches) in `lib/shared/widgets/`, then convert screens by swapping their scrollable root — much cheaper than 28 hand-rolled wrappers. Keep hand edits only where the widget shape doesn't fit (multi-ListView tabs).
- **Accept:** `flutter analyze` 0 issues; grep gate — every `ListView(` in `lib/features/**` is within a `RefreshIndicator` or in an allowlist file.

### MOB-02 — Error/loading state gaps
- Add error branches (per `leave_balance_screen.dart:19-40` reference): `admin_dashboard_screen.dart`, `canteen_screen.dart`, `campus_resource_booking_screen.dart` — render `AppErrorWidget(onRetry:)` when state has error.
- Replace bare `Text('Error…')` with `AppErrorWidget(onRetry:)`: `technician_workorder:184`, `federated_edge_scanner:25`, `hall_ticket:30`.
- Replace raw `CircularProgressIndicator` with `PageShimmer`: `campus_resource_booking:18`, `federated_edge_scanner:23`, `technician_workorder:183`, `hall_ticket:29`.
- **Accept:** `flutter analyze && flutter test` green; manual failure-mode pass (airplane mode → error + retry visible).

---

## Phase 6 — Release gate

| Gate | Command | Required result |
|---|---|---|
| Types | `pnpm typecheck` | 0 errors |
| Lint | `pnpm lint` | 0 errors (no new warnings) |
| Unit/integration | `pnpm test` | all green incl. new regression tests |
| RBAC scan | `pnpm security:rbac` | exit 0 |
| Tenant scan (upgraded) | `pnpm security:tenants` | exit 0, empty allowlist |
| RequireAuth scan (new) | `pnpm security:requireauth` | exit 0 |
| Gateway scan | `pnpm gateway:scan` | 100% shielded |
| A11y | `pnpm a11y:audit` | pass |
| Mobile | `flutter analyze && flutter test` | 0 issues |
| Manual smoke | login as each of 5 tiers; cross-tenant negative tests (inst_A token → inst_B row id → 404); payroll generate ×2; exam double-book attempt; kill-switch modal keyboard test | as specified |

**Definition of Done:** every ID in `reports/pre-release-deep-audit-final.md` is fixed, covered by at least one regression test (P0/P1) or grep gate (P2/P3), and all Phase-6 gates pass. SEC-07/requireauth scans stay in CI permanently so these findings cannot silently regress.

---

## Sequencing & effort sketch

| Phase | Findings | Suggested order | Effort | Notes |
|---|---|---|---|---|
| 0 | — | first | 0.5 d | baseline + branch |
| 1 | SEC-01…06 | immediately | 5 d | SEC-04 Wave 1 is the largest single chunk — split into its own PR per wave |
| 2 | LOGIC-01…03 | with Phase 1 | 3 d | LOGIC-01/02 are small and money-critical — can land first |
| 3 | SEC-07, LOGIC-04/05/07 | after Phase 1–2 | 3 d | SEC-07 scanner lands as **Stage A** (allowlist seeded) in its own PR, then burns down with SEC-04 waves; `pnpm security:tenants` becomes a hard gate only at Stage C (empty allowlist) |
| 4 | UI-01…04 | parallel track | 3 d | independent of backend; UI-01 Batch A/B first (user-visible) |
| 5 | MOB-01/02 | parallel track | 3 d | independent; Batch 1 first; shared `RefreshableScreen` widget first |
| 6 | all | last | 2 d | full gate + Edge/`next build` check for SEC-01 |

**Total ≈ 19–20 days** (matches the local-ollama reviewer's independent estimate).

---

## Plan review record (AGENTS.md review rule)

Reviewed by three reviewers after first draft; feedback triaged as below.

| Reviewer | Method | Outcome |
|---|---|---|
| **Qwen** (ollama `qwen3.6`) | plan piped via stdin | 14 substantive points — **11 adopted**, 3 logged as stretch/backlog (details below) |
| **OpenCode / local-ollama routing** (ollama `qwen2.5-coder`) | plan piped via stdin | Confirmed structure; independent effort estimate ≈20 days (adopted in sequencing table); content largely echoed the plan |
| **Claude Code** (`claude -p --tools none`) | plan piped via stdin | Generic checklist review — regression tests, error handling/logging, rate limiting, CI/CD gates. Rate limiting **adopted** (added to SEC-02); remainder already covered by Phases 0/6 |
| **Antigravity** (independent cross-analysis of Devin + opencode reports) | claim-by-claim verification against codebase | ~90% already matched this plan (SEC-01…06, LOGIC-01…03, B4-B6≡LOGIC-04/05/07, U1-4≡UI-01…04, M1-2≡MOB-01/02, incl. `canAccessStaff()` for staff DELETE and `CRON_SECRET_ROUTES` + `role: "system"` machine identity). **New, verified & adopted:** the hardcoded `inst_001` cluster (8 sites in 6 files beyond `canteen/passes`) — merged into SEC-06. **Superseded:** its delete-then-insert payroll fix (Qwen's upsert preference now canonical); its claim that all items were unaddressed reflected a stale view of this plan. |

**Adopted from Qwen:** upsert over delete-then-insert for payroll deductions · `db.transaction` around payroll/exam multi-writes · zero-padded `HH:MM` Zod enforcement + timezone policy · single shutdown drain path awaiting in-flight flush · Merkle boot hydration lock before first accepted write · scanner rejects non-literal permission args · two-stage scanner rollout (allowlist → strict gate) · `scopedDb()` wrapper as post-release stretch · RSC/Suspense migration deferred to backlog · shared `RefreshableScreen` widget for mobile sweep · typed permission registry + dev-time query hook logged as post-release hardening.

**Rejected/deferred (with rationale):** `db.transaction` for all Phase 3 money writes deferred where single-statement (SQL-level atomicity already applies); Edge `jose` WebCrypto handled as an explicit build/verify step in SEC-01 + Phase 6 gate rather than an assumption.
