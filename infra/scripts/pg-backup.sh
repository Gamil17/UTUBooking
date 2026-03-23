#!/usr/bin/env bash
# UTUBooking — PostgreSQL daily backup to S3
# Runs as an ECS Scheduled Task at 02:00 AST (23:00 UTC) daily.
# Cron expression: cron(0 23 * * ? *)
#
# Required environment variables (injected by ECS task definition):
#   DATABASE_URL      — postgres primary connection string
#   AWS_BACKUP_BUCKET — S3 bucket name (utu-db-backups-<AccountId>)
#   PUSHGATEWAY_URL   — Prometheus Pushgateway for backup metric
#   AWS_REGION        — me-south-1

set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
FILENAME="utu_booking_${TIMESTAMP}.dump"
TMP_FILE="/tmp/${FILENAME}"

echo "[backup] Starting PostgreSQL backup: ${FILENAME}"

# ── Dump ─────────────────────────────────────────────────────────────────────
# custom format: faster restore than plain SQL, supports parallel restore
pg_dump \
  --format=custom \
  --no-acl \
  --no-owner \
  --compress=6 \
  --dbname="${DATABASE_URL}" \
  --file="${TMP_FILE}"

DUMP_SIZE=$(du -sh "${TMP_FILE}" | cut -f1)
echo "[backup] Dump complete: ${DUMP_SIZE}"

# ── Upload to S3 ──────────────────────────────────────────────────────────────
aws s3 cp "${TMP_FILE}" \
  "s3://${AWS_BACKUP_BUCKET}/daily/${FILENAME}" \
  --region "${AWS_REGION:-me-south-1}" \
  --sse aws:kms \
  --no-progress

echo "[backup] Uploaded to s3://${AWS_BACKUP_BUCKET}/daily/${FILENAME}"

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -f "${TMP_FILE}"

# ── Push metric to Prometheus Pushgateway ────────────────────────────────────
# This metric powers the BackupStale alert in utubooking-alerts.yml
if [ -n "${PUSHGATEWAY_URL:-}" ]; then
  EPOCH=$(date -u +%s)
  cat <<EOF | curl -s --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/pg_backup/instance/daily"
# HELP backup_last_success_timestamp Unix timestamp of last successful PostgreSQL backup
# TYPE backup_last_success_timestamp gauge
backup_last_success_timestamp ${EPOCH}
EOF
  echo "[backup] Metric pushed to Pushgateway (timestamp: ${EPOCH})"
fi

echo "[backup] Done. Backup file: ${FILENAME} (${DUMP_SIZE})"
