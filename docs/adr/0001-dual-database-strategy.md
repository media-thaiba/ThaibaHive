# ADR 0001: Migration from Dual-Dialect SQLite/PostgreSQL Shim to Containerized PostgreSQL

## Status
Accepted

## Date
2026-10-29

## Context
ThaibaHive originally operated with a dual-dialect database strategy:
- Local development & offline mode ran SQLite / LibSQL via `dev.db`.
- Staging and production ran PostgreSQL (AWS RDS / Supabase).

To enable running the same Drizzle ORM queries across both dialects, `packages/db/index.ts` maintained complex runtime shims:
1. `syncSchemaColumnMappers`: Patched column objects at module load to reconcile naming discrepancies and prevent double JSON parsing on `jsonb`.
2. `wrapPgDb`: A Proxy wrapping PostgreSQL queries to shim SQLite method chains (`.get()`, `.all()`, `.run()`).

While convenient for zero-dependency local startup, this dual-dialect setup introduced real correctness bugs:
- `.run()` silently returning `lastInsertRowid: undefined` on PostgreSQL.
- Redundant index definitions between dialects (`uq_staff_inst`, `uq_ay_inst_id`).
- Subtle differences in boolean coercion, timestamp storage, and concurrent transaction locking.

## Decision
1. **CI Parity Guard**: Introduced `pnpm db:parity` (`scripts/db/check-schema-parity.ts`) verifying table and column parity across `schema.ts` and `schema.pg.ts` on every build.
2. **Containerized Local Postgres**: Introduced `docker-compose.postgres.yml` defining an isolated local PostgreSQL 16 service for development (`postgres://thaibahive:thaibahive_dev_password@localhost:5432/thaibahive`).
3. **Deprecation Path**: Developers are encouraged to run local PostgreSQL via `docker compose -f docker-compose.postgres.yml up -d`. Once local dev adopts PostgreSQL globally, the `wrapPgDb` Proxy and runtime column patching will be retired.

## Consequences
- **Positive**: Eliminates dialect-specific SQL bugs before code reaches staging; ensures identical constraint enforcement and query plan execution across environments.
- **Negative**: Developers require Docker / container runtime for local PostgreSQL, with fallback to SQLite remaining functional during the transition period.
