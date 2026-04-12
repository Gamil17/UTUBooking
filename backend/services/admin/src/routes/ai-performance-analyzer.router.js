'use strict';

/**
 * AI HR Performance Review Analyzer
 *
 * Registered in app.js as:
 *   app.use('/api/admin/performance-analyzer', requireAdmin, aiPerformanceAnalyzerRouter)
 *
 * GET  /:departmentId  — fetch existing analysis (404 if none)
 * POST /:departmentId  — run fresh analysis of all performance reviews in a department
 *
 * Claude output schema:
 *   overall_health        'strong' | 'healthy' | 'concerning' | 'critical'
 *   team_summary          string — 2-3 sentence narrative
 *   review_period         string — e.g. "2026-Q1"
 *   total_reviewed        number
 *   top_performers        { employee_name, rating, strength }[]
 *   development_needs     { employee_name, rating, concern }[]
 *   team_strengths        string[] — themes across high performers
 *   development_priorities string[] — most common improvement areas
 *   manager_recommendations string[] — actions for the manager/HR
 *   risk_flags            string[] — flight risks, PIP candidates, compliance issues
 */

const express   = require('express');
const { Pool }  = require('pg');
const Anthropic  = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_performance_analyses (
      id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      department_id           UUID        NOT NULL UNIQUE,
      department_name         TEXT,
      overall_health          TEXT        NOT NULL DEFAULT 'healthy'
                                          CHECK (overall_health IN ('strong','healthy','concerning','critical')),
      team_summary            TEXT        NOT NULL,
      review_period           TEXT,
      total_reviewed          INT         NOT NULL DEFAULT 0,
      top_performers          JSONB       NOT NULL DEFAULT '[]',
      development_needs       JSONB       NOT NULL DEFAULT '[]',
      team_strengths          TEXT[]      NOT NULL DEFAULT '{}',
      development_priorities  TEXT[]      NOT NULL DEFAULT '{}',
      manager_recommendations TEXT[]      NOT NULL DEFAULT '{}',
      risk_flags              TEXT[]      NOT NULL DEFAULT '{}',
      generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-performance-analyzer] bootstrap error:', e.message));

// ── GET /:departmentId ────────────────────────────────────────────────────────

router.get('/:departmentId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_performance_analyses WHERE department_id = $1',
      [req.params.departmentId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:departmentId — run analysis ────────────────────────────────────────

router.post('/:departmentId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { departmentId } = req.params;

  // Load department info
  let dept;
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.name,
              COUNT(e.id) AS employee_count
         FROM hr_departments d
         LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
        WHERE d.id = $1
        GROUP BY d.id, d.name`,
      [departmentId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'DEPARTMENT_NOT_FOUND' });
    dept = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Load performance reviews for this department
  let reviews;
  try {
    const { rows } = await pool.query(
      `SELECT pr.id, pr.employee_id, e.full_name AS employee_name,
              pr.review_period, pr.rating, pr.reviewer_name,
              pr.goals_met, pr.strengths, pr.areas_for_improvement,
              pr.overall_comment, pr.created_at
         FROM hr_performance_reviews pr
         JOIN employees e ON e.id = pr.employee_id
        WHERE e.department_id = $1
        ORDER BY pr.created_at DESC
        LIMIT 50`,
      [departmentId]
    );
    reviews = rows;
  } catch (err) {
    reviews = [];
  }

  if (!reviews.length) {
    return res.status(422).json({
      error: 'NO_REVIEWS',
      message: 'No performance reviews found for this department. Add reviews first.',
    });
  }

  // Build review summary for Claude
  const reviewSummary = reviews.map(r => (
    `- ${r.employee_name}: Rating ${r.rating}/5` +
    (r.goals_met != null ? `, Goals met: ${r.goals_met}%` : '') +
    (r.strengths ? `, Strengths: "${r.strengths}"` : '') +
    (r.areas_for_improvement ? `, Improvement: "${r.areas_for_improvement}"` : '') +
    (r.overall_comment ? `, Note: "${r.overall_comment.slice(0, 120)}"` : '')
  )).join('\n');

  const ratingDist = reviews.reduce((acc, r) => {
    const bucket = Math.floor(r.rating);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2);
  const reviewPeriod = reviews[0]?.review_period ?? 'Unknown';

  const systemPrompt = `You are the HR Analytics AI for UTUBooking.com, a Gulf-region travel tech startup. You analyse performance review data to help the HR Manager and department heads understand team health, identify development priorities, and mitigate flight-risk or performance issues.

Context:
- Company: UTUBooking.com (Hotels/Flights/Cars, Hajj/Umrah focus, Series A, Riyadh HQ)
- Culture: high-growth, meritocratic, bilingual (Arabic/English)
- Rating scale: 1-5 (1=needs_improvement, 2=developing, 3=meets_expectations, 4=exceeds_expectations, 5=outstanding)
- Assume any employee rated ≤2 is a potential PIP candidate
- Assume ≥3 consecutively below target may indicate systemic management issue

Output ONLY valid JSON — no markdown fences, no commentary.

JSON structure:
{
  "overall_health": "strong|healthy|concerning|critical",
  "team_summary": "<2-3 sentence narrative for HR manager>",
  "review_period": "<period string>",
  "total_reviewed": <number>,
  "top_performers": [{ "employee_name": "<name>", "rating": <number>, "strength": "<key strength>" }],
  "development_needs": [{ "employee_name": "<name>", "rating": <number>, "concern": "<specific concern>" }],
  "team_strengths": ["<theme across high performers>"],
  "development_priorities": ["<most common improvement area>"],
  "manager_recommendations": ["<action for HR/manager — specific and actionable>"],
  "risk_flags": ["<flight risk, PIP candidate, or compliance issue — name specific employees if warranted>"]
}`;

  const userPrompt = `Analyse performance reviews for the ${dept.name} department at UTUBooking.com.

DEPARTMENT: ${dept.name}
Active Employees: ${dept.employee_count}
Reviews Analysed: ${reviews.length}
Average Rating: ${avgRating}/5
Review Period: ${reviewPeriod}

Rating Distribution:
${Object.entries(ratingDist).sort().map(([r, c]) => `  ${r}/5 stars: ${c} employee(s)`).join('\n')}

Individual Reviews:
${reviewSummary}

Generate a comprehensive performance analysis. Be specific, actionable, and direct. Flag flight risks clearly. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'NO_OUTPUT' });

    let parsed;
    try {
      const clean = textBlock.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'PARSE_ERROR', raw: textBlock.text.slice(0, 500) });
    }

    const VALID_HEALTH = new Set(['strong', 'healthy', 'concerning', 'critical']);
    const health = VALID_HEALTH.has(parsed.overall_health) ? parsed.overall_health : 'healthy';

    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_performance_analyses
        (department_id, department_name, overall_health, team_summary,
         review_period, total_reviewed, top_performers, development_needs,
         team_strengths, development_priorities, manager_recommendations, risk_flags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (department_id) DO UPDATE SET
        department_name        = EXCLUDED.department_name,
        overall_health         = EXCLUDED.overall_health,
        team_summary           = EXCLUDED.team_summary,
        review_period          = EXCLUDED.review_period,
        total_reviewed         = EXCLUDED.total_reviewed,
        top_performers         = EXCLUDED.top_performers,
        development_needs      = EXCLUDED.development_needs,
        team_strengths         = EXCLUDED.team_strengths,
        development_priorities = EXCLUDED.development_priorities,
        manager_recommendations = EXCLUDED.manager_recommendations,
        risk_flags             = EXCLUDED.risk_flags,
        generated_at           = NOW()
      RETURNING *
    `, [
      departmentId,
      dept.name,
      health,
      parsed.team_summary        ?? '',
      parsed.review_period       ?? reviewPeriod,
      reviews.length,
      JSON.stringify(parsed.top_performers         ?? []),
      JSON.stringify(parsed.development_needs      ?? []),
      parsed.team_strengths         ?? [],
      parsed.development_priorities ?? [],
      parsed.manager_recommendations ?? [],
      parsed.risk_flags             ?? [],
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-performance-analyzer] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
