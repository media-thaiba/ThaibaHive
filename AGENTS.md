<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:thaibahive-skills -->
# Project Skills

The following skills are available for this project. Use them when relevant:

1. **graphify** — Build a queryable knowledge graph from any folder (code, docs, PDFs). Saves token costs by using a compact graph instead of reading every source file. Install: already in `~/.claude/skills/graphify/`. Trigger: `/graphify`.

2. **awesome-design-md** — Design reference files from major brands (Stripe, Linear, Vercel, etc.). Pin to project for consistent UI output across AI models. Install: already in `~/.claude/skills/awesome-design-md/`.

3. **gsd-core** (Get Shit Done) — Meta-prompting and context engineering framework. Commands: `/gsd-new-project`, `/gsd-help`. Install: `npx @opengsd/gsd-core@latest` (already installed).

4. **ecc** (Everything Claude Code) — 180+ community skills including code review, accessibility audits, testing, security scanning, and specialized agents. Install: already in `~/.claude/skills/ecc/`. Sub-skills include: `code-reviewer`, `e2e-testing`, `tdd-workflow`, `security-auditor`, `impeccable`, and more.

5. **ui-ux-pro-max** — Design intelligence skill with 57 UI styles, 95 color palettes, 56 font pairings, and 99 UX guidelines. Install: project-local at `.opencode/skills/ui-ux-pro-max/`. Run design system generation via Python scripts in its `scripts/` directory.
<!-- END:thaibahive-skills -->

<!-- BEGIN:plan-review-rule -->
# Plan Review Rule
Always ask Qwen (via `ask_qwen`), OpenCode (via `chat-with-local-ollama` / routing), and Claude Code to review and suggest improvements to any implementation plan or other plans created, then update the plan accordingly. This must be done after creating any plan.
<!-- END:plan-review-rule -->

<!-- BEGIN:thaibahive-conventions -->
# ThaibaHive Conventions

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 3.4
- **Components**: Radix UI + `src/components/ui/`
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Drizzle ORM
- **Auth**: JWT via `jose`
- **Package Manager**: pnpm (monorepo with `packages/auth` and `packages/db`)

## Project Structure
```
src/app/(shell)/     → Authenticated pages
src/app/api/         → API route handlers
src/components/ui/   → Reusable UI primitives
src/lib/             → Utilities, auth, validation
src/db/              → Schema, seed, connection
packages/auth/       → Auth package (roles, permissions, JWT)
packages/db/         → DB package (Drizzle schema)
```

## Coding Rules

### API Routes
- Always use `requireAuth(handler, "permission:string")` wrapper
- Validate with Zod schemas from `src/lib/validation/schemas.ts`
- Return `{ error: string }` on failure, proper HTTP status codes
- DELETE handlers must check existence before deleting (return 404 if missing)
- Use `eq()`, `and()`, `or()` from drizzle-orm for queries

### UI Pages
- Use UI components from `src/components/ui/` — never raw HTML `<input>`, `<select>`, `<button>`
- Always add `.catch()` to `useEffect` fetch calls to prevent stuck loading states
- Use `<Skeleton>` for loading states, not "Loading..." text or pulse divs
- Use `<Badge variant="success|warning|destructive|info|secondary">` for status colors — never hardcoded Tailwind
- Use `<Dialog>` for modals — never custom `fixed inset-0 z-50` overlays
- Import `ensureArray` from `@/lib/utils` instead of repeating `Array.isArray(x) ? x : []`

### Database
- Auth module re-exports from `@thaiba/auth` package — do not create local duplicates
- Role types: `super_admin | admin | principal | hod | staff`
- Staff ↔ Department: via `staffDepartments` junction table
- Staff ↔ Institution: via `staffInstitutions` junction table
- Timestamps: use `text` type with ISO strings, not native date types

### Permissions (RBAC)
- `super_admin` — `*` (all permissions)
- `admin` — Most management operations
- `principal` — Institution-level management
- `hod` — Department-level management
- `staff` — Read-only + own data operations

### Validation
- Zod schemas in `src/lib/validation/schemas.ts`
- All API routes that accept POST/PATCH body should use Zod
- Use `safeParse()` with proper error messages

### Error Handling
- API routes: return `{ error: string }` with appropriate status
- Client pages: catch fetch errors, show via `<Alert>` or `toast.error()`
- Never leave loading spinners stuck — always resolve loading state in catch

### State & Data Fetching
- `useState` for local component state
- `useCallback` for functions in `useEffect` dependency arrays
- `useEffect` must always have a dependency array (use `[]` for mount-only)

## Mobile Conventions (Flutter)

### State Management
- Use **Riverpod** (`flutter_riverpod` and generated code via `riverpod_generator`) for all features.
- Prefer `ConsumerWidget` or `ConsumerStatefulWidget` over raw widgets where state access is required.
- Keep State models immutable. Use `@freezed` or standard custom patterns for model mutation.

### Navigation & Routing
- Handle all screens and deep linking using `GoRouter`.
- Add new screens under `lib/app/router.dart` and protect paths using the `_authGuard` middleware.

### Mobile-Web Integration (Auth Handoff)
- Store JWT tokens securely using `FlutterSecureStorage` under `AppConstants.storageTokenKey`.
- When loading a web page in a WebView, always use the `WebViewHandoffScreen` component to perform Nonce Exchange (`/auth/mobile-handoff/nonce`), setting the session cookie securely to avoid manual credentials exposure.

### UI & UX
- Follow standard material design patterns.
- Always provide pull-to-refresh capabilities on dashboard and lists.
- Optimize network image rendering by using `cached_network_image` instead of default Image providers.
<!-- END:thaibahive-conventions -->

<!-- BEGIN:issue-fixes -->
## Issue Fixes

### 2026-07-29: Linting and TypeScript Fixes

#### Fixed Issues:

**Issue 1: Navigation Component Lint Error**
- File: `src/app/(shell)/page.tsx:189-194`
- Problem: `<a>` tag used for navigation instead of `<Link>`
- Solution: Replaced `<a>` with Next.js `<Link>` component for proper navigation
- Status: ✅ Fixed

**Issue 2: React Hook Ref Mutation**
- File: `src/lib/hooks/use-realtime-dashboard.ts:14-16`
- Problem: `onEventRef.current = onEvent` mutation during render 
- Solution: Moved ref assignment into `useEffect` with dependency array `[onEvent]` to comply with React Hook rules
- Status: ✅ Fixed

**Issue 3: TypeScript NODE_ENV Mutation**
- File: `src/lib/__tests__/security-audits.test.ts:410`
- Problem: `process.env.NODE_ENV` assignment causing type errors
- Solution: Used `Object.defineProperty` with `writable: true` instead of type casting
- Status: ✅ Fixed

**Verification:**
- Lint: ✅ All 2 errors resolved, 46 warnings remain (unrelated pre-existing)
- TypeScript: ✅ tsc --noEmit passes without errors
- Tests: ✅ All 22 test suites pass (231/231 tests passing)
- Fix Method: Manual code edits without automatic --fix where available

### 2026-08-21: Sprint-050 SafeCampus OS & Vision Shield Verification Fixes

#### Fixed Issues:

**Issue 1: Schema Dialect Closing Bracket Parity**
- Files: `packages/db/schema.ts` and `packages/db/schema.pg.ts`
- Problem: `ecoCarbonOffsets` closing syntax was missing `ecoOffsetStatusIdx` closing structure before vision tables
- Solution: Restored closing index and bracket block in both SQLite and PG schemas
- Status: ✅ Fixed

**Issue 2: Relative Store Import Path**
- File: `src/lib/operations/vision/incidents/incident-ledger-engine.ts`
- Problem: Referenced `../../db/vision-store` instead of `../../../db/vision-store`
- Solution: Fixed import path to point directly to `../../../db/vision-store`
- Status: ✅ Fixed

**Issue 3: Gateway AST Security Route Protection on SSE Stream**
- File: `src/app/api/vision/stream/route.ts`
- Problem: SSE route handler was unwrapped, flagged by Gateway AST Scanner
- Solution: Wrapped `GET` handler in `requireAuth(..., 'vision:alerts:view')`
- Status: ✅ Fixed

**Issue 4: Strict TypeScript Property Validation**
- Files: `src/app/api/vision/alpr/route.ts`, `src/app/api/vision/guards/route.ts`, `src/app/api/vision/privacy/route.ts`, and `src/components/operations/vision/lockdown-modal.tsx`
- Problem: Missing `logId`, `lastHeartbeatAt`, and `updatedAt` properties, and invalid Alert variant `"destructive"`
- Solution: Provided explicit IDs/timestamps and changed Alert variant to `"error"`
- Status: ✅ Fixed

**Verification:**
- Parity & Logic Tests: ✅ 100% Passing across all 22 Vision test suites
- Gateway AST Scanner: ✅ 100% Platform Route Coverage (473/473 routes shielded)
- TypeScript: ✅ `tsc --noEmit` exits with 0 errors
- Simulation: ✅ `pnpm vision:simulate` (8/8 stages passed)

### 2026-09-27: Sprint-051 5-Tier RBAC & Tenant Boundary Deep Enforcement

#### Fixed Issues:

**Issue 1: Role Permissions Matrix Gap Across New Modules**
- Files: `packages/auth/roles.ts`
- Problem: 141 permission keys across Finance, Alumni, Supply Chain, Neuro Cluster, Digital Twin, Eco, and Vision Shield were only mapped implicitly to `super_admin` via wildcard `*`, causing 403 Forbidden errors when `admin`, `principal`, `hod`, `staff`, `accounts`, or `purchase` performed authorized actions.
- Solution: Fully mapped granular permissions across all 5 tiers plus specialized roles (`accounts`, `purchase`, `regional_admin`, `regional_auditor`) with strict negative boundary enforcement.
- Status: ✅ Fixed

**Issue 2: Comprehensive 5-Tier Negative & Positive Auth Matrix Testing**
- Files: `packages/auth/__tests__/rbac-5tier-matrix.test.ts`
- Problem: Lack of automated unit test suites validating positive access grants and negative boundary blocks across all 5 tiers and specialized roles.
- Solution: Created full 26-test suite covering positive permissions, negative boundaries, role validity checks, and security alerts on invalid role injection.
- Status: ✅ Fixed

**Issue 3: Automated AST RBAC Pipeline Scanner**
- Files: `scripts/security/rbac-permission-audit.ts` and `package.json`
- Problem: Need continuous AST-level scanning to guarantee zero unmapped permission keys across future route handlers.
- Solution: Implemented `pnpm security:rbac` with automated zero-drift exit code verification.
- Status: ✅ Fixed

### 2026-10-01: Sprint-100 Autonomous Multi-Agent Workflow Orchestration (AIGENT-OS) Verification Fixes

#### Fixed Issues:

**Issue 1: Cryptographic Merkle Hash Pointer Batching & Load Gate (D11)**
- Files: `src/lib/agents/guardrails/merkle-ledger.ts` and `src/lib/agents/tools/executor.ts`
- Problem: Tool invocations needed batched buffered ingestion and load gate backpressure while maintaining 100% untampered sequential SHA-256 Merkle chain integrity.
- Solution: Implemented `MerkleAuditLedger` with buffered batch flush (`enqueueInvocation`, `flushPendingInvocations`), configurable buffer sizing, load gate threshold gating, and stable sequential insertion order verification.
- Status: ✅ Fixed

**Issue 2: Feature Flag Guardrail Integration Across API Routes (D13)**
- Files: `src/lib/features.ts` and `src/app/api/agents/**/route.ts` (14 endpoints)
- Problem: Agentic workflow API routes required feature flag protection gated on `AGENTIC_WORKFLOWS` toggle.
- Solution: Added `agentic_workflows` to `src/lib/features.ts` and wrapped all 14 `/api/agents/**` route handlers with tenant-aware `isAgenticWorkflowsEnabled` checks.
- Status: ✅ Fixed

**Issue 3: End-to-End Integration & Security Governance Test Suites (AIG-024 / AIG-027)**
- Files: `src/lib/agents/__tests__/agentic-workflows-e2e.test.ts` and `src/lib/agents/__tests__/agent-security-governance.test.ts`
- Problem: Missing comprehensive end-to-end multi-agent execution pipeline tests and security governance test suites with 100+ Merkle load test.
- Solution: Authored full E2E cross-department orchestration test with HITL approval and reverse-order saga rollback, along with dedicated security governance suite testing tamper detection, load gating, and D12 step-up session freshness.
- Status: ✅ Fixed

**Issue 4: Operational Governance & Incident Runbooks (AIG-025)**
- Files: `docs/operations/agent-operations-runbook.md`, `docs/operations/workflow-governance-runbook.md`, and `docs/operations/killswitch-incident-runbook.md`
- Problem: Missing production runbooks for agent lifecycle monitoring, workflow DSL approvals, and emergency kill-switch containment.
- Solution: Published all 3 comprehensive runbooks with OpenMetrics monitoring, HITL expiry policy guidelines, and D12 emergency halt SOPs.
- Status: ✅ Fixed

### 2026-10-01: Sprint-103 Finance Operations Consolidation & Mobile Foundation Verification Fixes

#### Fixed Issues:

**Issue 1: Tax Rate Overrides and Jurisdiction Precedence Engine**
- Files: `packages/db/schema.ts`, `packages/db/schema.pg.ts`, `src/lib/finance/tax/tax-rate-engine.ts`, and `src/app/api/finance/tax-rates/**`
- Problem: Lack of jurisdiction-level default rates and institution-specific category exemption overrides across varying educational tax jurisdictions.
- Solution: Implemented `taxJurisdictions` and `taxRateOverrides` tables with `TaxRateEngine` resolving effective rates prioritizing active institution overrides over regional base rates.
- Status: ✅ Fixed

**Issue 2: Tiered Multi-Stage Purchase Approval State Machine with Merkle Audit Integrity**
- Files: `packages/db/schema.ts`, `packages/db/schema.pg.ts`, `src/lib/finance/purchases/purchase-approval-engine.ts`, and `src/app/api/finance/purchases/**`
- Problem: Procurement approvals lacked role-tiered threshold routing and tamper-evident audit logging.
- Solution: Built `purchaseApprovalTiers` and `purchaseApprovalLogs` with sequential SHA-256 Merkle chain verification (`verifyAuditTrail`) and role mismatch enforcement.
- Status: ✅ Fixed

**Issue 3: Payroll Salary Structures & Automated Statutory Deductions**
- Files: `packages/db/schema.ts`, `packages/db/schema.pg.ts`, `src/lib/finance/payroll/payroll-engine.ts`, and `src/app/api/finance/payroll/**`
- Problem: Missing structured payroll records, statutory itemized deductions (PF, PT, TDS), and batch monthly generation endpoints.
- Solution: Implemented `payrollSalaryStructures`, `payrollRecords`, `payrollDeductions`, and `PayrollEngine` computing net payable with cryptographic batch hashes.
- Status: ✅ Fixed

**Issue 4: 3-Way Financial Reconciliation Engine & In-Memory Store Isolation**
- Files: `packages/db/schema.ts`, `packages/db/schema.pg.ts`, `src/lib/finance/reconciliation/reconciliation-engine.ts`, `src/lib/db/engage-store.ts`, and `src/app/api/finance/reconciliation/**`
- Problem: Missing 3-way matching between fee ledgers, expense claims, and external bank entries; test isolation issue in EngageDbStore where SQLite rows persisted across test runs.
- Solution: Implemented `financialReconciliations` and `financialReconciliationItems` with automatic match detection and variance triage; updated `EngageDbStore` to use in-memory store isolation in test environments.
- Status: ✅ Fixed

### 2026-10-02: Pre-Release Remediation & Multi-Tenant Hardening (Phases 1-9)

#### Fixed Issues:

**Issue 1: Edge Middleware Cryptographic JWT Signature Verification (SEC-01)**
- Files: `src/middleware.ts`, `packages/auth/session.ts`, `packages/auth/config.ts`
- Problem: Edge Middleware inspected JWT header without verifying HMAC SHA-256 signature using `getJwtSecretBytes()`.
- Solution: Switched `src/middleware.ts` to `jose.jwtVerify(token, secret)` with WebCrypto byte buffer secret decoding.
- Status: ✅ Fixed

**Issue 2: Biometric, MDM, Sync & Machine Secret Hardening (SEC-02, SEC-03)**
- Files: `src/lib/api/auth-guard.ts`, `packages/auth/roles.ts`, `src/app/api/biometric/**`, `src/app/api/mobile/mdm/**`
- Problem: Biometric verification used insecure string comparison; MDM routes were open without HMAC/auth; cron/dr/cache machine secrets granted wildcard `super_admin` access to unallowlisted paths.
- Solution: Implemented vector cosine similarity for face vectors, timing-safe HMAC verification for biometric & MDM enrollments, path-scoped secret validation (`CRON_SECRET_ROUTES`), and isolated `role: "system"`.
- Status: ✅ Fixed

**Issue 3: Multi-Tenant IDOR Vulnerabilities & Schema Parity (SEC-04, SEC-06, SEC-07)**
- Files: `packages/db/schema.ts`, `packages/db/schema.pg.ts`, `src/app/api/leaves/[id]/route.ts`, `src/app/api/canteen/[id]/route.ts`, `src/app/api/leaves/route.ts`, `src/app/api/canteen/route.ts`, `src/app/api/tasks/route.ts`, `src/app/api/bookings/route.ts`, `src/app/api/help-desk/route.ts`, `src/app/api/media/folders/route.ts`, `src/app/api/media/assets/route.ts`, `src/lib/mobile/sync-appliers.ts`, `src/lib/media/nas-sync-service.ts`
- Problem: `leaveRequests` and `mealNotifications` lacked `institutionId` in both database schemas; `leaves/[id]` and `canteen/[id]` allowed cross-tenant modification; 7 create routes and 2 non-route background writers omitted `institutionId` on insert.
- Solution: Added `institutionId` with cascade references to `leaveRequests` and `mealNotifications` in SQLite and Postgres schemas; enforced `resolveScopedInstitutionId` on all mutators, queries, and background writers; populated `institutionId` on all create paths.
- Status: ✅ Fixed

**Issue 4: Migration Journals & Deterministic Backfill Engine**
- Files: `drizzle/0030_mixed_mysterio.sql`, `drizzle/postgres/0014_bouncy_slyde.sql`, `scripts/db/backfill-institution-ids.ts`, `scripts/db/verify-tenant-columns.ts`, `scripts/db/migrate.ts`
- Problem: Migration journals lacked `institution_id` columns for 8 tables (causing production Postgres failures); legacy records had NULL institution IDs making them invisible to scoped users.
- Solution: Generated full SQLite and PostgreSQL migrations covering all 8 tables; created deterministic 5k-chunked backfill script with ambiguity tracking artifact integrated into `migrate.ts` tail; created automated `db:verify:columns` verifier.
- Status: ✅ Fixed

**Issue 5: Hardened Multi-Tenant Scanner & RBAC Guardrails**
- Files: `scripts/security/tenant-isolation-scan.ts`, `scripts/security/tenant-scan-allowlist.json`, `scripts/security/requireauth-permission-audit.ts`, `package.json`
- Problem: Tenant scanner only checked raw `SELECT * FROM institutions`; `security:requireauth` script was unwired; need continuous enforcement of Rules A-D (unscoped scans, unscoped mutations, unscoped [id] lookups, and insert without institution).
- Solution: Implemented full regex scanner for Rules A-D with schema table extraction, wired `security:requireauth` in `package.json`, and tracked Tier 3 debt in `tenant-scan-allowlist.json`.
- Status: ✅ Fixed

**Verification:**
- Full Platform Test Suites: ✅ Passed across test suites (including 4 new isolation and backfill suites)
- Gateway AST Scanner: ✅ 100% Platform Route Coverage (604/604 endpoints shielded, 0 leaks)
- Tenant Isolation Scanner: ✅ 100% Tenant Isolated (1,613/1,613 files scanned, 0 leaks, 57 debt allowlisted)
- RBAC AST Scanner: ✅ 100% Route Permission Mapping (100% mapped, exit 0)
- RequireAuth Permission AST Scanner: ✅ 100% Shielded (0 naked handlers)
- Tenant Column Verifier: ✅ 8/8 Scoped Tables Verified
- TypeScript: ✅ `tsc --noEmit` exits with 0 errors
- Lint: ✅ ESLint passes without errors

<!-- END:issue-fixes -->


