#!/usr/bin/env bash
# =============================================================================
# migrate-all-shards.sh
#
# Runs node-pg-migrate UP against all 7 UTUBooking shard databases.
# Use this after creating a migration that must be deployed to every shard
# (e.g. GDPR tables, schema changes to bookings/users).
#
# Usage:
#   ./backend/scripts/migrate-all-shards.sh                # runs all pending migrations
#   ./backend/scripts/migrate-all-shards.sh --dry-run      # print commands only
#   MIGRATION=20260324000027 ./backend/scripts/migrate-all-shards.sh  # specific migration
#
# Requirements:
#   - node-pg-migrate installed (npm i -g node-pg-migrate, or use npx)
#   - All DB_URL_* environment variables set (loaded from backend/.env or SSM)
#   - Run from the repo root: bash backend/scripts/migrate-all-shards.sh
# =============================================================================

set -euo pipefail

MIGRATIONS_DIR="backend/migrations"
DRY_RUN="${1:-}"

# ── Shard connection strings ───────────────────────────────────────────────────
# Load from .env if not already in environment (dev only — in prod inject via SSM)
if [ -f "backend/.env" ]; then
  # shellcheck disable=SC1091
  set -o allexport
  source backend/.env
  set +o allexport
fi

# Map: shard label → env variable name
declare -A SHARD_ENV=(
  ["KSA"]="DB_URL_KSA"
  ["UAE"]="DB_URL_UAE"
  ["KWT"]="DB_URL_KWT"
  ["JOR"]="DB_URL_JOR"
  ["MAR"]="DB_URL_MAR"
  ["TUN"]="DB_URL_TUN"
  ["Istanbul/TR"]="DB_URL_ISTANBUL"
  # Phase 8–12 EU/Global expansion shards
  ["London/UK"]="DB_URL_LONDON"
  ["Frankfurt/DE"]="DB_URL_FRANKFURT"
  ["USEast"]="DB_URL_US_EAST"
  ["Montreal/CA"]="DB_URL_MONTREAL"
  ["SaoPaulo/BR"]="DB_URL_SAO_PAULO"
)

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Colour

ok()   { echo -e "${GREEN}✔ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
fail() { echo -e "${RED}✘ $*${NC}"; }
info() { echo -e "${CYAN}→ $*${NC}"; }

# ── Main ───────────────────────────────────────────────────────────────────────
echo ""
echo "============================================="
echo " UTUBooking — Migrate All Shards"
echo " Migrations dir : ${MIGRATIONS_DIR}"
echo " Dry run        : ${DRY_RUN:-no}"
echo "============================================="
echo ""

FAILED_SHARDS=()
SUCCESS_COUNT=0

for SHARD_LABEL in "${!SHARD_ENV[@]}"; do
  ENV_VAR="${SHARD_ENV[$SHARD_LABEL]}"
  DB_URL="${!ENV_VAR:-}"

  if [ -z "$DB_URL" ]; then
    warn "Skipping ${SHARD_LABEL} — ${ENV_VAR} not set"
    continue
  fi

  info "Migrating shard: ${SHARD_LABEL} (${ENV_VAR})"

  MIGRATE_CMD="npx node-pg-migrate up \
    --migrations-dir ${MIGRATIONS_DIR} \
    --database-url \"${DB_URL}\" \
    --no-lock"

  # Append specific migration if set
  if [ -n "${MIGRATION:-}" ]; then
    MIGRATE_CMD="${MIGRATE_CMD} --single-transaction --count 1"
    info "Running single migration: ${MIGRATION}"
  fi

  if [ "${DRY_RUN}" = "--dry-run" ]; then
    echo "  [DRY RUN] ${MIGRATE_CMD}"
    ok "Dry-run complete for ${SHARD_LABEL}"
    ((SUCCESS_COUNT++)) || true
    continue
  fi

  # Run migration — capture output; on failure record shard and continue
  if DATABASE_URL="${DB_URL}" npx node-pg-migrate up \
      --migrations-dir "${MIGRATIONS_DIR}" \
      --no-lock \
      2>&1 | sed "s/^/  [${SHARD_LABEL}] /"; then
    ok "Migration succeeded on ${SHARD_LABEL}"
    ((SUCCESS_COUNT++)) || true
  else
    fail "Migration FAILED on ${SHARD_LABEL}"
    FAILED_SHARDS+=("${SHARD_LABEL}")
  fi

  echo ""
done

# ── Summary ────────────────────────────────────────────────────────────────────
echo "============================================="
echo " Summary"
echo "============================================="
echo "  Shards succeeded : ${SUCCESS_COUNT}"
echo "  Shards failed    : ${#FAILED_SHARDS[@]}"

if [ "${#FAILED_SHARDS[@]}" -gt 0 ]; then
  fail "Failed shards: ${FAILED_SHARDS[*]}"
  echo ""
  echo "  Investigate each failed shard manually:"
  for s in "${FAILED_SHARDS[@]}"; do
    echo "    DATABASE_URL=\${${SHARD_ENV[$s]}} npx node-pg-migrate up --migrations-dir ${MIGRATIONS_DIR}"
  done
  echo ""
  exit 1
fi

ok "All shards migrated successfully."
echo ""
