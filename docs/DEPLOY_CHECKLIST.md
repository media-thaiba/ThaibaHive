# Production Deployment Pre-Flight Checklist

Before applying migrations or deploying new platform releases to production, the DBA or Lead Engineer must execute the following safety checks.

---

## 1. Migration Safety & Duplicate Constraints Check

Migration `drizzle/postgres/0015_mute_kylun.sql` creates a unique composite constraint/index on `staff_institutions(staff_id, institution_id)`. If duplicate rows exist in production, the migration will fail mid-deploy.

### Automated Command:
```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" pnpm db:check:duplicates
```

### Direct ANSI-SQL Check:
Execute the following query directly against the target production database:
```sql
SELECT staff_id, institution_id, COUNT(*) 
FROM staff_institutions 
GROUP BY staff_id, institution_id 
HAVING COUNT(*) > 1;
```
- **Expected Result**: 0 rows returned.
- **Action if duplicates exist**: Triage and remove duplicate `(staff_id, institution_id)` pairings before applying `0015_mute_kylun.sql`.

---

## 2. Multi-Tenant Column Integrity & Scoping Check

Verify that all multi-tenant tables contain non-null, valid `institution_id` values:
```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" pnpm db:verify:columns
```

---

## 3. Unmapped Staff Diagnostic

Ensure all active staff members belong to at least one valid institution:
```sql
SELECT s.id, s.name, s.email, s.role 
FROM staff s 
LEFT JOIN staff_institutions si ON s.id = si.staff_id 
WHERE si.institution_id IS NULL AND s.is_active IS TRUE;
```
- **Expected Result**: 0 rows returned.

---

## 4. Pre-Migration Database Backup

Verify that an automated or on-demand snapshot has completed before running `pnpm db:migrate`:
```bash
./scripts/db-backup.sh
```
Confirm `.sql.gz` and `.sha256` integrity in S3 bucket.

---

## 5. Database Dialect Coverage Matrix (PostgreSQL vs SQLite)

The platform supports dual database dialects (SQLite for local edge/dev, PostgreSQL for high-concurrency production):

| Layer / Test Suite | Dialect Covered in CI | Notes / Details |
|---|---|---|
| **DDL Migrations (0000–0015)** | **PostgreSQL 16 & SQLite** | Validated via `pnpm premigrate` and `pnpm db:migrate` against a live `postgres:16` service container and SQLite file. |
| **Schema & Column Parity** | **PostgreSQL 16 & SQLite** | Verified via `packages/db/__tests__/schema-drift.test.ts` (0 column drift across 400+ tables) and `pnpm db:verify:columns`. |
| **RBAC & Tenant Isolation Matrix** | **PostgreSQL 16 & SQLite** | 8 suites in `packages/auth/` and `packages/db/` (`tenant-scope-fail-closed.test.ts`, `rbac-5tier-matrix.test.ts`, `replica-router.test.ts`, `tenant-router.test.ts`) pass against PostgreSQL. |
| **Application & API Route Suites** | **SQLite (In-Memory / File)** | 771 suites (4,535 unit/integration tests in `src/app/api/`, `src/lib/finance/`, `src/lib/operations/`) use in-memory SQLite fixtures and synchronous `.run()/.get()` driver semantics. These are NOT executed against PostgreSQL in CI. |

