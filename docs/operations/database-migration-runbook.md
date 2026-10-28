# Database Migration & Operational Governance Runbook

## Overview & Architecture

ThaibaHive employs a dual-dialect database architecture:
- **SQLite / LibSQL (Turso)**: Used for rapid development, distributed edge nodes, and serverless edge databases.
- **PostgreSQL**: Used for enterprise multi-tenant deployments with native connection pooling and row-level security.

---

## 1. Migration Runner (`scripts/db/migrate.ts`)

The migration runner is hardened to enforce transactional safety, deterministic state management, and strict idempotency:

```bash
pnpm db:migrate
```

### Safety Guarantees:
1. **Atomic Transaction per Migration File**:
   - Each migration file (`0000_...sql` to `0049_...sql`) is wrapped in a dedicated write transaction (`client.transaction('write')`).
   - If any statement in a migration fails, the entire file rolls back automatically via `await tx.rollback()`. No partial state or orphan tables are committed.
2. **Strict Idempotency Boundary**:
   - Errors are only bypassed if they match genuine re-execution idempotency:
     - `already exists` (table or index already present)
     - `duplicate column`
     - `columns are not unique`
   - Real structural errors (such as `no such table`, syntax errors, or foreign key mismatches) **fail hard** with exit code `1`.
3. **Execution Ledger**:
   - Tracked in `__drizzle_applied_migrations` with `id`, `name`, and `applied_at`.
   - Re-running `pnpm db:migrate` against a fully migrated database performs a zero-mutation no-op check in < 2 seconds.

---

## 2. Bootstrapping a Fresh / Empty Environment

Because early sprint tables (`attendance_register`, `biometric_logs`, `classes`, `students`, `student_guardians`, `student_attendance_logs`, `guardians`, `stream_recordings`, `streaming_sessions`, `federated_identity_mappings`, `mark_entries`) were prototyped directly into schema baselines before incremental migration files were generated, provisioning a brand-new database from scratch requires a 2-step workflow:

### Step 1: Push Schema Baseline
```bash
pnpm db:push
```
- Drizzle Kit directly provisions all 453 declared tables from `packages/db/schema.ts` in ~5 seconds.

### Step 2: Synchronize Migration Ledger
```bash
pnpm db:migrate
```
- Replays versioned migrations idempotently and records all 50 migration files in `__drizzle_applied_migrations`.
- Any subsequent run of `pnpm db:migrate` is an instant no-op.

---

## 3. Historical Production Data Mutations (Audit Ledger)

### Audit Logs Sequence Renumbering (Sprint-052)
- **Context**: Migration `0045_clammy_tag.sql` introduced `sequence_number integer DEFAULT 1 NOT NULL` and a unique constraint `CREATE UNIQUE INDEX idx_audit_logs_tenant_seq ON audit_logs(tenant_id, sequence_number)`.
- **Intervention**: Existing rows in `audit_logs` (12 rows in tenant `default`) all defaulted to `1`, causing a unique constraint collision on statement execution.
- **Resolution**:
  ```sql
  -- Executed on live Turso prior to migration 0045 completion:
  UPDATE audit_logs SET sequence_number = 1 WHERE id = 'aud_1792577539703_eb5bd4b6';
  UPDATE audit_logs SET sequence_number = 2 WHERE id = 'aud_1792577708532_d55e9666';
  UPDATE audit_logs SET sequence_number = 3 WHERE id = 'aud_1792577732499_5ec22705';
  UPDATE audit_logs SET sequence_number = 4 WHERE id = 'aud_1792578524327_4d2220c9';
  UPDATE audit_logs SET sequence_number = 5 WHERE id = 'aud_1792580408545_df012e0b';
  -- (Sequentially assigned 1..12 ordered by created_at ASC, id ASC)
  ```
- **Cryptographic Integrity**: Verified via `pnpm compliance:verify` — 374 blocks and 187 Merkle roots remain 100% valid and untampered.

### Staff Meal Preferences Index Parity
- **Context**: In SQLite dev database, `staff_meal_preferences` had an inline `.unique()` on `staff_id` which generated an immutable `sqlite_autoindex_staff_meal_preferences_2`, conflicting with `drizzle-kit push`.
- **Resolution**:
  - Codebase aligned to `uniqueIndex("idx_staff_meal_preferences_staff_id").on(t.staffId)` across `packages/db/schema.ts` and `packages/db/schema.pg.ts`.
  - Migration `drizzle/0044_odd_mephistopheles.sql` aligned to `idx_staff_meal_preferences_staff_id`.
  - `dev.db` table rebuilt cleanly, removing the redundant autoindex.
