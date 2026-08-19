#!/usr/bin/env bash
# ============================================================================
# ThaibaHive Automated Database Backup Script
# Task P3-89: Point-in-time PostgreSQL backups with S3 upload + retention
#
# Required env vars:
#   DATABASE_URL         - PostgreSQL connection string (host-format)
#   BACKUP_S3_BUCKET     - S3 bucket name (e.g., thaibahive-backups)
#   BACKUP_S3_PREFIX     - S3 key prefix (e.g., db-backups)
#   AWS_ACCESS_KEY_ID    - AWS credentials
#   AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION
#
# Optional:
#   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
# ============================================================================
set -euo pipefail

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
FILENAME="thaibahive_backup_${TIMESTAMP}.sql.gz"
TMPDIR="/tmp/thaibahive-backups"
S3_KEY="${BACKUP_S3_PREFIX}/${FILENAME}"

mkdir -p "$TMPDIR"

echo "[backup] Starting PostgreSQL backup at ${TIMESTAMP}..."

# Extract connection details from DATABASE_URL
# Expected format: postgres://user:pass@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*@.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

DB_PORT="${DB_PORT:-5432}"

echo "[backup] Dumping database: ${DB_NAME} from ${DB_HOST}:${DB_PORT}..."

PGPASSWORD="${DB_PASS}" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-password \
  | gzip > "${TMPDIR}/${FILENAME}"

BACKUP_SIZE=$(du -sh "${TMPDIR}/${FILENAME}" | cut -f1)
echo "[backup] Backup created: ${TMPDIR}/${FILENAME} (${BACKUP_SIZE})"

echo "[backup] Uploading to s3://${BACKUP_S3_BUCKET}/${S3_KEY}..."
aws s3 cp "${TMPDIR}/${FILENAME}" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
  --storage-class STANDARD_IA \
  --metadata "db=${DB_NAME},timestamp=${TIMESTAMP}"

echo "[backup] Upload complete."

# Clean up old backups past retention period
echo "[backup] Removing backups older than ${RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -u -d "${RETENTION_DAYS} days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d +"%Y-%m-%dT%H:%M:%SZ")
aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" \
  | awk '{print $4}' \
  | while read -r key; do
      FILE_DATE=$(echo "$key" | grep -oP '\d{8}T\d{6}Z' | head -1 || true)
      if [[ -n "$FILE_DATE" ]] && [[ "$FILE_DATE" < "${CUTOFF_DATE//[-:]/}" ]]; then
        echo "[backup] Deleting old backup: ${key}"
        aws s3 rm "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${key}"
      fi
    done

# Cleanup temp file
rm -f "${TMPDIR}/${FILENAME}"
echo "[backup] Done."
