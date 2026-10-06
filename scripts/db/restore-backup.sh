#!/usr/bin/env bash
# ============================================================================
# ThaibaHive PostgreSQL Restore & Verification Script
# Downloads latest S3 backup, verifies SHA-256 integrity, and restores to DB
#
# Required env vars:
#   TARGET_DATABASE_URL  - Destination PostgreSQL connection string (scratch/staging DB)
#   BACKUP_S3_BUCKET     - S3 bucket name
#   BACKUP_S3_PREFIX     - S3 key prefix (e.g., db-backups)
#   AWS_ACCESS_KEY_ID    - AWS credentials
#   AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION
# ============================================================================
set -euo pipefail

if [ -z "${TARGET_DATABASE_URL:-}" ] || [ -z "${BACKUP_S3_BUCKET:-}" ] || [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "[restore] ERROR: Missing required environment variables (TARGET_DATABASE_URL, BACKUP_S3_BUCKET, AWS credentials)." >&2
  exit 1
fi

TMPDIR="/tmp/thaibahive-restore"
mkdir -p "$TMPDIR"

echo "[restore] Locating latest backup in s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/..."

LATEST_BACKUP=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" \
  | grep '\.sql\.gz$' \
  | sort -k1,2 \
  | tail -n1 \
  | awk '{print $4}')

if [ -z "$LATEST_BACKUP" ]; then
  echo "[restore] ERROR: No backup files found in s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" >&2
  exit 1
fi

CHECKSUM_FILE="${LATEST_BACKUP}.sha256"

echo "[restore] Found latest backup: ${LATEST_BACKUP}"
echo "[restore] Downloading backup artifact and checksum..."

aws s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${LATEST_BACKUP}" "${TMPDIR}/${LATEST_BACKUP}"
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${CHECKSUM_FILE}" "${TMPDIR}/${CHECKSUM_FILE}" || echo "[restore] Note: External checksum file not found on S3."

# Verify SHA-256 checksum if checksum file exists
if [ -f "${TMPDIR}/${CHECKSUM_FILE}" ]; then
  echo "[restore] Verifying SHA-256 checksum..."
  (cd "$TMPDIR" && sha256sum -c "$CHECKSUM_FILE")
  echo "[restore] Checksum verification passed."
fi

# Test gzip integrity
echo "[restore] Verifying archive integrity..."
gzip -t "${TMPDIR}/${LATEST_BACKUP}"

echo "[restore] Restoring database dump into target PostgreSQL database..."
gunzip -c "${TMPDIR}/${LATEST_BACKUP}" | psql "$TARGET_DATABASE_URL"

echo "[restore] Database restore completed successfully."

# Cleanup
rm -rf "$TMPDIR"
