'use strict';

/**
 * AI Daily Briefing — admin routes
 *
 * Registered in app.js as:  app.use('/api/admin/briefings', requireAdmin, aiBriefingRouter)
 *
 * GET  /              — list briefings (paginated, newest first)
 * GET  /:id           — full briefing by ID
 * GET  /date/:date    — briefing for a specific date (YYYY-MM-DD)
 * POST /generate      — manually trigger a briefing for today
 */

const express              = require('express');
const { Pool }             = require('pg');
const { runDailyBriefing } = require('../services/briefing-generator');

const router = express.Router();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── List briefings ────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, briefing_date, generated_at,
               LEFT(content_md, 300) AS preview,
               array_length(tool_calls, 1) AS tool_count
        FROM ai_daily_briefings
        ORDER BY briefing_date DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_daily_briefings'),
    ]);

    res.json({
      data:  rows.rows,
      total: parseInt(count.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('[ai-briefing] list error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Get by date ───────────────────────────────────────────────────────────────

router.get('/date/:date', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_daily_briefings WHERE briefing_date = $1',
      [req.params.date],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Get by ID ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_daily_briefings WHERE id = $1',
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── Manual trigger ────────────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const briefing = await runDailyBriefing();
    res.json({ data: briefing, message: 'Briefing generated successfully' });
  } catch (err) {
    console.error('[ai-briefing] generate error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
