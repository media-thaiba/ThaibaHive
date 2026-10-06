#!/usr/bin/env bash
# ============================================================================
# ThaibaHive Automated Storage Backup Script
# Synchronizes Supabase Storage ("uploads" bucket) to encrypted AWS S3 backup storage
# Target RPO: Weekly cold storage sync
#
# Required env vars:
#   NEXT_PUBLIC_SUPABASE_URL  - Supabase Project URL (e.g., https://xxx.supabase.co)
#   SUPABASE_SERVICE_ROLE_KEY - Supabase Service Role Secret Key
#   BACKUP_S3_BUCKET          - AWS S3 backup bucket name
#   AWS_ACCESS_KEY_ID         - AWS access key
#   AWS_SECRET_ACCESS_KEY     - AWS secret key
#   AWS_DEFAULT_REGION        - AWS region
#
# Optional:
#   BACKUP_S3_PREFIX          - Prefix in S3 (default: storage-backups)
#   STORAGE_BUCKET_NAME       - Bucket to sync (default: uploads)
#   DRY_RUN                   - "true" to simulate sync without uploading
# ============================================================================
set -euo pipefail

if [ "${DRY_RUN:-false}" = "true" ]; then
  echo "[storage-backup] Dry run enabled — skipping Supabase Storage backup."
  exit 0
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}"
BUCKET_NAME="${STORAGE_BUCKET_NAME:-uploads}"
S3_PREFIX="${BACKUP_S3_PREFIX:-storage-backups}"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || [ -z "${BACKUP_S3_BUCKET:-}" ] || [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "[storage-backup] ERROR: Required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_S3_BUCKET, AWS credentials) are missing." >&2
  exit 1
fi

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
TMPDIR="/tmp/thaibahive-storage-backup-${TIMESTAMP}"
mkdir -p "$TMPDIR"

echo "[storage-backup] Fetching object list for bucket '${BUCKET_NAME}' from ${SUPABASE_URL}..."

# List objects using Supabase Storage REST API
OBJECTS_JSON=$(curl -s -f -X POST "${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000, "offset": 0, "sortBy": {"column": "name", "order": "asc"}}' || echo "[]")

COUNT=$(echo "$OBJECTS_JSON" | grep -o '"name":' | wc -l || echo "0")
echo "[storage-backup] Discovered ${COUNT} objects in bucket '${BUCKET_NAME}'."

if [ "$COUNT" -gt 0 ]; then
  echo "$OBJECTS_JSON" | grep -oP '(?<="name":")[^"]*' | while read -r obj; do
    if [ -n "$obj" ]; then
      TARGET_PATH="${TMPDIR}/${obj}"
      mkdir -p "$(dirname "$TARGET_PATH")"
      echo "[storage-backup] Downloading ${obj}..."
      curl -s -f -o "$TARGET_PATH" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        "${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET_NAME}/${obj}" || echo "[storage-backup] Warning: Failed to download ${obj}"
    fi
  done

  echo "[storage-backup] Syncing files to s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}/..."
  aws s3 sync "$TMPDIR" "s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}/" \
    --storage-class STANDARD_IA \
    --sse aws:kms

  echo "[storage-backup] Storage sync completed successfully."
else
  echo "[storage-backup] Bucket is empty or no files returned."
fi

rm -rf "$TMPDIR"
echo "[storage-backup] Cleanup completed."
