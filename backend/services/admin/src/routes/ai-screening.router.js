'use strict';

/**
 * AI Career Application Screener
 *
 * Registered in app.js as:  app.use('/api/admin/screening', requireAdmin, aiScreeningRouter)
 *
 * Reads from career_applications (auth-service table, same DB).
 * Writes screening results to ai_screening_results (admin-service table).
 *
 * GET  /:applicationId          — existing screening result (404 if none)
 * POST /:applicationId          — run AI screening, store & return result
 * GET  /                        — list recent screenings (newest first)
 *
 * Claude output schema:
 *   overall_score       0-100 integer
 *   recommendation      'strong_yes' | 'yes' | 'maybe' | 'no'
 *   summary             2-3 sentence overview
 *   strengths           string[]  (3-5 items)
 *   concerns            string[]  (2-4 items — honest but constructive)
 *   interview_questions string[]  (5 tailored questions)
 *   culture_fit_notes   string
 */

const express  = require('express');
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_screening_results (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id      UUID        NOT NULL UNIQUE,
      applicant_name      TEXT,
      position            TEXT,
      overall_score       INT         NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
      recommendation      TEXT        NOT NULL
                                      CHECK (recommendation IN ('strong_yes','yes','maybe','no')),
      summary             TEXT        NOT NULL,
      strengths           TEXT[]      NOT NULL DEFAULT '{}',
      concerns            TEXT[]      NOT NULL DEFAULT '{}',
      interview_questions TEXT[]      NOT NULL DEFAULT '{}',
      culture_fit_notes   TEXT,
      generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-screening] bootstrap error:', e.message));

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert HR recruiter and talent assessor for UTUBooking.com, a travel booking platform headquartered in Saudi Arabia. You screen job applications professionally, fairly, and without bias.

Company context:
- UTUBooking.com: Gulf & Muslim World travel platform (Hotels, Flights, Cars, Hajj/Umrah)
- Fast-growing startup culture — values initiative, cross-cultural communication, technical depth
- Primary office: Riyadh, KSA. Remote-friendly for some roles.
- Languages valued: Arabic + English bilingual preferred

Assessment rules:
- Be honest but constructive — this is an internal HR tool, not a rejection letter
- Do NOT discriminate on any protected characteristic
- Score on merit: relevant experience, communication quality, role fit, growth potential
- Flag genuine concerns (gaps, vague cover letter, mismatched role) but keep constructive
- Interview questions should be specific to this candidate's application, not generic
- Output ONLY valid JSON — no markdown fences, no commentary before/after

Output this exact JSON structure:
{
  "overall_score": <integer 0-100>,
  "recommendation": "<strong_yes|yes|maybe|no>",
  "summary": "<2-3 sentence objective summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "interview_questions": ["<question 1>", "<question 2>", "<question 3>", "<question 4>", "<question 5>"],
  "culture_fit_notes": "<1-2 sentences on cultural/team fit indicators from the application>"
}`;

// ── GET / — list screenings ───────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, application_id, applicant_name, position,
               overall_score, recommendation, generated_at
        FROM ai_screening_results
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_screening_results'),
    ]);
    res.json({
      data:   rows.rows,
      total:  parseInt(count.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:applicationId — fetch existing screening ────────────────────────────

router.get('/:applicationId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_screening_results WHERE application_id = $1',
      [req.params.applicationId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:applicationId — run screening ──────────────────────────────────────

router.post('/:applicationId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { applicationId } = req.params;

  // Load the application from career_applications
  let app;
  try {
    const { rows } = await pool.query(
      `SELECT id, applicant_name, email, phone, position, linkedin_url,
              cover_letter, cv_filename, status, created_at
       FROM career_applications WHERE id = $1`,
      [applicationId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'APPLICATION_NOT_FOUND' });
    app = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Build the user prompt
  const userPrompt = `Screen this job application for the role of "${app.position}" at UTUBooking.com.

APPLICANT: ${app.applicant_name}
ROLE APPLIED FOR: ${app.position}
APPLICATION DATE: ${new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
HAS CV/RESUME ATTACHED: ${app.cv_filename ? `Yes (${app.cv_filename})` : 'No'}
LINKEDIN/PORTFOLIO URL: ${app.linkedin_url || 'Not provided'}

COVER LETTER:
---
${app.cover_letter || '(No cover letter provided)'}
---

Assess this candidate for the "${app.position}" role. Return your assessment as JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: 'NO_OUTPUT' });
    }

    // Parse Claude's JSON output
    let parsed;
    try {
      // Strip any accidental markdown fences
      const clean = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'PARSE_ERROR', raw: textBlock.text.slice(0, 500) });
    }

    // Validate key fields
    const score      = Math.max(0, Math.min(100, parseInt(parsed.overall_score ?? 0, 10)));
    const validRecs  = new Set(['strong_yes', 'yes', 'maybe', 'no']);
    const rec        = validRecs.has(parsed.recommendation) ? parsed.recommendation : 'maybe';

    // Upsert — regenerating replaces the previous result
    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_screening_results
        (application_id, applicant_name, position, overall_score, recommendation,
         summary, strengths, concerns, interview_questions, culture_fit_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (application_id) DO UPDATE SET
        overall_score       = EXCLUDED.overall_score,
        recommendation      = EXCLUDED.recommendation,
        summary             = EXCLUDED.summary,
        strengths           = EXCLUDED.strengths,
        concerns            = EXCLUDED.concerns,
        interview_questions = EXCLUDED.interview_questions,
        culture_fit_notes   = EXCLUDED.culture_fit_notes,
        generated_at        = NOW()
      RETURNING *
    `, [
      applicationId,
      app.applicant_name,
      app.position,
      score,
      rec,
      parsed.summary ?? '',
      parsed.strengths ?? [],
      parsed.concerns ?? [],
      parsed.interview_questions ?? [],
      parsed.culture_fit_notes ?? null,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-screening] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
