# Database Disaster Recovery & Restore Runbook

## Overview
This runbook defines the operational procedure for restoring the ThaibaHive production database from S3 backup archives in the event of catastrophic data corruption, unrecoverable migration failure, or infrastructure outage.

---

## 1. SLA Objectives
- **Recovery Point Objective (RPO)**: \<= 24 hours (Automated daily snapshot at 03:00 UTC).
- **Recovery Time Objective (RTO)**: \<= 45 minutes for full snapshot reload and verification.

---

## 2. Backup Infrastructure & Retention
- **Primary Backup Storage**: AWS S3 (`s3://${BACKUP_S3_BUCKET}/db-backups/`).
- **Encryption**: Server-Side Encryption with AWS KMS (`--sse aws:kms`).
- **Integrity**: SHA-256 cryptographic checksums generated per backup (`.sql.gz.sha256`).
- **Retention Period**: 30 days rolling lifecycle.
- **Automated Validation**: Weekly automated drill restores the latest backup into an isolated scratch PostgreSQL 16 container (`.github/workflows/db-restore-test.yml`).

---

## 3. Emergency Restore Procedure (Step-by-Step)

### Prerequisites
- Access to AWS credentials with S3 read permissions for the backup bucket.
- Access to target PostgreSQL instance (superuser or schema owner privileges).
- `psql`, `gzip`, `sha256sum`, and `aws-cli` v2 installed locally or on the bastion server.

### Step 1: Identify and Download the Latest Clean Backup
```bash
export BACKUP_S3_BUCKET="thaibahive-backups"
export BACKUP_S3_PREFIX="db-backups"

# Find latest backup key
LATEST_BACKUP=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" \
  | grep '\.sql\.gz$' \
  | sort -k1,2 \
  | tail -n1 \
  | awk '{print $4}')

echo "Latest backup found: $LATEST_BACKUP"

# Download backup archive and checksum
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${LATEST_BACKUP}" "./${LATEST_BACKUP}"
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${LATEST_BACKUP}.sha256" "./${LATEST_BACKUP}.sha256"
```

### Step 2: Verify Checksum and Archive Integrity
```bash
# Verify cryptographic hash
sha256sum -c "${LATEST_BACKUP}.sha256"

# Verify gzip archive integrity
gzip -t "${LATEST_BACKUP}"
```
*Do not proceed if checksum or gzip tests fail.*

### Step 3: Restore to Target Database
```bash
export TARGET_DATABASE_URL="postgres://user:password@hostname:5432/dbname?sslmode=require"

# Stream decompressed SQL directly into target Postgres instance
gunzip -c "${LATEST_BACKUP}" | psql "$TARGET_DATABASE_URL"
```

### Step 4: Verify Restored Data Integrity
Run the built-in restore verification suite against the target instance:
```bash
DATABASE_URL="$TARGET_DATABASE_URL" pnpm db:verify:restore
```

Expected output:
```text
[verify-restore] Verifying restored database integrity (Dialect: PostgreSQL)...
[verify-restore] OK: Table 'institutions' present with X rows.
[verify-restore] OK: Table 'staff' present with Y rows.
...
[verify-restore] Database restore verification completed successfully.
```

---

## 4. Post-Restore Checklist
1. **Tenant Isolation Scan**: Verify application tenant isolation boundaries:
   ```bash
   pnpm security:tenants
   ```
2. **Column Verification**: Verify required multi-tenant column coverage:
   ```bash
   DATABASE_URL="$TARGET_DATABASE_URL" pnpm db:verify:columns
   ```
3. **Smoke Testing**: Run application health check and smoke test suite:
   ```bash
   pnpm test:staging:smoke
   ```
4. **DNS / Connection Switch**: Update `DATABASE_URL` secret on application hosts to point to the restored database.

---

## 5. Escalation & Contacts
- **Database Administrator / SecOps Team**: Alert on incident channel `#secops-database`.
- **Incident Commander**: Designate primary lead for failover and DNS redirection.
