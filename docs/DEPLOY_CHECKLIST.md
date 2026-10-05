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
