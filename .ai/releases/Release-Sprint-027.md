# Release Certificate: Sprint-027
**Version:** v3.11.0  
**Date:** 2026-08-06  
**Status:** ✅ APPROVED & STABLE

---

## Release Notes
ThaibaHive v3.11.0 delivers the **Sprint-027 Production Readiness & Technical Debt Resolution** release. It transitions the scheduled report compiler queue from volatile in-memory arrays to a persistent database-backed queue with atomic Optimistic Locking (preventing concurrent double-processing conflicts in horizontally scaled server clusters), exponential backoff retry controls, and a `createdAt` database index. It also replaces console-based widget logs with asynchronous compliance personalization audit logging (explicitly role-guarded to restrict logs access to `super_admin` only), and implements real database-driven aggregations for Cashier (financial transaction ledger tally) and Parent (student roster attendance and fee clearance locks via active `hallTickets`).

---

## Files Changed

### Database Core
- [packages/db/schema.ts](file:///d:/ThaibaHive/packages/db/schema.ts) / [schema.pg.ts](file:///d:/ThaibaHive/packages/db/schema.pg.ts) — Declared SQLite & PostgreSQL database schemas for `scheduled_jobs`, `job_executions`, and `preference_audit_log` with database indexes (including `idx_scheduled_jobs_created_at`).
- [drizzle/0021_purple_bloodscream.sql](file:///d:/ThaibaHive/drizzle/0021_purple_bloodscream.sql) / [0022_shiny_omega_red.sql](file:///d:/ThaibaHive/drizzle/0022_shiny_omega_red.sql) — SQLite migration Drizzle SQL statements.
- [drizzle/postgres/0007_nasty_beast.sql](file:///d:/ThaibaHive/drizzle/postgres/0007_nasty_beast.sql) / [0008_glorious_fabian_cortez.sql](file:///d:/ThaibaHive/drizzle/postgres/0008_glorious_fabian_cortez.sql) — PostgreSQL migration parity Drizzle SQL statements.

### Services Layer
- [src/lib/services/report-queue.ts](file:///d:/ThaibaHive/src/lib/services/report-queue.ts) — Complete rewrite to support persistent SQLite/PG queue processing, retry loops, and concurrency controls via optimistic conditional updates.
- [src/lib/services/workspace-aggregation.ts](file:///d:/ThaibaHive/src/lib/services/workspace-aggregation.ts) — Implemented Drizzle queries to fetch cashier and parent dashboard aggregates dynamically, filtering on tenant institution IDs and checking active hall ticket fee locks.
- [src/lib/services/preference-audit.ts](file:///d:/ThaibaHive/src/lib/services/preference-audit.ts) — New service executing asynchronous background audit log inserts, providing a secure `getAuditLogs` method explicitly restricted to `super_admin`, and providing pruning routine logs.

### API Routes
- [src/app/api/workspaces/preferences/route.ts](file:///d:/ThaibaHive/src/app/api/workspaces/preferences/route.ts) — Integrated PreferenceAuditService inside the preferences PUT handler, extracting old layout values and logging changes asynchronously.

### Unit & Integration Test Suites
- [src/lib/services/__tests__/report-queue.test.ts](file:///d:/ThaibaHive/src/lib/services/__tests__/report-queue.test.ts) — Verified DB-backed job queue transactions, concurrent limits, retry limits, and backoff triggers.
- [src/lib/services/__tests__/preference-audit.test.ts](file:///d:/ThaibaHive/src/lib/services/__tests__/preference-audit.test.ts) — Verified asynchronous logging non-blocking execution, retention pruning, and explicit `super_admin` role restrictions.
- [src/app/api/workspaces/__tests__/aggregation.test.ts](file:///d:/ThaibaHive/src/app/api/workspaces/__tests__/aggregation.test.ts) — Mocked and verified cashier ledger sums and parent student attendance roster and dues aggregates.

### Documentation & Sprint Logs
- [docs/sprint-027-operations-guide.md](file:///d:/ThaibaHive/docs/sprint-027-operations-guide.md) — Technical operating documentation.
- [.ai/08_DECISION_LOG.md](file:///d:/ThaibaHive/.ai/08_DECISION_LOG.md) — Recorded ADR-013 (Optimistic Locking DB Queue) and ADR-014 (Relational preferences auditing).
- [.ai/FEATURES.md](file:///d:/ThaibaHive/.ai/FEATURES.md) — Feature map updates.
- [.ai/CHANGELOG.md](file:///d:/ThaibaHive/.ai/CHANGELOG.md) — Changelog document updates.
- [.ai/execution/Sprint-027-Execution-Log.md](file:///d:/ThaibaHive/.ai/execution/Sprint-027-Execution-Log.md) — Task list execution verification tracking.

---

## APIs
- `GET /api/workspaces/data` — Fetches principal, teacher, cashier, and parent aggregated metrics.
- `PUT /api/workspaces/preferences` — Updates widgets customization configurations and generates audit entries.

---

## Database Migrations
- Migration files created under `drizzle/` and applied to SQLite development databases.
- PostgreSQL schema tables parity verified.

---

## Verification & Tests

### Server-Side Tests
- Run `pnpm test`
- **Result:** ✅ PASSING (199/199 test suites passing, 860/860 tests passing successfully)
- Verified report queue, preferences auditing role checks, and workspace aggregation queries specifically.

### Build Checks
- Run `pnpm typecheck`
- **Result:** ✅ CLEAN (Exit Code 0)
