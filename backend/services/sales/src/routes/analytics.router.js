'use strict';

/**
 * Analytics — Sales Service Routes
 * Mounted at /api/sales
 *
 * GET /api/sales/stats    pipeline KPIs + funnel summary
 * GET /api/sales/overdue  deals with overdue next_action_date
 * GET /api/sales/funnel   full stage funnel with conversion rates + avg days per stage
 */

const { Router } = require('express');
const salesAuth  = require('../middleware/salesAuth');
const { pool }   = require('../db/pg');

const router = Router();
router.use(salesAuth);

const TO_SAR    = { SAR: 1, AED: 1.02, USD: 3.75, EUR: 4.10, GBP: 4.80, KWD: 12.20, BHD: 9.95, OMR: 9.74, QAR: 1.03 };
const toSAR     = (amount, currency) => Number(amount ?? 0) * (TO_SAR[currency] ?? 1);
const STAGE_SEQ = ['lead','qualified','demo','proposal','negotiation'];

// ── GET /api/sales/stats ──────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [pipeline, byStage, ceoQ, wonQ, overdueQ, hpQ, stageHistQ] = await Promise.all([
      pool.query(`
        SELECT value_amount, value_currency
        FROM crm_deals
        WHERE stage NOT IN ('won','lost')
      `),
      pool.query(`SELECT stage, COUNT(*) AS count FROM crm_deals GROUP BY stage`),
      pool.query(`
        SELECT COUNT(*) AS count FROM crm_deals
        WHERE ceo_review_required = true AND ceo_approved_at IS NULL AND stage NOT IN ('won','lost')
      `),
      pool.query(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(CASE WHEN value_currency IS NOT NULL THEN value_amount ELSE 0 END), 0) AS raw_value,
               value_currency
        FROM crm_deals
        WHERE stage = 'won' AND updated_at >= date_trunc('month', NOW())
        GROUP BY value_currency
      `),
      pool.query(`
        SELECT COUNT(*) AS count FROM crm_deals
        WHERE next_action_date < CURRENT_DATE AND next_action_date IS NOT NULL AND stage NOT IN ('won','lost')
      `),
      pool.query(`SELECT outreach_status, COUNT(*) AS count FROM crm_hotel_partners GROUP BY outreach_status`),
      // Avg days per stage from stage history
      pool.query(`
        SELECT stage,
               ROUND(AVG(
                 EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400
               ))::int AS avg_days
        FROM crm_deal_stage_history
        GROUP BY stage
      `),
    ]);

    const pipeline_sar = pipeline.rows.reduce((sum, r) => sum + toSAR(r.value_amount, r.value_currency), 0);
    const won_sar      = wonQ.rows.reduce((sum, r) => sum + toSAR(r.raw_value, r.value_currency), 0);

    const stages = {};
    for (const r of byStage.rows) stages[r.stage] = parseInt(r.count);

    const hp_statuses = {};
    for (const r of hpQ.rows) hp_statuses[r.outreach_status] = parseInt(r.count);

    const avg_days_per_stage = {};
    for (const r of stageHistQ.rows) avg_days_per_stage[r.stage] = r.avg_days;

    // Conversion rates: sequential stage-to-stage
    const conversion_rates = {};
    for (let i = 0; i < STAGE_SEQ.length - 1; i++) {
      const from = STAGE_SEQ[i];
      const to   = STAGE_SEQ[i + 1];
      const fromCount = stages[from] ?? 0;
      const toCount   = stages[to]   ?? 0;
      const total     = fromCount + toCount;
      conversion_rates[`${from}_to_${to}`] = total > 0 ? Math.round((toCount / total) * 100) : null;
    }
    // Overall win rate
    const wonCount  = stages['won']  ?? 0;
    const lostCount = stages['lost'] ?? 0;
    const winRate   = (wonCount + lostCount) > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;

    res.json({
      data: {
        pipeline_sar:         Math.round(pipeline_sar),
        active_deals:         pipeline.rows.length,
        ceo_pending:          parseInt(ceoQ.rows[0].count),
        overdue_actions:      parseInt(overdueQ.rows[0].count),
        won_this_month_count: wonQ.rows.reduce((s, r) => s + parseInt(r.count), 0),
        won_this_month_sar:   Math.round(won_sar),
        stages,
        hotel_partners:       hp_statuses,
        funnel: {
          conversion_rates,
          win_rate_pct:       winRate,
          avg_days_per_stage,
        },
      },
    });
  } catch (err) {
    console.error('[sales/stats GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/overdue ────────────────────────────────────────────────────
router.get('/overdue', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.title, d.partner_name, d.stage, d.deal_owner,
             d.next_action, d.next_action_date, d.expected_close_date,
             d.value_amount, d.value_currency,
             (CURRENT_DATE - d.next_action_date) AS days_overdue
      FROM crm_deals d
      WHERE d.next_action_date < CURRENT_DATE
        AND d.next_action_date IS NOT NULL
        AND d.stage NOT IN ('won','lost')
      ORDER BY d.next_action_date ASC
      LIMIT $1
    `, [limit]);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('[sales/overdue GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /api/sales/funnel ─────────────────────────────────────────────────────
router.get('/funnel', async (_req, res) => {
  try {
    const [byStageCurrent, stageHistAll, wonLost] = await Promise.all([
      // Current deals per stage
      pool.query(`SELECT stage, COUNT(*) AS count FROM crm_deals GROUP BY stage`),
      // Avg & total time spent in each stage across all history rows
      pool.query(`
        SELECT stage,
               COUNT(*)                                                   AS entries,
               ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400))::int AS avg_days,
               ROUND(MIN(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400))::int AS min_days,
               ROUND(MAX(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400))::int AS max_days
        FROM crm_deal_stage_history
        GROUP BY stage
      `),
      // Won + lost totals for win rate
      pool.query(`
        SELECT stage, COUNT(*) AS count
        FROM crm_deals
        WHERE stage IN ('won','lost')
        GROUP BY stage
      `),
    ]);

    const stageCounts = {};
    for (const r of byStageCurrent.rows) stageCounts[r.stage] = parseInt(r.count);

    const stageStats = {};
    for (const r of stageHistAll.rows) {
      stageStats[r.stage] = {
        entries:  parseInt(r.entries),
        avg_days: r.avg_days,
        min_days: r.min_days,
        max_days: r.max_days,
      };
    }

    const wonCount  = parseInt(wonLost.rows.find(r => r.stage === 'won')?.count  ?? 0);
    const lostCount = parseInt(wonLost.rows.find(r => r.stage === 'lost')?.count ?? 0);

    // Stage funnel — ordered list
    const stages = STAGE_SEQ.map(s => ({
      stage:    s,
      count:    stageCounts[s] ?? 0,
      ...(stageStats[s] ?? { entries: 0, avg_days: null, min_days: null, max_days: null }),
    }));

    // Conversion rates between consecutive stages
    const conversion_rates = {};
    for (let i = 0; i < STAGE_SEQ.length - 1; i++) {
      const from = STAGE_SEQ[i];
      const to   = STAGE_SEQ[i + 1];
      const f    = stageCounts[from] ?? 0;
      const t    = stageCounts[to]   ?? 0;
      conversion_rates[`${from}_to_${to}`] = (f + t) > 0 ? Math.round((t / (f + t)) * 100) : null;
    }

    res.json({
      data: {
        stages,
        conversion_rates,
        win_rate_pct: (wonCount + lostCount) > 0
          ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null,
        won_count:  wonCount,
        lost_count: lostCount,
      },
    });
  } catch (err) {
    console.error('[sales/funnel GET]', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
