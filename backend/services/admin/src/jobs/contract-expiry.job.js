'use strict';

/**
 * contract-expiry.job.js
 *
 * Runs daily at 07:00 Riyadh time (UTC+3) — before the executive briefing.
 * Scans procurement_contracts for agreements expiring within 90 days that
 * haven't already had a renewal workflow launched, and fires
 * trigger_event = 'contract_expiry_90d' for each one.
 *
 * Also sweeps cs_account_health for accounts with health_score < 40 that
 * haven't been escalated today, firing trigger_event = 'health_score_critical'.
 *
 * Called once from app.js: require('./src/jobs/contract-expiry.job').start()
 */

const cron = require('node-cron');
const { Pool } = require('pg');
const wf = require('../lib/workflow-client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

// ── Contract expiry scan ──────────────────────────────────────────────────────

async function scanExpiringContracts() {
  try {
    // Find active contracts expiring in the next 90 days where a renewal
    // workflow has not yet been launched (tracked via wf_launched flag we upsert).
    const { rows } = await pool.query(`
      SELECT
        c.id, c.supplier_name, c.title, c.type, c.value_sar, c.end_date, c.auto_renews,
        c.supplier_id, c.status,
        (c.end_date - CURRENT_DATE) AS days_until_expiry
      FROM procurement_contracts c
      WHERE c.status = 'active'
        AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
        AND c.id NOT IN (
          SELECT trigger_ref::uuid
          FROM workflow_instances
          WHERE trigger_event = 'contract_expiry_90d'
            AND status NOT IN ('cancelled')
            AND created_at > NOW() - INTERVAL '95 days'
        )
      ORDER BY c.end_date ASC
    `);

    if (rows.length === 0) return;

    console.log(`[contract-expiry] Found ${rows.length} contracts entering 90-day renewal window`);

    for (const contract of rows) {
      const daysLeft = parseInt(contract.days_until_expiry, 10);
      wf.launch({
        triggerEvent:   'contract_expiry_90d',
        triggerRef:     contract.id,
        triggerRefType: 'procurement_contract',
        initiatedBy:    'system-cron',
        context: {
          contract_id:    contract.id,
          supplier_name:  contract.supplier_name,
          title:          contract.title,
          type:           contract.type,
          value_sar:      contract.value_sar,
          end_date:       contract.end_date,
          days_until_expiry: daysLeft,
          auto_renews:    contract.auto_renews,
          urgency:        daysLeft <= 30 ? 'critical' : daysLeft <= 60 ? 'high' : 'medium',
        },
      });
      console.log(`[contract-expiry] Launched renewal workflow for contract ${contract.id} (${contract.supplier_name} — ${daysLeft}d remaining)`);
    }
  } catch (err) {
    console.error('[contract-expiry] scanExpiringContracts error:', err.message);
  }
}

// ── Customer health score scan ────────────────────────────────────────────────

async function scanCriticalHealthScores() {
  try {
    // Find accounts with critical health scores not already escalated today
    const { rows } = await pool.query(`
      SELECT
        h.id, h.account_name, h.account_id, h.health_score,
        h.tier, h.ltv_sar, h.risk_factors
      FROM cs_account_health h
      WHERE h.health_score < 40
        AND h.id NOT IN (
          SELECT trigger_ref::uuid
          FROM workflow_instances
          WHERE trigger_event = 'health_score_critical'
            AND created_at::date = CURRENT_DATE
            AND status NOT IN ('cancelled')
        )
      ORDER BY h.health_score ASC
      LIMIT 20
    `);

    if (rows.length === 0) return;

    console.log(`[contract-expiry] Found ${rows.length} accounts with critical health scores`);

    for (const account of rows) {
      wf.launch({
        triggerEvent:   'health_score_critical',
        triggerRef:     account.id,
        triggerRefType: 'cs_account',
        initiatedBy:    'system-cron',
        context: {
          account_id:   account.account_id ?? account.id,
          account_name: account.account_name,
          health_score: account.health_score,
          tier:         account.tier,
          ltv_sar:      account.ltv_sar,
          risk_factors: account.risk_factors ?? [],
        },
      });
      console.log(`[contract-expiry] Launched health-critical workflow for account ${account.account_name} (score: ${account.health_score})`);
    }
  } catch (err) {
    // cs_account_health may not exist in all environments — non-fatal
    if (!err.message?.includes('does not exist')) {
      console.error('[contract-expiry] scanCriticalHealthScores error:', err.message);
    }
  }
}

// ── Main scheduled task ───────────────────────────────────────────────────────

async function safeRun() {
  try {
    await Promise.all([
      scanExpiringContracts(),
      scanCriticalHealthScores(),
    ]);
  } catch (err) {
    console.error('[contract-expiry] safeRun error:', err.message);
  }
}

function start() {
  // Run at 07:00 Riyadh time (Asia/Riyadh) every day
  cron.schedule('0 7 * * *', safeRun, { timezone: 'Asia/Riyadh' });
  console.log('[contract-expiry] Scheduled: daily at 07:00 Riyadh (contract renewal + health score sweeps)');

  // Run once on startup if it's past 07:00 Riyadh (catch restarts that happen after scheduled time)
  const riyadhHour = (new Date().getUTCHours() + 3) % 24;
  if (riyadhHour >= 7) {
    safeRun().catch(e => console.error('[contract-expiry] startup scan error:', e.message));
  }
}

module.exports = { start };
