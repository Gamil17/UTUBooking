#!/usr/bin/env bash
# UTUBooking — Weekly DR backup verification
# Restores latest S3 backup to a temp RDS instance, verifies row counts, then deletes it.
# Run by backup-verify.yml GitHub Actions workflow.
#
# Required env vars:
#   AWS_BACKUP_BUCKET, AWS_REGION, DATABASE_URL (for row count comparison)
#   TEMP_DB_INSTANCE_ID (default: utu-db-dr-test)
#   TEMP_DB_PASSWORD
#   DB_SUBNET_GROUP, DB_SECURITY_GROUP

set -euo pipefail

TEMP_DB_ID="${TEMP_DB_INSTANCE_ID:-utu-db-dr-test}"
AWS_REGION="${AWS_REGION:-me-south-1}"
START_TIME=$(date -u +%s)

cleanup() {
  echo "[verify] Cleaning up temporary RDS instance: ${TEMP_DB_ID}"
  aws rds delete-db-instance \
    --db-instance-identifier "${TEMP_DB_ID}" \
    --skip-final-snapshot \
    --region "${AWS_REGION}" 2>/dev/null || true
  aws rds wait db-instance-deleted \
    --db-instance-identifier "${TEMP_DB_ID}" \
    --region "${AWS_REGION}" 2>/dev/null || true
  echo "[verify] Cleanup complete"
}
trap cleanup EXIT

# ── Create temporary RDS instance ─────────────────────────────────────────────
echo "[verify] Creating temp RDS instance: ${TEMP_DB_ID}"
aws rds create-db-instance \
  --db-instance-identifier "${TEMP_DB_ID}" \
  --db-instance-class db.t4g.medium \
  --engine postgres \
  --engine-version '16.4' \
  --master-username utu_user \
  --master-user-password "${TEMP_DB_PASSWORD:?TEMP_DB_PASSWORD required}" \
  --db-name utu_booking \
  --db-subnet-group-name "${DB_SUBNET_GROUP:?DB_SUBNET_GROUP required}" \
  --vpc-security-group-ids "${DB_SECURITY_GROUP:?DB_SECURITY_GROUP required}" \
  --allocated-storage 50 \
  --storage-type gp3 \
  --no-publicly-accessible \
  --no-multi-az \
  --region "${AWS_REGION}"

echo "[verify] Waiting for temp instance to be available..."
aws rds wait db-instance-available \
  --db-instance-identifier "${TEMP_DB_ID}" \
  --region "${AWS_REGION}"

TEMP_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "${TEMP_DB_ID}" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region "${AWS_REGION}")

TEMP_DB_URL="postgres://utu_user:${TEMP_DB_PASSWORD}@${TEMP_ENDPOINT}:5432/utu_booking"

# ── Restore latest backup ──────────────────────────────────────────────────────
export TARGET_DATABASE_URL="${TEMP_DB_URL}"
bash infra/scripts/pg-restore.sh

# ── Compare row counts with production ────────────────────────────────────────
echo "[verify] Comparing row counts ..."

PROD_COUNTS=$(psql "${DATABASE_URL}" -t -A -c "
  SELECT SUM(c) FROM (
    SELECT COUNT(*) AS c FROM users
    UNION ALL SELECT COUNT(*) FROM bookings
    UNION ALL SELECT COUNT(*) FROM payments
  ) t
")

RESTORE_COUNTS=$(psql "${TEMP_DB_URL}" -t -A -c "
  SELECT SUM(c) FROM (
    SELECT COUNT(*) AS c FROM users
    UNION ALL SELECT COUNT(*) FROM bookings
    UNION ALL SELECT COUNT(*) FROM payments
  ) t
")

echo "[verify] Production total rows (users+bookings+payments): ${PROD_COUNTS}"
echo "[verify] Restored total rows: ${RESTORE_COUNTS}"

# Allow up to 1% variance (24h of transactions may differ)
VARIANCE=$(echo "scale=4; (${PROD_COUNTS} - ${RESTORE_COUNTS}) / ${PROD_COUNTS} * 100" | bc)
echo "[verify] Variance: ${VARIANCE}%"

if (( $(echo "${VARIANCE#-} > 1" | bc -l) )); then
  echo "[verify] FAIL: Row count variance exceeds 1% — backup may be corrupted"
  exit 1
fi

END_TIME=$(date -u +%s)
DURATION=$(( END_TIME - START_TIME ))
echo "[verify] PASS: Backup verified in ${DURATION}s. Variance: ${VARIANCE}%"
