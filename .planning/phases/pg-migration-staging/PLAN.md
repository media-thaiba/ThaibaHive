# Implementation Plan - Production PostgreSQL Migration & Staging Test (DevOps) v2.0

Validate and finalize the dual-database architecture for production deployment on PostgreSQL/Supabase, fixing schema drift, expanding test coverage, and validating query shims against real PostgreSQL.

---

## Context

The dual-database architecture routes queries to SQLite (dev) or PostgreSQL (prod) based on `DATABASE_URL` prefix. A `wrapPgDb` Proxy shim bridges PostgreSQL's result format to match SQLite's `.get()`, `.all()`, `.run()` API so the entire app works unchanged.

**v1.1 gaps addressed in this revision:**
- `passwordResetTokens` table missing from PG schema (production-breaking)
- No test coverage for the `wrapPgDb` shim
- No schema parity validation between SQLite and PG schemas
- Inaccurate file status labels (items marked "NEW" that already exist)
- No integration verification against real PostgreSQL

---

## Schema Drift Summary

| Drift | Severity | Fix |
|-------|----------|-----|
| `passwordResetTokens` table missing from `schema.pg.ts` | **HIGH** | Add table to PG schema + regenerate migration |
| `appDefaultRoles.permissions` is `text` instead of `jsonb` in PG | MEDIUM | Change to `jsonb` in `schema.pg.ts` |
| `packages/db/package.json` missing `schema.pg` export | LOW | Add export entry |
| `src/db/schema.ts` only re-exports SQLite schema | LOW | Add conditional PG schema re-export |

Total tables: SQLite = 71, PostgreSQL = 70 (after fix: 71 = 71).

---

## Proposed Changes

### 1. Fix PostgreSQL Schema Drift (`packages/db/schema.pg.ts`)

#### [MODIFY] `packages/db/schema.pg.ts`
- Add `passwordResetTokens` table definition (5 columns: `id`, `staffId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt`) matching `schema.ts` lines 1069-1076, using PG-native types (`serial` for id is wrong here — use `text` PK to match SQLite pattern).
- Change `appDefaultRoles.permissions` from `text("permissions")` to `jsonb("permissions")` to match the pattern of all other JSON columns.

**Verify:** After this change, both schemas define exactly 71 tables with matching column names and semantics (types use appropriate PG/SQLite mappings).

---

### 2. Add Package Export (`packages/db/package.json`)

#### [MODIFY] `packages/db/package.json`
- Add `"./schema.pg": "./schema.pg.ts"` to the `exports` map.

```json
"exports": {
  ".": "./index.ts",
  "./schema": "./schema.ts",
  "./schema.pg": "./schema.pg.ts"
}
```

---

### 3. Regenerate PostgreSQL Migration (`drizzle/postgres/`)

#### [REPLACE] `drizzle/postgres/0000_light_lockheed.sql`
- The existing migration was generated before the `passwordResetTokens` fix.
- After modifying `schema.pg.ts`, run `pnpm db:generate:pg` to regenerate.
- The new migration must include the `password_reset_tokens` table and the `jsonb` type change for `app_default_roles.permissions`.

**Verify:** Open the generated `.sql` file and confirm `password_reset_tokens` table and all indexes are present.

---

### 4. Fix Package Re-export (`src/db/index.ts`)

#### [MODIFY] `src/db/index.ts`
- Currently: `export * from "@thaiba/db/schema"` (SQLite only).
- Change to re-export the correct schema based on the active database mode, or re-export both schemas under distinct names.

**Recommended approach:** The `db` instance from `@thaiba/db` already carries the correct schema at runtime (via the `pgSchema` or `sqliteSchema` passed to `drizzle()`). For type-level consumers, add:

```ts
export { db } from "@thaiba/db";
export * from "@thaiba/db/schema";
// PG schema available via: import * as pgSchema from "@thaiba/db/schema.pg"
```

Document that PG-specific schema imports should use `@thaiba/db/schema.pg` directly.

---

### 5. Create PG Shim Test Suite (`src/lib/__tests__/pg-shim.test.ts`)

#### [NEW] `src/lib/__tests__/pg-shim.test.ts`

Unit tests for `wrapPgDb` and `wrapBuilder` proxy behavior. The test mocks the underlying Drizzle result format (not a real DB) to verify the shim's contract.

**Test cases:**

```ts
// Mock Drizzle result shapes
// - SQLite-style: result is an array directly
// - PG-style: result is { rows: [...], rowCount: N }

describe("wrapPgDb / wrapBuilder", () => {
  describe(".get()", () => {
    it("returns first row when result is array (SQLite path)")
    it("returns first row from rows when result is PG-style object")
    it("returns undefined when result is empty array")
    it("returns undefined when rows is empty array")
  })

  describe(".all()", () => {
    it("returns full array when result is array")
    it("returns rows array when result is PG-style object")
    it("returns empty array for empty results")
  })

  describe(".run()", () => {
    it("returns { changes: rowCount } from PG-style result")
    it("returns { changes: 0 } when rowCount is undefined")
    it("always returns lastInsertRowid as undefined")
  })

  describe("chained queries", () => {
    it("proxies .where() and returns wrapped builder")
    it("proxies .orderBy() and returns wrapped builder")
    it("proxies .limit() and returns wrapped builder")
  })

  describe("transaction()", () => {
    it("wraps transaction object with wrapPgDb")
    it("passes config to underlying transaction")
  })

  describe("error propagation", () => {
    it("preserves rejected promise from underlying query")
  })
})
```

**Mock pattern** (follows existing `leaves.test.ts` convention):

```ts
jest.mock("@thaiba/db", () => { ... });
// or import wrapPgDb directly and construct mock builders
```

Since `wrapPgDb` is not currently exported, the test will either:
- **Option A:** Export `wrapPgDb` from `packages/db/index.ts` (preferred — makes it testable)
- **Option B:** Test via the `db` export by setting `DATABASE_URL` to a postgres URL in the test env

**Recommended:** Option A — add a named export for `wrapPgDb` (not the default `db`), keeping the default export unchanged.

---

### 6. Create Schema Parity Test (`src/lib/__tests__/schema-parity.test.ts`)

#### [NEW] `src/lib/__tests__/schema-parity.test.ts`

Prevents future drift by comparing table/column definitions at test time.

```ts
import * as sqliteSchema from "@thaiba/db/schema";
import * as pgSchema from "@thaiba/db/schema.pg";

describe("Schema parity: SQLite vs PostgreSQL", () => {
  it("defines the same table names", () => {
    const sqliteTables = Object.keys(sqliteSchema).filter(k => /* is table */);
    const pgTables = Object.keys(pgSchema).filter(k => /* is table */);
    expect(pgTables.sort()).toEqual(sqliteTables.sort());
  });

  it("defines matching column names per table", () => {
    // For each shared table, compare column keys (ignoring type differences)
  });

  it("no extra tables in SQLite that are missing from PG", () => {
    // Explicit check for passwordResetTokens scenario
  });
});
```

**Detection approach:** Drizzle table objects have a `$inferSelect` type and a `Symbol.for('drizzle:Columns')` property. At runtime, use `Object.entries(sqliteSchema)` to find objects with a `$` or column metadata property, then compare their keys.

---

### 7. Integration Verification (Manual / CI)

#### [NEW] Verification steps (not code changes)

1. **Apply PG migration to test database:**
   - Spin up a local PostgreSQL (Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:16`)
   - Set `DATABASE_URL=postgresql://postgres:test@localhost:5432/postgres`
   - Run `pnpm db:generate:pg` to regenerate migration
   - Apply with `drizzle-kit push --config=drizzle.postgres.config.ts` or direct SQL execution
   - Verify all 71 tables created (query `information_schema.tables`)

2. **Smoke-test the shim:**
   - Run `pnpm test` with `DATABASE_URL` set to the test PG
   - Verify `pg-shim.test.ts` and `schema-parity.test.ts` pass
   - Verify existing 11 test suites still pass (they mock DB, so unaffected)

3. **Type-check:**
   - `pnpm run typecheck` passes with zero errors

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `packages/db/schema.pg.ts` | MODIFY | Add `passwordResetTokens` table, fix `appDefaultRoles.permissions` to `jsonb` |
| `packages/db/package.json` | MODIFY | Add `schema.pg` export |
| `packages/db/index.ts` | MODIFY | Export `wrapPgDb` for testability |
| `src/db/index.ts` | MODIFY | Document PG schema import path |
| `drizzle/postgres/0000_light_lockheed.sql` | REGENERATE | Include new table + type fix |
| `src/lib/__tests__/pg-shim.test.ts` | NEW | Unit tests for wrapPgDb/wrapBuilder shim |
| `src/lib/__tests__/schema-parity.test.ts` | NEW | Prevents future schema drift |

---

## Verification Plan

### Automated (CI)
1. `pnpm test` — all 13 test suites pass (11 existing + 2 new)
2. `pnpm run typecheck` — zero TypeScript errors
3. `pnpm run lint` — zero lint errors

### Manual (Staging)
1. `pnpm db:generate:pg` — generates migration with all 71 tables
2. Apply migration to test PostgreSQL — all tables created
3. Verify `password_reset_tokens` table exists in PG
4. Verify `app_default_roles.permissions` column is `jsonb`

---

## Risk Notes

| Risk | Mitigation |
|------|------------|
| `wrapPgDb` depends on Drizzle's internal result format (`res.rows`, `res.rowCount`) | Pin `drizzle-orm` to `^0.45.2` (already done). Document this dependency. If Drizzle changes internals, the shim test will catch it. |
| `pg` package version may affect `rowCount` behavior | Pin `pg` to `^8.22.0` (already done). Test `.run()` returns correct `changes` count. |
| Schema parity test may be fragile if Drizzle table detection changes | Use a stable detection pattern (check for `$inferSelect` or `Symbol` properties). Add fallback table list comparison. |
| Mobile app (`thaibahive_mobile_app/api/src/db/index.ts`) has duplicated shim | Out of scope for this phase — note as tech debt. |
