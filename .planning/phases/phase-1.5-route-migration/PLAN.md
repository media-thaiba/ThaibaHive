# Phase 1.5: Physical Legacy-Route Migration — "Legacy URLs Redirect, Workspaces Own the File Tree"

**Milestone**: ThaibaHive Two-Tier Platform
**Phase**: 1.5 of 5
**Status**: ✅ Complete (2026-10-06) — implementation, verification, and full e2e matrix green
**Estimated Duration**: 1-2 days
**Dependencies**: Phase 1.4 (Web Workspaces, bridge-redirect variant — `PLAN.md` Deviation #1 defers exactly this work)

---

## Objective

Physically move all legacy top-level route folders in `src/app/(shell)/` into their owning
workspace folder, **invert the redirect direction** (legacy → workspace, 308 permanent), complete
the workspace navigation IA (orphan pages that vanished from the sidebar in Phase 1.4), and flip
the guard test so CI enforces "every nav target is a real route".

**End state**: `/my-work/attendance` is a real folder; `/attendance` is a 308 redirect to it.
No page lives outside the 4 workspaces (except explicitly parked areas).

---

## Confirmed Decisions (User, 2026-10-06)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Migration style | **Physical move, single pass** on one branch (low coupling justifies it) |
| D2 | Orphan page IA | **Adopt proposed mapping** (full table below); collision pages stay at legacy paths |
| D3 | Root dashboard `/` | **Keep as-is** (role-aware overview; no redirect) |
| D4 | Playwright e2e | **Update specs to canonical workspace URLs** + add one redirect-assertion spec |

## Plan Review (AGENTS.md rule)

Qwen (`ask_qwen`) / OpenCode / Claude Code MCP tools are **not available in this session** —
substituted with 2 independent reviewer subagents (fresh context, different focus:
code-correctness vs completeness/IA). Findings incorporated into this v2; see
`Review Findings` appendix.

---

## Route Inventory (corrected after review)

- **36 top-level legacy page folders** under `(shell)` outside the 4 workspaces:
  **33 move**, **1 deleted** (`media` — one-line re-export wrapper of `media-library`),
  **2 stay** (`checklists`, `reviews` — route collisions, D2).
- Plus 4 admin-internal renames (`nfc→hardware`, `audit-logs→audit`, `security/identity→keys`,
  promote `zero-trust` page) and 1 dashboard merge (`academic/page.tsx` → `school/page.tsx`).
- Out of scope (stay): `portal/`, `parent/`, `research/`, `workspace/`, root dashboard (D3).
- `WORKSPACE_REDIRECTS` has **28 entries** (not 27).
- Reference hotspots (corrected): ~16 `href="…"` literals in shell pages (≥8 legacy),
  **4 `router.push(legacy)`** (`tasks/new/page.tsx:86`, `academic/students/page.tsx:86`,
  `academic/students/new/page.tsx:54`, `staff/new/page.tsx:128`), `window.location.href`
  (`examinations/page.tsx:24`), **~11 template-literal hrefs** (backticks — invisible to
  `href="` grep), **2 absolute import-path hotspots**, Apple AASA **8 legacy paths**,
  e2e **~159 refs across ~26 files**, docs 34 refs, seed `routePrefix` 14 entries
  (1 dead: `/notifications`), Flutter 0 web-route refs (only `/share/:token` handoff).
- `isPhaseOnePath` / `ENABLED_PATHS` / `getWorkspaceForPath`: **dead code** (zero external
  refs; only comment mention at `sidebar-nav.tsx:209`) → delete all three.

---

## Move Table (authoritative)

> Every move = `git mv "src/app/(shell)/<src>" "src/app/(shell)/<dst>"` — whole folder
> (takes colocated `_components/`, `loading.tsx`, `error.tsx`, `layout.tsx` etc.).
> Paths contain `(shell)` → **always quote** in PowerShell.
> Collision pre-check executed and reviewer-verified: target dirs don't exist.

### My Work — 17 folders

| Legacy | → Workspace route |
|---|---|
| `attendance` | `my-work/attendance` |
| `tasks` (incl. `new`, `[id]`) | `my-work/tasks` |
| `leaves` | `my-work/leaves` |
| `reports` | `my-work/reports` |
| `approvals` (incl. `delegations`) | `my-work/approvals` |
| `timeline` | `my-work/timeline` |
| `canteen` | `my-work/canteen` |
| `expenses` | `my-work/expenses` |
| `availability` | `my-work/availability` |
| `recognition` | `my-work/recognition` |
| `grievances` | `my-work/grievances` |
| `announcements` | `my-work/announcements` |
| `events` | `my-work/events` |
| `circulars` | `my-work/circulars` |
| `polls` | `my-work/polls` |
| `chat` | `my-work/chat` |
| `settings` (personal: profile/password/notifications) | `my-work/settings` |

### School — 2 top-level sources (7 moves)

| Legacy | → Workspace route | Note |
|---|---|---|
| `examinations` | `school/examinations` | includes `tabulation` (Web-only, anti-scope OK) |
| `examinations/report-cards` | `school/grades` | **special**: move AFTER parent: `git mv school/examinations/report-cards school/grades` |
| `academic/students` (incl. `new`) | `school/students` | |
| `academic/classes` | `school/classes` | |
| `academic/academic-years` | `school/academic-years` | |
| `academic/timetable` | `school/timetable` | |
| `academic/page.tsx` | **merge into `school/page.tsx`** | `school/page.tsx` is a **mock** (hardcoded "1,234", `school/page.tsx:33`); `academic/page.tsx` is real-data (fetches `/api/academic/*`) → replace mock content, then delete `academic/` |

### Operations — 11 folders (+1 deletion)

| Legacy | → Workspace route | Bridge canonical / note |
|---|---|---|
| `finance` (incl. `tax`, `purchases`, `payroll`, `reconciliation`) | `operations/finance` | `/operations/finance*` |
| `vehicles` | `operations/fleet` | `/operations/fleet` |
| `assets` | `operations/assets` | `/operations/assets` |
| `purchases` | `operations/procurement` | `/operations/procurement` |
| `help-desk` | `operations/facilities` | `/operations/facilities` |
| `bookings` | `operations/bookings` | **was missing from v1 — reviewer catch**; facilities desc covers room bookings; add nav item |
| `accounts` | `operations/accounts` | orphan → new nav item |
| `finance-audit` | `operations/finance-audit` | orphan → new nav item |
| `finance-requests` | `operations/finance-requests` | orphan → new nav item |
| `visitors` | `operations/visitors` | orphan → new nav item |
| `media-library` | `operations/media-library` | orphan → new nav item |
| `media` | **DELETE folder** | `media/page.tsx:1` is a one-line re-export of `media-library`; redirect `/media/:path*` → `/operations/media-library/:path*` (canonicalize instead of creating a duplicate wrapper). Route-boundaries test import must be adjusted (step 10) |

### Administration — 3 moves + 4 renames

| Legacy | → Workspace route | Note |
|---|---|---|
| `staff` (incl. `new`, `performance`, `[id]/{page,edit,timeline}`) | `admin/staff` | |
| `marketplace` | `admin/marketplace` | |
| `docs` | `admin/docs` | |
| `admin/nfc` | `admin/hardware` | rename (bridge `/admin/hardware`) |
| `admin/audit-logs` | `admin/audit` | rename (bridge `/admin/audit`) |
| `admin/security/identity` | `admin/keys` | rename (bridge `/admin/keys`) |
| `admin/security/zero-trust/*` | **promote to `admin/security/page.tsx`** | `admin/security/` has 6 subdirs, no own page; `zero-trust/` contains only `page.tsx` (verified) → move it up; `gateway/orchestration/predictive-resilience/threat-intel` untouched |

### Stays at legacy path (D2 collisions & out-of-scope)

- `checklists` — `admin/checklists` already exists (different page). Later merge candidate.
- `reviews` — `admin/reviews` + `admin/performance` exist. Debt: 3 review pages to merge later.
- `portal/`, `parent/`, `research/`, `workspace/` — out of scope.
- Root `(shell)/page.tsx` — D3 keep (its legacy links are redirect-covered).

---

## Redirect Table (invert the bridge)

Delete `WORKSPACE_REDIRECTS` (all 28 entries resolve physically after moves; the 2 bogus targets
are removed nav items — see Nav Changes). Add `async redirects()` to `next.config.ts`
(`headers()` exists only today), `permanent: true` (308).

**Order matters — array order, first match wins. Specific rules first:**

| # | source | destination |
|---|---|---|
| 1 | `/examinations/report-cards/:path*` | `/school/grades/:path*` |
| 2 | `/examinations/:path*` | `/school/examinations/:path*` |
| 3 | `/academic/:path*` | `/school/:path*` |
| 4 | `/admin/security/identity/:path*` | `/admin/keys/:path*` |
| 5 | `/admin/security/zero-trust` | `/admin/security` |
| 6 | `/admin/nfc/:path*` | `/admin/hardware/:path*` |
| 7 | `/admin/audit-logs/:path*` | `/admin/audit/:path*` |
| 8-24 | `/{attendance,tasks,leaves,reports,approvals,timeline,canteen,expenses,availability,recognition,grievances,announcements,events,circulars,polls,chat,settings}/:path*` | `/my-work/…/:path*` |
| 25-36 | `/finance/`, `/finance-audit/`, `/finance-requests/`, `/accounts/`, `/purchases/`, `/assets/`, `/vehicles/`, `/help-desk/`, `/bookings/`, `/visitors/`, `/media-library/` each `:path*` | `/operations/{finance,finance-audit,finance-requests,accounts,procurement,assets,fleet,facilities,bookings,visitors,media-library}/:path*` |
| 37 | `/media/:path*` | `/operations/media-library/:path*` (folder deleted) |
| 38-40 | `/{staff,marketplace,docs}/:path*` | `/admin/{staff,marketplace,docs}/:path*` |

Notes (reviewer-verified against bundled Next docs):
- Route order is **headers → redirects → proxy** (`src/proxy.ts` is the Next-16 middleware
  replacement; there is no `src/middleware.ts`) → unauthenticated legacy URLs yield a real
  **308 before auth** — curl smoke test is deterministic (risk row closed).
- `:path*` = zero or more segments → `/attendance` and `/a/b` both covered.
- Segment-anchored matching: `/finance/:path*` cannot match `/finance-audit`;
  `/media/:path*` cannot match `/media-library` → no ordering hazard there.
- Covers dynamic deep links, DB `routePrefix` values (seed), bookmarks, docs, dashboard cards.

Single source of truth: `src/lib/navigation/legacy-redirects.ts` exporting `LEGACY_REDIRECTS`,
imported **relatively** (`./src/lib/legacy-redirects`) by `next.config.ts` (precedent:
`next.config.ts:4` already imports a TS module) and by the guard test. Fallback if config import
trips: inline in `next.config.ts` + snapshot-compare in test.

---

## Nav IA Completion (`src/config/navigation.ts`)

Orphans vanished from the sidebar during the Phase 1.4 rewrite — restore per D2:

**Add to `myWorkItems`** (open to all authenticated — My Work convention, no `roles`/`permission`):
Announcements, Events, Circulars, Polls, Chat, Expenses, Availability, Recognition, Grievances,
Settings → **+10** (8 → 18).

**Add to `operationsItems`** (roles `["accounts","purchase","admin","super_admin","principal"]`,
no `permission` keys — avoids RBAC snapshot drift): Accounts, Finance Audit, Finance Requests,
Visitors, Media Library, Bookings → **+6** (10 → 16).
- Differentiate icons: existing "Purchase Approvals" and "Procurement" both use `ShoppingCart`
  (`navigation.ts:123,128`) → give Procurement a different icon (e.g. `Store`/`Boxes`).

**Add to `adminItems`** (exact role arrays, per reviewer): Staff Directory
`roles: ["admin","super_admin","regional_admin"]`, Marketplace `roles: ["admin","super_admin"]`,
Documentation `roles: ["admin","super_admin","regional_admin"]` → **+3**.

**Fix 2 buggy Phase 1.4 items (repoint, not delete — reviewer finding):**

| Item | Problem | Action |
|---|---|---|
| `/admin/tenant` ("Tenant Settings … feature flags") | No tenant-settings page exists anywhere; bridge pointed it at `/settings` = **personal** settings (wrong page). BUT `admin/page.tsx:13` quick-action card also links `/admin/tenant` | **Repoint href → `/admin/institutions`** (real page, h1 "Institutions"), label "Institutions & Tenant Settings", desc trimmed to what the page does; fix the quick-action card route too (otherwise 404 via catch-all) |
| `/school/attendance` ("Student Attendance") | No student-attendance page exists anywhere; bridge pointed at `/attendance` = **staff** attendance. Repoint candidates (`admin/attendance-locations` = location config; `school/classes` = rosters) are semantically wrong | **Remove nav item**; log gap "Student attendance UI not built" |

**Cleanup:**
- Delete `ENABLED_PATHS`, `isPhaseOnePath`, **and `getWorkspaceForPath`** (all dead, zero refs).
- Update admin workspace description (`navigation.ts:82`) — remove stale "tenant settings" copy.
- ~10 new lucide icon imports needed (e.g. `Megaphone`, `MessageSquare`, `Receipt`,
  `AlertTriangle`, `BookOpen`, `Vote`, `Store`, `Boxes`, `CalendarRange`) — typecheck catches misses.
- Footer `/settings` links (`shell-nav.tsx:229,258`) → `/my-work/settings` (dedupe with new nav item).

---

## Guard Test (replace the Phase 1.4 test)

Replace `src/lib/navigation/__tests__/workspace-redirects.test.ts` (new→legacy) with
`legacy-redirects.test.ts`:

1. **Nav completeness**: every `allNavItems` href + 4 workspace roots resolves to a real
   `page.tsx` on disk (fs check, same technique as the existing test).
2. **No shadowed pages**: no `LEGACY_REDIRECTS` source prefix still has a physical `page.tsx`
   (redirects run *before* filesystem — leftovers would be silently shadowed).
3. **Targets exist**: every `to` resolves physically (catch-all must not be the target).
4. **No loops**: `from` ≠ `to`; no `to` equals another `from` (wildcard-stripped).
5. **Coverage**: every top-level `(shell)` folder outside workspaces is either a
   `LEGACY_REDIRECTS` source or on the allowlist: `checklists, reviews, portal, parent,
   research, workspace`.

Catch-all `[...slug]` pages: **keep**, simplified to plain `notFound()` (safety net, not bridge).
Exactly 4 catch-alls import `WORKSPACE_REDIRECTS` (verified) — update imports in same commit.

---

## Implementation Steps (branch `feat/phase-1.5-route-migration`)

1. **Prep**: clean `git status`, branch off `master`.
2. **Moves — My Work**: 17 `git mv`s.
3. **Moves — School**: examinations → school; report-cards → grades; 4 academic subfolder moves;
   merge academic dashboard into `school/page.tsx` (replace mock); delete `academic/`.
4. **Moves — Operations**: 11 `git_mv`s + **delete `media/`**.
5. **Moves — Admin**: 3 moves + `nfc→hardware`, `audit-logs→audit`, `security/identity→keys`,
   promote `zero-trust` page.
6. **Import-path fixes in the SAME commit as moves** (reviewer catch — breaks typecheck/tests):
   - `src/stores/vehicle-store.ts:2` → `@/app/(shell)/operations/fleet/_components/types`
   - `src/lib/__tests__/route-boundaries.test.tsx:17-34` — 10 imports of
     `tasks|attendance|finance|media|admin/nfc` `loading|error` files → new paths;
     for `media` (deleted) point at `operations/media-library` loading if present, else drop the case.
7. **Redirects**: create `legacy-redirects.ts`; add `redirects()` to `next.config.ts`
   (specific rules before folder wildcards; relative import).
8. **Bridge removal**: delete `workspace-redirects.ts`; simplify the 4 catch-alls to `notFound()`.
9. **Nav IA**: +19 items, repoint `/admin/tenant`, remove `/school/attendance`, delete dead
   helpers (`isPhaseOnePath`, `ENABLED_PATHS`, `getWorkspaceForPath`), fix admin blurb copy,
   footer `/settings` links, icon imports, Procurement icon differentiation.
10. **Reference sweep** — pattern set must cover: `href="…"`, `` href={`…`} ``,
    `router.push(…)`, `redirect(…)`, `window.location`, **`from "@/app/(shell)` imports**,
    plain string arrays:
    - Known edits: `/approvals/delegations` → `/my-work/approvals/delegations`;
      `/staff/new` → `/admin/staff/new`; `/tasks/new` → `/my-work/tasks/new`;
      footer `/settings` → `/my-work/settings`;
      root dashboard template links (`(shell)/page.tsx:181` `` `/staff/${id}/edit` ``) and
      `staff/[id]/page.tsx:127-128`, `tasks/page.tsx:116`, `staff/page.tsx:95`,
      `active-tasks-panel.tsx`, `attendance-widget.tsx`, `focus-links.tsx`,
      `user-avatar-dropdown.tsx`, `engage/conversational/dialog-manager.ts:94-102`,
      `knowledge-retriever.ts:22` → canonical (all redirect-covered even if missed, but
      canonicalize while touching).
    - **Apple AASA**: `src/app/.well-known/apple-app-site-association/route.ts:11-18` —
      8 legacy paths (`/leaves`, `/tasks`, `/announcements`, `/approvals`, `/events`,
      `/reports`, `/assets`, `/marketplace`) → canonical. **Redirects do NOT apply to AASA
      payloads** — must edit.
    - `src/db/seed.ts` `routePrefix` → canonical (drop dead `/notifications` prefix).
    - `scripts/build-analyze.js:93` route string → cosmetic, update.
    - `dialog-manager.ts` `url: '/academics/exams'` — pre-existing 404, not in redirect table;
      fix or leave (note in PR).
11. **E2E (D4) — scope corrected (reviewer: ~159 refs / ~26 files, CI runs Playwright):**
    - Update all legacy navigations/assertions to workspace URLs across `e2e/*.spec.ts`
      (`goto` ~65 refs / 23 files; `toHaveURL("/media")` → `/operations/media-library`, etc.).
    - Helper lives at **`e2e/helpers/role-gating-page.ts`** (not `e2e/role-gating-page.ts`):
      sidebar hrefs (:33-76) + `NAV_VISIBILITY_MATRIX` (36 legacy keys, :311-357).
    - **Re-derive, don't mechanically repoint, the RBAC matrix**: sidebar renders only the
      *current* workspace's items (`sidebar-nav.tsx:35,117`), so matrix assertions must
      workspace-switch (`goto` + tab / `Ctrl+Shift+N`) per role, and expectations must match
      the new `roles` filters (e.g. marketplace admin-only vs old staff=true;
      procurement excludes `staff`). Also fix pre-existing staleness: helper looks for
      `nav[aria-label="Sidebar navigation"]` but sidebar renders
      `aria-label={`${currentWorkspace.label} navigation`}` (`sidebar-nav.tsx:100`).
    - New `e2e/legacy-redirects.spec.ts`: assert 308 + `location` via
      `page.request.get(url, { maxRedirects: 0 })` (goto auto-follows 308) for a sample per
      workspace + `/examinations/report-cards` + one dynamic `/tasks/x` + `/media`.
12. **Docs (low priority)**: 34 refs in `docs/` + README — redirects keep them valid; update
    high-traffic route tables only, ticket the rest.
13. **Verification** (below), fix, PR (CI: lint/typecheck/rbac/tests/build/migrations **and
    Playwright** — branch head must be fully green).

Suggested commits: (1) moves + import-path fixes, (2) redirects + bridge removal,
(3) nav IA + guard test, (4) refs + e2e. Commits 1-3 are only jointly green — acceptable on a
feature branch, CI runs at head.

### Completion Record (2026-10-06)

| Commit | Steps | Contents |
|---|---|---|
| `a2e39e6e` | 2-6 | Physical moves (33 folders), deletions/renames, import-path fixes |
| `e786f345` | 7-8 | `legacy-redirects.ts` + `next.config.ts` `redirects()` (legacy → workspace 308); bridge removed, catch-alls → `notFound()` |
| `5cddba62` | 9 | Nav IA: +19 items, dead helpers deleted, guard test flipped (179/179) |
| `42248db9` | 10 | Reference sweep — 23 files / 58 refs (incl. AASA 8 paths, seed `routePrefix`, template literals, `router.push`) |
| `a9277119` | 11 | E2E D4 — 26 spec files to canonical URLs, `role-gating-page.ts` matrix re-derivation, new `legacy-redirects.spec.ts` (46 assertions) |
| `7bac87d5` | 13 | E2E stabilization — attendance cross-worker state lock, serial marketplace/media, tasks SQLITE_BUSY retry, presence-sync LOGIN row, `build-analyze.js` route string |

Step 12 (docs): done for `scripts/build-analyze.js`; `docs/` + README route tables left as
Known Gap #8 (redirects keep old refs valid).

---

## File Changes Summary

| File | Action |
|---|---|
| `src/app/(shell)/{33 folders}` | **Move** (tables above) |
| `src/app/(shell)/media/` | **Delete** (re-export wrapper) |
| `src/app/(shell)/admin/{nfc,audit-logs,security/{identity,zero-trust}}` | **Rename/promote** |
| `src/app/(shell)/school/page.tsx` | **Edit** — real academic dashboard replaces mock |
| `src/app/(shell)/academic/` | **Delete** after merge |
| `src/app/(shell)/admin/page.tsx` | **Edit** — `/admin/tenant` quick-action card repointed |
| `next.config.ts` | **Edit** — add `redirects()` from `LEGACY_REDIRECTS` |
| `src/lib/navigation/legacy-redirects.ts` | **Create** |
| `src/lib/navigation/workspace-redirects.ts` | **Delete** |
| `…/__tests__/workspace-redirects.test.ts` | **Replace** → `legacy-redirects.test.ts` |
| `src/app/(shell)/**/[...slug]/page.tsx` (4) | **Simplify** → `notFound()` |
| `src/config/navigation.ts` | **Edit** — +19 items, 1 repoint, 1 removal, dead-code delete |
| `src/stores/vehicle-store.ts` | **Edit** — import path (step 6) |
| `src/lib/__tests__/route-boundaries.test.tsx` | **Edit** — 10 import paths (step 6) |
| `src/db/seed.ts` | **Edit** — `routePrefix` canonical, drop `/notifications` |
| `src/app/.well-known/apple-app-site-association/route.ts` | **Edit** — 8 paths (step 10) |
| `src/components/layout/shell-nav.tsx` | **Edit** — footer settings links |
| `src/app/(shell)/**` + `src/components/**` + `src/engage/**` | **Edit** — reference sweep |
| `e2e/**` (~26 files) | **Edit** — workspace URLs + matrix re-derivation |
| `e2e/legacy-redirects.spec.ts` | **Create** |

---

## Verification

1. `pnpm typecheck` → 0 errors (incl. vehicle-store + route-boundaries fixes)
2. `pnpm lint` → 0 errors (11 pre-existing warnings)
3. `pnpm test` → all suites green incl. new `legacy-redirects.test.ts`
4. `pnpm test:permissions-snapshot` + `pnpm security:rbac` → 0 drift (roles-only nav additions)
5. `pnpm build` → route table shows real routes under all 4 workspaces; no legacy page routes;
   `scripts/build-analyze.js` note updated
6. Dev smoke (`pnpm dev`):
   - `curl.exe -s -o NUL -w "%{http_code} %{redirect_url}" http://localhost:3199/attendance` →
     `308 …/my-work/attendance` (1 sample/workspace + `/examinations/report-cards` +
     `/admin/nfc` + `/media` + `/bookings`). Deterministic: redirects run before proxy.
   - Browser (logged in): sidebar shows restored orphans in correct workspaces; `Ctrl+K` finds
     them; `Ctrl+Shift+1-4` works; legacy URL lands on workspace URL; admin dashboard
     "Institutions & Tenant Settings" card works; footer Settings works.
7. `pnpm test:e2e` → updated specs green (incl. re-derived RBAC matrix) + new redirect spec
8. Flutter: untouched (only `/share/:token` handoff, custom-scheme deep links unaffected) —
   skip `flutter analyze` unless a Dart file was accidentally touched

### Verification Results (2026-10-06, all executed)

1. ✅ `pnpm typecheck` → 0 errors
2. ✅ `pnpm lint` → 0 errors (11 pre-existing warnings, `global-error.tsx`)
3. ✅ `pnpm test` → 776/776 suites green (4748 passed / 8 skipped)
4. ✅ `pnpm security:rbac` → 100% route permission mapping (0 unmapped);
   `pnpm test:permissions-snapshot` → 12/12
5. ✅ `pnpm build` → success (`next build --webpack`, standalone); route strings in
   `scripts/build-analyze.js` canonicalized
6. ✅ Redirect smoke (standalone server) → 31 legacy paths → 308 with correct
   `location`; auth allowlist → 307
7. ✅ `pnpm test:e2e` per project (mirrors CI matrix jobs, run sequentially):
   - **chromium 247/247 · firefox 247/247 · webkit 246 passed + 1 skipped**
     (presence-sync excluded on webkit by design)
   - Stabilization required for full parallel suite: cross-worker attendance-state
     lock, serial mode for `marketplace`/`media` (per-test re-seed of shared rows),
     `tasks` cleanup busy-retry, direct LOGIN activity row in `presence-sync`
     (see commit `7bac87d5`)
8. ✅ Flutter untouched

**CI note**: baseline `audit/final` unit job is red on a pre-existing flaky perf test
(`sprint-016-performance.test.ts`), which skips the downstream Playwright job — no CI e2e
baseline exists; local per-project runs above substitute for it. CI Playwright runs
`db:migrate` only (no `db:seed`) — local verification mirrored that state.

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Redirect rule ordering shadows a page | Medium | High | Specific-first order + guard tests #2/#3 |
| Leftover physical page silently shadowed by its redirect | Medium | High | Guard test #2 fails CI |
| Nav item without physical page | Medium | Medium | Guard test #1 (fs check on every href) |
| **Import-path breakage** (`vehicle-store`, `route-boundaries`) | **Certain** | High | Step 6 same-commit fixes; typecheck/jest gate |
| **E2E under-scoped (~159 refs, matrix needs re-derivation)** | **Certain** | High | Step 11 corrected scope; CI runs Playwright at head |
| Missed string/template reference | Medium | Medium | Step 10 multi-pattern sweep (incl. backticks, AASA, imports) |
| AASA deep links stay stale (redirects don't apply) | Certain if missed | Medium | Step 10 explicit AASA edit |
| Academic dashboard merge regresses real stats | Low | Medium | Port real-data page wholesale; diff before/after |
| Single-pass blast radius (33 folders) | Medium | Medium | Logical commits, guard tests, full verification, branch revert rollback |
| 308s cached permanently by browsers after rollback | Low | Low | Revert restores bridge; clients may hop 308 → bridge → legacy (harmless) |

## Rollback

Single branch, no DB migrations → `git revert` merged PR. Redirects revert atomically with it;
browser-cached 308s land on the restored bridge which still serves the page (harmless extra hop).

---

## Known Gaps Logged (out of scope)

1. Student attendance UI never exists — nav item removed.
2. `/admin/tenant` repointed to `/admin/institutions` — a true tenant-settings page
   (branding/feature flags) still needs building.
3. Performance-review triplication (`/reviews`, `/admin/reviews`, `/admin/performance`).
4. Checklist duplication (`/checklists` vs `/admin/checklists`).
5. `portal/`, `parent/`, `research/`, `workspace/[role]` remain outside workspaces (Phase 2 IA).
6. Dead seed prefix `/notifications` dropped; Notifications app link in seed is stale data (pre-existing).
7. `dialog-manager.ts` `/academics/exams` URL 404s (pre-existing, not in redirect table).
8. Docs/README route tables stale (redirects cover) — ticket for later.

---

## Review Findings (incorporated into v2)

Both subagent reviewers (substituting unavailable Qwen/OpenCode/Claude MCP tools) converged on:

- **CRITICAL**: `bookings/` folder missing entirely from v1 (now: operations/bookings + nav + redirect); import-path hotspots missing from sweep (`vehicle-store.ts:2`, `route-boundaries.test.tsx:17-34`); `/admin/tenant` quick-action card at `admin/page.tsx:13` would 404 (now repointed with nav item).
- **IMPORTANT**: e2e scope understated ~4-6× (159 refs/26 files; `e2e/helpers/` path; CI runs Playwright; RBAC matrix must be re-derived per workspace+role, not repointed — sidebar shows one workspace at a time); `media` wrapper duplication (now: folder deleted, canonicalized to media-library); inventory arithmetic (36 top-level legacy dirs: 33 move/1 delete/2 stay; bridge = 28 entries); AASA 8 paths; template-literal + `router.push` refs exist (v1 claimed 0); seed `/notifications` dead prefix; footer `/settings` duplication; admin roles need exact arrays; icon imports note.
- **Verified correct**: all collision pre-checks; all 28 bridge inversions; the 2 bogus bridge targets (`/school/attendance`, `/admin/tenant`); settings=personal, school-page=mock, academic-page=real; redirects-before-proxy ordering (docs-verified, `src/proxy.ts`); `:path*` zero-segment matching; guard-test feasibility; catch-all simplification safety; zero scanner/permission-test collateral; Flutter untouched.

## Sign-Off

- [x] Plan review (AGENTS.md rule — MCP tools unavailable; 2 reviewer subagents used, findings above)
- [ ] Tech Lead: move table + redirect table reviewed
- [x] Security: no permission-key changes (roles-only nav additions; `security:rbac` re-run required)
- [x] QA: verification checklist executed (typecheck/lint/test/rbac/build/e2e/smoke — results above)
- [ ] UX: restored orphan nav items approved
