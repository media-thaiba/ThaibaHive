#!/usr/bin/env bash
# ============================================================================
# ThaibaHive Automated Database Backup Script
# Scheduled PostgreSQL daily snapshot backups with S3 upload + SHA-256 verification
# Target RPO: <= 24 hours (Scheduled Daily Snapshot)
#
# Required env vars:
#   DATABASE_URL         - PostgreSQL connection string (e.g. postgres://user:pass@host:5432/dbname?sslmode=require)
#   BACKUP_S3_BUCKET     - S3 bucket name (e.g., thaibahive-backups)
#   BACKUP_S3_PREFIX     - S3 key prefix (e.g., db-backups)
#   AWS_ACCESS_KEY_ID    - AWS credentials
#   AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION
#
# Optional:
#   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
#   AWS_KMS_KEY_ID        - Optional custom AWS KMS Key ARN / ID for encryption
#   DRY_RUN               - "true" to skip database dump and S3 upload
# ============================================================================
set -euo pipefail

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "[backup] Dry run enabled — skipping database backup and S3 upload."
  exit 0
fi

# Strict validation: Fail fast with non-zero exit code if required secrets are absent
if [ -z "${DATABASE_URL:-}" ] || [ -z "${BACKUP_S3_BUCKET:-}" ] || [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "[backup] ERROR: Required backup environment variables (DATABASE_URL, BACKUP_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are missing." >&2
  exit 1
fi

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
FILENAME="thaibahive_backup_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="thaibahive_backup_${TIMESTAMP}.sql.gz.sha256"
TMPDIR="/tmp/thaibahive-backups"
S3_KEY="${BACKUP_S3_PREFIX}/${FILENAME}"
S3_CHECKSUM_KEY="${BACKUP_S3_PREFIX}/${CHECKSUM_FILE}"

mkdir -p "$TMPDIR"

echo "[backup] Starting PostgreSQL backup at ${TIMESTAMP}..."

# Execute pg_dump directly using DATABASE_URL to avoid fragile regex/sed parsing and preserve SSL parameters
pg_dump --clean --if-exists --no-owner --no-privileges "$DATABASE_URL" | gzip -c > "${TMPDIR}/${FILENAME}"

# Verify the dump file exists and has non-zero size
if [ ! -s "${TMPDIR}/${FILENAME}" ]; then
  echo "[backup] ERROR: Database dump produced an empty file. Backup aborted." >&2
  rm -f "${TMPDIR}/${FILENAME}"
  exit 1
fi

# Verify gzip archive integrity
if ! gzip -t "${TMPDIR}/${FILENAME}"; then
  echo "[backup] ERROR: Database dump archive is corrupted. Backup aborted." >&2
  rm -f "${TMPDIR}/${FILENAME}"
  exit 1
fi

# Compute cryptographic SHA-256 checksum for audit and restore verification
(cd "$TMPDIR" && sha256sum "$FILENAME" > "$CHECKSUM_FILE")

BACKUP_SIZE=$(du -sh "${TMPDIR}/${FILENAME}" | cut -f1)
echo "[backup] Backup created successfully: ${TMPDIR}/${FILENAME} (${BACKUP_SIZE})"
echo "[backup] SHA-256 Checksum: $(cat "${TMPDIR}/${CHECKSUM_FILE}")"

# Configure Server-Side Encryption (SSE)
SSE_ARGS=("--sse" "aws:kms")
if [ -n "${AWS_KMS_KEY_ID:-}" ]; then
  SSE_ARGS+=("--sse-kms-key-id" "${AWS_KMS_KEY_ID}")
fi

echo "[backup] Uploading backup to s3://${BACKUP_S3_BUCKET}/${S3_KEY}..."
aws s3 cp "${TMPDIR}/${FILENAME}" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
  --storage-class STANDARD_IA \
  "${SSE_ARGS[@]}" \
  --metadata "timestamp=${TIMESTAMP}"

echo "[backup] Uploading SHA-256 checksum to s3://${BACKUP_S3_BUCKET}/${S3_CHECKSUM_KEY}..."
aws s3 cp "${TMPDIR}/${CHECKSUM_FILE}" "s3://${BACKUP_S3_BUCKET}/${S3_CHECKSUM_KEY}" \
  "${SSE_ARGS[@]}"

echo "[backup] S3 upload completed with SSE-KMS."

# Clean up old backups past retention period
echo "[backup] Removing backups older than ${RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -u -d "${RETENTION_DAYS} days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d +"%Y-%m-%dT%H:%M:%SZ")
aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" \
  | awk '{print $4}' \
  | while read -r key; do
      FILE_DATE=$(echo "$key" | grep -oP '\d{8}T\d{6}Z' | head -1 || true)
      if [[ -n "$FILE_DATE" ]] && [[ "$FILE_DATE" < "${CUTOFF_DATE//[-:]/}" ]]; then
        echo "[backup] Deleting expired backup asset: ${key}"
        aws s3 rm "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${key}"
      fi
    done

# Clean up local temporary files
rm -f "${TMPDIR}/${FILENAME}" "${TMPDIR}/${CHECKSUM_FILE}"
echo "[backup] Database backup process finished successfully."
