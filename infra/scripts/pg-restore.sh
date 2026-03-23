#!/usr/bin/env bash
# UTUBooking — PostgreSQL restore from S3 backup
# Used during DR drills and real incidents.
# See: infra/dr/restore-runbook.md for full RTO procedure.
#
# Usage:
#   ./pg-restore.sh [BACKUP_FILENAME]
#
# If BACKUP_FILENAME is omitted, restores the latest daily backup.
# Example:
#   ./pg-restore.sh utu_booking_20260310-230001.dump
#   ./pg-restore.sh  # restores latest

set -euo pipefail

AWS_BACKUP_BUCKET="${AWS_BACKUP_BUCKET:?AWS_BACKUP_BUCKET is required}"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required (use a fresh RDS instance for DR)}"
AWS_REGION="${AWS_REGION:-me-south-1}"

# ── Determine backup file ─────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  FILENAME="$1"
else
  echo "[restore] Finding latest backup in s3://${AWS_BACKUP_BUCKET}/daily/ ..."
  FILENAME=$(aws s3 ls "s3://${AWS_BACKUP_BUCKET}/daily/" \
    --region "${AWS_REGION}" \
    | sort | tail -n 1 | awk '{print $4}')
  echo "[restore] Latest backup: ${FILENAME}"
fi

TMP_FILE="/tmp/${FILENAME}"

# ── Download from S3 ──────────────────────────────────────────────────────────
echo "[restore] Downloading s3://${AWS_BACKUP_BUCKET}/daily/${FILENAME} ..."
aws s3 cp \
  "s3://${AWS_BACKUP_BUCKET}/daily/${FILENAME}" \
  "${TMP_FILE}" \
  --region "${AWS_REGION}" \
  --no-progress

DUMP_SIZE=$(du -sh "${TMP_FILE}" | cut -f1)
echo "[restore] Downloaded: ${DUMP_SIZE}"

# ── Restore ───────────────────────────────────────────────────────────────────
echo "[restore] Restoring to ${TARGET_DATABASE_URL} ..."
pg_restore \
  --clean \
  --if-exists \
  --no-acl \
  --no-owner \
  --jobs=4 \
  --dbname="${TARGET_DATABASE_URL}" \
  "${TMP_FILE}"

echo "[restore] Restore complete"

# ── Verify row counts ─────────────────────────────────────────────────────────
echo "[restore] Verifying row counts ..."
psql "${TARGET_DATABASE_URL}" <<'SQL'
SELECT
  'users'          AS tbl, COUNT(*) AS rows FROM users
UNION ALL SELECT 'bookings',       COUNT(*) FROM bookings
UNION ALL SELECT 'payments',       COUNT(*) FROM payments
UNION ALL SELECT 'loyalty_accts',  COUNT(*) FROM loyalty_accounts
UNION ALL SELECT 'points_ledger',  COUNT(*) FROM points_ledger
ORDER BY tbl;
SQL

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -f "${TMP_FILE}"
echo "[restore] Done. File cleaned up."
