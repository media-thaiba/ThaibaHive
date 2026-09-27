# TGCIS — ZiQX Proposal Fulfillment Audit

**Date:** 2026-09-27
**Scope:** `D:\Design Works\TGCIS Proposal.pdf` (ZiQX Creative Clique, Aug 2026) vs. `D:\ThaibaHive`
**Baseline:** commit `c2b189d` + **uncommitted working-tree remediation** (22 modified + 10 untracked paths)
**Source of proposal text:** `C:\Users\SHUKOO~1\AppData\Local\Temp\opencode\ziqx_ocr.txt` (RapidOCR; PDF is vector-only, normal extraction yields 1,406 chars)

---

## 1. Executive summary

The platform is a **strong foundation with a credibility problem**: documentation and reports
assert capabilities that are not implemented, and several CI "green" gates are vacuous by
construction.

Against the proposal's six functional layers, architecture section, and testing/handover section:

| Area | Verdict | Confidence |
|---|---|---|
| Public website (Section 3) | **BUILT** (uncommitted) | Verified by me |
| RBAC roles (Section 5) | **BUILT** (uncommitted) | Verified by me |
| 6.1 Campus | PARTIAL | Source audit only |
| 6.2 Staff | PARTIAL | Source audit only |
| 6.3 Students | PARTIAL | Source audit only |
| 6.4 Academics / timetable | PARTIAL | Source audit only |
| 6.5 Attendance & examinations | PARTIAL | Source audit only |
| 6.6 Circulars | PARTIAL | Source audit only |
| 6.7 Dashboard | PARTIAL | Needs re-verification |
| 6.8 Reports & audit | PARTIAL | Needs re-verification |
| 8. Technical architecture | **~60% realized** | Mixed |
| 10. Testing, deployment, handover | PARTIAL (scaffolding strong, gates broken) | Mixed |

Two severity-high live defects and roughly a dozen high-severity integrity gaps must be closed
before any further feature work.

---

## 2. Corrections to the previous draft audit

The earlier draft reported several items as missing. **Direct inspection shows they have already
been implemented in the working tree but not committed.** Treat those draft items as resolved.

| Draft claim | Actual state (verified 2026-09-27) |
|---|---|
| `/portal` and `/api/public/` not in `publicPaths` | **FALSE.** `src/middleware.ts:10-32` now allowlists `/portal`, `/api/public/`, `/about`, `/mission`, `/enquiry`, `/affiliation`, `/verify/`, `/downloads`, `/share/`. Diff is `+14` lines, uncommitted. |
| No public home / about / mission / downloads routes | **FALSE.** `src/app/(public)/` now contains `about`, `affiliation`, `downloads`, `enquiry`, `mission`, `offline`, `sustainability`, `portal/[code]`, `share/[token]`. All untracked. |
| Four proposal roles missing (Coordinator, Academic Coordinator, Exam Coordinator, Inspector) | **FALSE.** `packages/auth/roles.ts` now defines all 7 proposal roles: `coordinator:21`, `institutional_head:31`, `academic_coordinator:54`, `exam_coordinator:62`, `teacher:68`, `inspector:78`, `super_admin:86`, plus `regional_admin`, `regional_auditor`, `admin`, `principal`, `hod`, `staff`, `accounts`, `purchase`. Diff `+250/-42`, uncommitted. |
| Institution deletion is a hard delete | **PARTIALLY FIXED.** `src/app/api/admin/institutions/[id]/route.ts:41-71` now soft-deactivates by default (`isActive: false`) and requires `?force=true` plus zero departments to hard-delete. Uncommitted. |

Two draft claims survive verification:

- The **legacy** RBAC test `src/lib/__tests__/rbac-permissions.test.ts` is stale and **fails 2 tests** (see §4.1). The new `packages/auth/__tests__/rbac-5tier-matrix.test.ts` **passes** (24 tests), so the boundary is *not* unenforced — the old file just needs updating or removal.
- `inst_tgcis` is hardcoded in runtime pages and is **not** produced by the seed (see §4.3).

---

## 3. Verified-green (run by me, 2026-09-27)

| Check | Command | Result |
|---|---|---|
| TypeScript | `pnpm exec tsc --noEmit` | **0 errors** |
| RBAC permission mapping | `pnpm security:rbac` | **PASS** — 100% of route permissions mapped, no unconfigured prefix |
| 5-tier RBAC matrix | `jest packages/auth/__tests__/rbac-5tier-matrix.test.ts` | **PASS** — 24/24 |
| Legacy RBAC test | `jest src/lib/__tests__/rbac-permissions.test.ts` | **FAIL** — 2/9 |

The uncommitted remediation is internally consistent and type-safe.

---

## 4. Severity-high defects (verified by me)

### H1 — `NODE_ENV=test` grants unauthenticated `super_admin`

`packages/auth/session.ts:117-138`

```ts
if (!token) {
  if (process.env.NODE_ENV === "test") {
    let isUnauth = process.env.TEST_FORCE_UNAUTH === "true";
    // ...
    if (isUnauth) return null;
    return {
      staffId: "staff_admin_01", email: "admin@thaiba.edu",
      role: "super_admin", employeeId: "EMP001", name: "Test Admin", tokenVersion: 0,
    };
  }
```

Any request with **no cookie and no `Authorization` header** authenticates as `super_admin` when
`NODE_ENV === "test"`. The only guard is an env-string comparison — the classic Next.js build-mode
footgun. A container, CI runner, or preview deployment that inherits `NODE_ENV=test` is a **complete
authentication bypass**. It also inflates the reported test count, because many tests never log in.

Compounding: `packages/auth/session.ts:48` disables `secure` on the session cookie when
`PLAYWRIGHT_TEST === "true"`, so a leaked test flag ships non-`Secure` cookies.

**Fix:** delete the fallback. Gate on an explicit flag that is impossible to set accidentally
(e.g. a per-run nonce injected by the test setup), and fail closed.

### H2 — Uploaded files have no ownership or campus authorization

- `src/app/api/upload/route.ts:29` — `requireAuth(handler)` with **no permission string**, no scope
  check, and **no database row** for the upload.
- `src/app/api/upload/files/[filename]/route.ts` states it in a comment: *"All uploaded files are
  designed to be organization-wide readable by any authenticated user."*

Any authenticated user — including the lowest `staff` role — can read any file from any institution.
Responses are served with `Cache-Control: public, max-age=31536000, immutable`, which caches tenant
data in shared caches. The only genuine control is a UUIDv4 filename regex blocking traversal.

**Fix:** add a permission string, write an `upload_ownership` row (institution + uploader), and
filter reads by it.

### H3 — `inst_tgcis` hardcoded, never seeded

- `src/app/(shell)/academic/timetable/page.tsx` — 3 references inside timetable-slot write payloads.
- `src/app/(shell)/academic/students/page.tsx` — `institutionId="inst_tgcis"`.
- `src/app/(public)/portal/[code]/page.tsx` — reference.
- `src/db/seed.ts:103` assigns `uuid()` to every institution except main campus, and
  `src/db/seed.ts:241` creates a separate `inst_campus_main` for E2E. **`inst_tgcis` is never created.**

Timetable and student queries against this ID return nothing, and timetable slot writes are
guaranteed to reference a nonexistent institution.

**Fix:** resolve `institutionId` from the authenticated session's `staffInstitutions` scope; keep
`inst_tgcis` only as a test fixture in `e2e/global-setup.ts`.

### H4 — Marks moderation has no permission string

`src/app/api/circulars/[id]/compliance/route.ts:64` (same pattern found in marks moderation):

```ts
export const PATCH = requireAuth(async (request: Request, context) => { ... });
```

`GET` is guarded with `"circulars:read"`, but the state-mutating `PATCH` has **no permission
argument at all** — any authenticated user can set compliance status, write coordinator remarks, and
attach completion evidence for any institution.

**Fix:** require `"circulars:manage"` plus a server-side institution-scope check.

---

## 5. Section 8 — Technical architecture

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Next.js / React / TypeScript | BUILT | `package.json:112-115` Next 16.2.10, React 19.2.4, `zod ^4.4.3`, `drizzle-orm ^0.45.2`, `jose ^6.2.3`, `bcryptjs`, `tailwindcss ^3.4.19` |
| 2 | Monorepo / modular structure | PARTIAL | `pnpm-workspace.yaml:1-2` declares only `packages/*`. `turbo.json:4-19` defines 5 tasks but `package.json` has **no `turbo` script** — orchestration configured and unused. pnpm version drifts 8 vs 9 across workflows. |
| 3 | Capability + scope permission model | PARTIAL | `packages/auth/roles.ts` is a **static hardcoded map**, not DB-backed Users/Roles/Permissions. 276-permission AST audit genuinely passes and is CI-enforced. |
| 4 | Normalized schema, junctions, FKs, indexes | BUILT | 386 tables, 429 `.references()`, 245 `onDelete`, **632 indexes**, 21 unique. Junctions `staffDepartments` / `staffInstitutions` in real use. Caveat: **zero `check()` constraints** in either schema. |
| 5 | **Server-side tenant scope enforcement** | **MISSING** | **270 of 578 routes (47%)** call `requireAuth` with no scoping. `src/lib/api/tenant-scope.ts` is correct but imported by only **7 routes**. `packages/auth/institution-scope.ts:5-19` returns only the *first* institution and `null` (global) for `admin`/`super_admin`. `src/app/api/academic/students/bulk-import/route.ts:24-30` accepts `institutionId` from the request body with **no validation and no scope check** — any authenticated user can bulk-insert students into any campus. |
| 6 | Redis cache + BullMQ background queue | **MISSING** | `ioredis` and `bullmq` are **not dependencies of any package.json**. `src/lib/queue/index.ts:108` hardcodes `new InMemoryJobQueue()`; the BullMQ branch exists only in a comment; `jobQueue` is **never imported** — dead code. `src/lib/services/redis-client.ts:100-101` sets `this.connected = process.env.NODE_ENV === "production"`, so **`isRedisConnected()` returns `true` in production with nothing connected** — health checks are actively lied to. `rate-limit.ts:30-48` is a per-process `Map` (25 call sites). Redis in `docker-compose.yml` and the 6-node `docker-compose.redis-cluster.yml` is dead weight. `docs/production-configuration-guide.md` documents `REDIS_CLUSTER_NODES` and `src/lib/rate-limiter/sms-rate-limiter.ts` — **neither identifier exists in `src/`**. The one real job system, `src/lib/services/report-queue.ts`, is DB-backed with optimistic locking and retries but processes **in-process via `setTimeout` (`:245-247`)**, so a restart strands queued jobs permanently. |
| 7 | S3-compatible object storage | PARTIAL | No S3/MinIO/R2 SDK anywhere. `src/lib/storage.ts:22-47` uses Supabase Storage REST. Good control: `checkStorageConfig()` (`:6-15`) throws in production unless `STORAGE_FALLBACK_ALLOWED=true`. Upload route has MIME allowlist, MIME/extension cross-check, 50 MB cap, rate limit, UUID filenames. Gaps: no malware/AV scan; no permission string (H2); unit bug at `upload/route.ts:44` reports the 50 MB cap as `${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB` = **0.045 GB** (one extra `/1024`). |
| 8 | Transactions, integrity, soft delete, audit | PARTIAL | **Only 10 of 578 routes** use `db.transaction`. Admissions, attendance, marks, approvals are **not** atomic. `src/app/api/examinations/marks/batch/route.ts:9-47` is loop-and-insert (validates `0 ≤ marks ≤ maxMarks` but a mid-batch failure leaves a corrupt mark sheet with no audit row). `src/app/api/staff/[id]/route.ts:111-135` hard-deletes and recreates junctions non-transactionally. `src/lib/api/activity-log.ts:46-62` swallows all failures and is called from only **13 of 578 routes** — approvals, mark changes, permission changes, and sensitive exports are not demonstrably logged. Soft delete is now correct for institutions (§2) but not applied elsewhere. |
| 9 | Passwords, sessions, revocation, headers | PARTIAL | Genuinely good: bcrypt; httpOnly `sameSite:lax` cookies, 24 h / 7 d remember-me; revocation via `staff.tokenVersion` + `isActive` **re-checked every request**; DPoP 10-min sessions; step-up tokens; CSP, HSTS preload, `nosniff`, `frame-ancestors 'none'`, Permissions-Policy, CSP reporting endpoint (`next.config.ts:97-107`). Gaps: password policy is **`min(8)` only** (`packages/auth/schemas.ts:9-21`) with no complexity, history, expiry, or lockout; **no `iss`/`aud` claims** on the JWT, so a token from one environment validates in another sharing the secret; a DB query on every authenticated request with no session cache; revocation-store import failure silently swallowed (`:163-165`); `'unsafe-inline'` retained in `script-src` in production; obsolete `X-XSS-Protection`; `env-validation.ts:11-24` requires only 16-char secrets with no entropy check. |
| 10 | **Shared error handling + structured logging** | **MISSING** | No `ApiError`, `errorResponse`, or `handleError` helper exists. **1,329 ad-hoc `NextResponse.json({ error })` responses** across 578 routes — no envelope, no error code, no request-ID correlation. No `pino`/`winston`/`bunyan`. `src/lib/logger.ts:1-3` re-exports a **client-side `localStorage`** telemetry logger. `src/lib/server-logger.ts:1-69` formats text but terminates in `console`. Non-test source: **46 `console.log`, 242 `console.error`**. No log shipping, no trace propagation, no error-reporting SDK (Sentry is an unused optional env var). |

Additional architecture defect: `packages/db/index.ts:69-136` creates `audit_merkle_roots`,
`audit_logs`, `compliance_violations`, and `forensic_snapshots` via hand-written
`CREATE TABLE IF NOT EXISTS` at module load — **not via Drizzle migrations, and only in SQLite
mode.** The tamper-evident audit chain has **no PostgreSQL migration at all.**

`reports/tenant-isolation-report.json` claims "1,520 files scanned, zero leaks" — the scanner is a
grep heuristic, not an enforcement proof, and the enforcement gap in row 5 is real.

---

## 6. Section 10 — Testing, deployment, handover

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 11 | Unit + integration tests | BUILT | `pnpm test` runs **2,369 tests / 717 suites**. `jest.config.js:14-20` sets coverage thresholds, but the `test` script never passes `--coverage`, so they never gate. Breadth is real: RBAC matrices, approvals, grade calculation, mark entry, DPoP, revocation. |
| 12 | **Data-integrity testing (admission/attendance/marks/results)** | **MISSING** | **Only 2 of 705 test files open a real database** (`pre-migration-dedup.test.ts`, `production-readiness.test.ts`). Everything else is pure-logic unit tests. No integration test exercises admission import, attendance capture, mark entry, or result publication against a real schema — which is exactly why the non-transactional writes and missing `check()` constraints went undetected. `e2e/global-setup.ts:57` even sets `PRAGMA foreign_keys = OFF` while seeding. No test asserts rollback, FK enforcement, or cascade behaviour. |
| 13 | E2E tests | BUILT but **broken in CI** | Strongest asset: `.github/workflows/ci.yml:119-175` runs Playwright on chromium/firefox/webkit; `e2e/global-setup.ts` seeds 7 roles with real bcrypt hashes, creates institution/department/grade-scale/exam/mark/leave data, performs real browser logins, caches `storageState` per role (`:317-350`); 31 spec files. **But it cannot pass:** `ci.yml:145-167` never runs `db:migrate` or `db:seed`, and `DATABASE_URL` points at a fresh `file:.../dev.db`. Since `drizzle/*.sql` is gitignored, there are **no migrations**, so the DB has no tables and `global-setup.ts:16` fails on its first query. `:337-339` wraps session caching in a `catch` that only logs, so **setup failure is non-fatal** — the run continues with missing `storageState`. E2E has never been green on a fresh clone. |
| 14 | Accessibility testing | PARTIAL | `jest-axe ^11` and `@axe-core/playwright ^4.12` present. `pnpm test:a11y` passes — **3 suites, 25 tests** — but only against shared UI primitives, not application pages. **No CI job runs either a11y command.** `eslint-plugin-jsx-a11y` is not installed, so there is no static a11y analysis. `mobile-release.yml:85` asserts "WCAG 2.1 AA accessibility compliant" in a **hardcoded release-note string** that is not a test result. |
| 15 | CI/CD (lint → typecheck → test → build → deploy) | PARTIAL | Broad: `ci.yml` has 5 jobs (`web-ci`, `platform-simulations`, `e2e-tests`, `load-tests` with k6 thresholds, `mobile-ci`) plus 12 more workflows. Defects that make CI **red or falsely green**: `ci.yml:35` `pnpm audit --audit-level high \|\| true` (non-blocking); `ci.yml:70-73` SQLite migration gate is **vacuous** because `.gitignore:48-49` ignores `drizzle/*.sql` so the glob matches nothing; `ci.yml:331-342` runs `backup:test` and `test:backup` in `packages/db` and the mobile app — **neither script exists** (`packages/db/package.json` has no `scripts` key), so the job is permanently red; `identity-security-gate.yml` uses `--passWithNoTests` so the security gates **pass green with zero matching tests**; `dependency-canary-validate.yml:66-77` posts a **hardcoded** "✅ Passed / ✅ 100% Compliant / ✅ Zero Regression Detected" comment regardless of results, wraps k6 in `\|\| true`, and runs `gh pr merge --auto --squash` for Dependabot PRs (**auto-merge without human review**); `cleanup-nonces.yml:22-25` authenticates with a **long-lived static session cookie** in a `Cookie:` header — replayable, no nonce, no expiry; `mobile-release.yml:46-53` guards the keystore step with `if: env.ANDROID_KEYSTORE_BASE64 != ''` but sets that variable **inside the same step**, so it is always empty and **release builds are never signed** while the release body claims "Signed Android App Bundle". Credit: `eslint.config.mjs:39-70` enforces a real architectural boundary banning `@thaiba/db` imports in `src/components/**` and `src/hooks/**`. |
| 16 | Required status checks | UNKNOWN | Branch protection lives in GitHub settings, not the working tree. Consequential: `ci.yml` triggers on `main, master` while `deploy-production.yml:6` triggers on `master` only — if the default branch is `main`, merging does **not** deploy. `deploy-production.yml:7` also triggers on `tags: v*`, so **a tag push deploys to production with no dependency on a passing CI run**. |
| 17 | Docker, staging, prod, rollback, secrets, backups | PARTIAL | Real: multi-stage `Dockerfile:1-60` (Node 20, `output: standalone`, non-root, `/app/data` volume, healthcheck); `docker-compose.yml:1-60`; `deploy-production.yml` preflight → build → deploy → **post-deploy health verification** with `environment: production`; `scripts/deploy-staging.ps1`; gitleaks scanning; `.env.example` / `.env.production.example` populated; `env-validation.ts` validates at startup; `db-backup.yml:1-46` daily 03:00 UTC `pg_dump` to S3 with 30-day retention. Gaps: **Docker and Compose are never used by CI/CD** — production is Vercel serverless, so "containerized deployment" is not the production path; the Dockerfile runs no `db:migrate` and mounts no DB volume, and `deploy-staging.ps1:19-24` calls `pnpm db:generate:pg` (*generating* migrations at deploy time); **migrations are not reproducible from a clean clone** — 26 SQLite SQL files exist on disk but `.gitignore:48-49` ignores `drizzle/meta/` and `drizzle/*.sql`, so **git tracks only the 11 PostgreSQL files** and a fresh clone has no SQLite schema (`reports/replica-parity-report.json` compounds this with `totalReplicasChecked: 0`); **no backup restoration procedure exists anywhere** — grepping `docs/`, `scripts/`, `.github/` for `pg_restore` or "restore runbook" returns nothing, and `db-backup.yml:44-46` has `dry_run` *skip* the backup entirely, validating nothing; no PITR, no WAL archiving, no restore test, no RPO/RTO; **DR is simulation, not capability** — `dr-chaos-drill.yml` runs weekly but `docs/WALKTHROUGH.md` admits `dr:drill` / `dr:verify:failover` / `dr:verify:rollback` "operate via **in-memory failure injection**" (honest, but absent); `src/db/seed.ts:345` ships a hardcoded credential `bcrypt.hash("AdminPassword123!", 10)` for `admin@thaibahive.local` plus `qrSecret: "test-qr-secret-99"` (`:338`), and the 380-line seed has **no `db.transaction`**; no automated rollback or canary promotion; **no workflow deploys to staging** — `staging-canary-gate.yml` only validates an already-running URL (default `localhost:3000`), so staging is manual-only. |
| 18 | Documentation & handover package | PARTIAL | `docs/` holds **150+ markdown files**, and `docs/operations/` + `docs/runbooks/` contain real SOPs (`soar-incident-response.md`, `saga-compensation-troubleshooting.md`, `04-emergency-lockdown-sop.md`, `pki-cert-rotation-runbook.md`). Against 10.2: architecture/API/integration guides **present**; user manual **partial** (`mediahive-user-guide.md` covers one module); admin playbook/handbook **missing** (zero matches); troubleshooting guide **partial** (no consolidated doc); installation/setup guide **missing**; **backup restore runbook missing**; runbook index/glossary **missing** (150+ runbooks, no index or ownership map); **training material missing**. Compounded by false-assurance artifacts: `AGENTS.md` claims "231/231" and "26/26" tests (stale) and `ENGINEERING_ASSESSMENT_REPORT.md` / `Verification.md` report green gates that are vacuous or red. A new engineer following the docs would be misled. |

---

## 7. Functional modules — source-audit verdicts

These come from the module audits. They are **source-verified with `file:line` evidence but not
runtime-verified**. Treat confidence as medium until smoke-tested.

### 6.1 Campus — 1 BUILT · 4 PARTIAL · 6 MISSING (of 11)
- `institutions` has only generic fields (`name`, `code`, `type`, address/contact, `isActive`, budget,
  fiscal year). No main/off-campus/affiliated taxonomy, no geo/principal/management/operational
  profile, no approval status.
- `campus_affiliations` is a separate table, **unlinked from `institutions`**.
- No native Coordinator role in the campus workflow; appointment, substitution, validation, and
  approval flows incomplete; management dashboard uses hardcoded demo data.
- Soft delete now fixed for institutions (§2).

### 6.2 Staff — mostly PARTIAL
Staff records, departments, and institution junctions are real. Appointment/sanction/transfer/
replacement, substitution, and the full approval chain are incomplete. No hardcoded demo data in
the staff APIs themselves, but the campus dashboards do use it.

### 6.3 Students
- `students` defined at `packages/db/schema.ts:144-176`.
- **No `batchId`** — `section` is free text on `classes`, not a first-class student assignment.
  This blocks the proposal's batch/rollup requirements.
- Bulk import exists at `src/app/api/academic/students/bulk-import/route.ts` but has **no Zod
  validation, no transaction, and no scope check** (see §5 row 5).

### 6.4 Academics, timetable, exams
- `src/app/(shell)/academic/timetable/page.tsx` **exists** — the internal proposal's claim that
  timetable is missing is **outdated**. However it hardcodes `inst_tgcis` (H3).
- Exam configuration tables and APIs exist; subjects are free text and grade rules are not fully
  wired.
- Hall-ticket DB/API/HMAC QR/fee-lock/verify is **BUILT**; PDF export is **PARTIAL**.
- Marks: validated range but non-atomic batch write; **no teacher subject/student assignment
  enforcement**; **no controlled editing deadline**; approval exists but **return-for-correction and
  audited reopening are incomplete**.
- Capability naming diverges from the proposal: app uses `exam:enter_marks`, proposal specifies
  `marks.enter`.

### 6.5 Attendance
- Daily student attendance: status/write API present, **read and register UI missing**.
- **No period/subject attendance model** — period is free text with no subject FK, and the daily
  unique index actively blocks it.
- Staff attendance present but **no teacher-class assignment**.
- Leave workflow: hardcoded 2-stage, not configurable; UI drops the `hod_approved` field.
- Monthly rollup and low-attendance threshold **missing**.
- Attendance analytics is **single-institution only**, not multi-campus.

### 6.6 Circulars — 1 PARTIAL · confirmed
- `circulars` at `packages/db/schema.ts:532-552`.
- **Only one nullable `targetInstitutionId`**; no multi-campus junction table.
- Targeting is **mutually exclusive** role/department/institution; the proposal specifies additive
  targeting.
- **`dueDate` absent** from both schema and validation. No responsible-Coordinator assignment, no
  internal follow-up comments.
- Download tracking, tenant checks, validation, and rate limiting exist.
- `PATCH` on compliance has **no permission string** (H4).

---

## 8. Prioritized remediation roadmap

### P0 — live security and integrity defects (do first)
1. **H1** — delete the `NODE_ENV=test` `super_admin` fallback in `packages/auth/session.ts:117-138`.
2. **H2** — add a permission string and an `upload_ownership` row; filter reads; fix the
   `Cache-Control` on tenant files; fix the 50 MB → 0.045 GB message at `upload/route.ts:44`.
3. **H3** — replace hardcoded `inst_tgcis` with session-scoped institution resolution in
   `academic/timetable/page.tsx`, `academic/students/page.tsx`, and `(public)/portal/[code]/page.tsx`.
4. **H4** — require `"circulars:manage"` + institution scope on the compliance `PATCH`.
5. Add `"circulars:manage"` to the right roles; add assignment-aware enforcement so
   `exam:enter_marks` can only write marks for assigned teacher/class/subject.
6. **Tenant isolation** — introduce a `requireTenantAuth` wrapper and migrate the highest-value 20
   routes first: students, marks, attendance, exports, finance, circulars. Start with
   `academic/students/bulk-import`, which is currently an open cross-campus write.
7. **Commit the uncommitted remediation** — 32 paths of real, type-clean, audit-passing work is
   currently one `git checkout` away from being lost.

### P1 — CI integrity and data safety
8. Fix the stale `src/lib/__tests__/rbac-permissions.test.ts` (2 failures) or delete it in favour of
   `rbac-5tier-matrix.test.ts`.
9. Define `backup:test` / `test:backup` or delete `ci.yml:331-342` — CI is red today.
10. Remove `|| true` from `ci.yml:35` and `--passWithNoTests` from `identity-security-gate.yml` so
    the gates can actually fail.
11. Stop the hardcoded "✅ 100% Compliant" PR comment and the `--auto --squash` merge in
    `dependency-canary-validate.yml`; require human review.
12. Un-ignore `drizzle/*.sql` and `drizzle/meta/` and commit them; make a clean clone able to
    migrate. Add `db:migrate` + `db:seed` to the E2E job and make setup failure **fatal**.
13. Fix the `mobile-release.yml:46-53` keystore guard (variable set inside the step that tests it)
    and replace the "Signed Android App Bundle" claim with a real check.
14. Wrap admissions, attendance, marks batch, approvals, and the seed in `db.transaction`; add
    `check()` constraints for marks/attendance/percentage bounds.
15. Replace the long-lived static `SYSTEM_ADMIN_SESSION_TOKEN` cookie in `cleanup-nonces.yml` with
    short-lived, nonce-scoped credentials.

### P2 — architecture the proposal actually requires
16. Add a real queue: BullMQ + Redis, delete the dead `jobQueue`, and either wire
    `RedisStateClient` to `ioredis` or remove it. **Stop reporting `connected = true` in production
    while nothing is connected** (`redis-client.ts:100-101`).
17. Add a shared `ApiError` / error-envelope helper with request-ID correlation; migrate the 1,329
    ad-hoc error responses incrementally. Adopt `pino`; stop treating `src/lib/logger.ts` (a
    `localStorage` telemetry logger) as the server logger.
18. Add `iss`/`aud` to the JWT; raise the password policy beyond `min(8)`; add lockout; add JWT
    secret entropy validation; add a session cache to remove the per-request DB hit.
19. Move the four hand-written `CREATE TABLE IF NOT EXISTS` audit tables into Drizzle migrations
    and add the PostgreSQL variants.
20. Implement real S3-compatible storage with per-tenant authorization and AV scanning, or
    explicitly re-baseline the proposal to Supabase Storage.

### P3 — testing depth and handover
21. Add real integration tests against a live schema for admission import, attendance, mark entry,
    and result publication; stop disabling `PRAGMA foreign_keys` in E2E seeding.
22. Pass `--coverage` so the existing thresholds gate; add a CI job for `test:a11y` and
    `a11y:audit`; install `eslint-plugin-jsx-a11y`.
23. **Write a backup restore runbook and prove it** — `pg_restore` a real backup into a scratch
    database in CI. This is the single largest missing handover artifact and pairs with the
    absent RPO/RTO.
24. Produce the missing handover documents: admin playbook, installation/setup guide, consolidated
    troubleshooting guide, runbook index with ownership, and training material.
25. Correct the false-assurance artifacts: `AGENTS.md` test counts, `ENGINEERING_ASSESSMENT_REPORT.md`,
    `Verification.md`, `reports/tenant-isolation-report.json`, and
    `TGCIS_Integration_Proposal.html` (which still claims timetable is missing).
26. Add staging deploy automation and a production rollback/canary step; align the deploy trigger
    branch with the default branch and gate tag-triggered deploys on a passing CI run.

---

## 9. Verification commands used

```powershell
cd D:\ThaibaHive
git status --short
git diff --stat
pnpm exec tsc --noEmit
pnpm security:rbac
pnpm exec jest packages/auth/__tests__/rbac-5tier-matrix.test.ts src/lib/__tests__/rbac-permissions.test.ts
```

Current results: typecheck clean · RBAC AST audit 100% mapped · 5-tier matrix 24/24 pass ·
legacy RBAC test 2 failures (stale) · 32 uncommitted paths of remediation present.

---

## 10. Bottom line

The vendor proposal's Section 8 architecture is roughly **60% realized**. Its two highest-risk
requirements — **tenant isolation** and **Redis/queue** — are essentially unbuilt despite
documentation claiming otherwise. Section 10's testing and CI scaffolding is the **strongest area**
and closest to the target, but is undermined by vacuous gates and a red main pipeline.

Four severity-high defects (H1-H4) are concrete, small, and fixable. Everything else is a sequencing
problem, not a capability problem.

**Recommendation:** close H1-H4, commit the pending remediation, then work P1 in order. Do not
present this system as production-ready, and do not let the existing assurance documents stand —
they currently describe capabilities the codebase does not have.
