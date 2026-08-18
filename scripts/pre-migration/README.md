# Pre-Migration Scrubbing Runbook

This directory contains versioned pre-migration scrubbing scripts and hooks for ThaibaHive database migrations.

---

## Purpose

When migrating relational schemas to add unique indexes or strict constraints (such as `idx_mark_entries_schedule_student_uniq`), legacy or development databases may contain historical duplicate records that would cause migration scripts (`drizzle-kit migrate`) to abort with constraint violation errors.

These scripts provide safe, idempotent data cleaning prior to applying schema migrations.

---

## 1. When to Run

Run this script **prior** to running `pnpm db:migrate` if migrating an existing or unvalidated database instance that may contain un-deduplicated `mark_entries` rows.

### Detection Query (SQLite & PostgreSQL)

Check if any duplicates exist in your target database:

```sql
SELECT exam_schedule_id, student_id, COUNT(*) as duplicate_count
FROM mark_entries
GROUP BY exam_schedule_id, student_id
HAVING COUNT(*) > 1;
```

If the query returns 0 rows, your database is clean and no scrubbing is necessary.

---

## 2. Automated Execution (Recommended)

Run the TypeScript pre-migration runner using the npm script:

```bash
pnpm premigrate
```

Or execute directly with `tsx`:

```bash
DATABASE_URL=file:./dev.db pnpm tsx scripts/pre-migration/mark-entries-dedup.ts
```

For PostgreSQL:

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname pnpm tsx scripts/pre-migration/mark-entries-dedup.ts
```

---

## 3. Manual SQL Execution

### SQLite
Run via SQLite CLI or Drizzle studio:

```sql
DELETE FROM mark_entries
WHERE rowid NOT IN (
    SELECT MAX(rowid)
    FROM mark_entries
    GROUP BY exam_schedule_id, student_id
);
```

### PostgreSQL
Run via `psql`:

```sql
DELETE FROM mark_entries a USING (
    SELECT MIN(ctid) as ctid, exam_schedule_id, student_id
    FROM mark_entries
    GROUP BY exam_schedule_id, student_id HAVING COUNT(*) > 1
) b
WHERE a.exam_schedule_id = b.exam_schedule_id
  AND a.student_id = b.student_id
  AND a.ctid <> b.ctid;
```

---

## 4. Post-Deduplication Verification

Verify that all `(exam_schedule_id, student_id)` pairs are now distinct:

```sql
SELECT COUNT(*) - COUNT(DISTINCT exam_schedule_id || ':::' || student_id) AS duplicates_remaining
FROM mark_entries;
```

Expected result: `0`.

Once verified, proceed with database migration:
```bash
pnpm db:migrate
```
