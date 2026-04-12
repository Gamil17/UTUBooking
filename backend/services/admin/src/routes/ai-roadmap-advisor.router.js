'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_roadmap_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_items           INT         NOT NULL DEFAULT 0,
      roadmap_health        TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      priority_adjustments  JSONB       NOT NULL DEFAULT '[]',
      quick_wins            JSONB       NOT NULL DEFAULT '[]',
      strategic_bets        JSONB       NOT NULL DEFAULT '[]',
      tech_debt_flags       TEXT[]      NOT NULL DEFAULT '{}',
      feature_flag_risks    TEXT[]      NOT NULL DEFAULT '{}',
      next_release_rec      TEXT,
      market_alignment      TEXT,
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-roadmap-advisor] bootstrap error:', e.message));

// GET /api/admin/roadmap-advisor
router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_roadmap_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/admin/roadmap-advisor
router.post('/', async (_req, res) => {
  try {
    const roadmap = await pool.query(`
      SELECT id, title, description, status, priority, quarter, tags, votes, owner
      FROM products_roadmap
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        votes DESC NULLS LAST
      LIMIT 100
    `);

    const flags = await pool.query(`
      SELECT key, description, enabled, rollout_pct, environments, owner, expires_at
      FROM products_feature_flags
      ORDER BY enabled DESC, rollout_pct DESC
      LIMIT 50
    `);

    const changelog = await pool.query(`
      SELECT version, title, type, published_at
      FROM products_changelog
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT 20
    `);

    const items = roadmap.rows;
    const total = items.length;
    const byStatus = {};
    items.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    const byPriority = {};
    items.forEach(i => { byPriority[i.priority] = (byPriority[i.priority] || 0) + 1; });

    const staleFlags = flags.rows.filter(f => f.enabled && f.rollout_pct < 100 && f.expires_at && new Date(f.expires_at) < new Date());

    const prompt = `You are an AI Product Strategy Advisor for UTUBooking.com (Gulf travel platform — hotels, flights, Hajj/Umrah, serving 25+ Muslim world markets). Analyse the product roadmap and provide strategic prioritization advice.

Roadmap Summary:
- Total items: ${total}
- Status breakdown: ${JSON.stringify(byStatus)}
- Priority breakdown: ${JSON.stringify(byPriority)}

Roadmap Items:
${JSON.stringify(items.map(i => ({
  title: i.title,
  status: i.status,
  priority: i.priority,
  quarter: i.quarter,
  votes: i.votes,
  owner: i.owner,
  description: i.description?.substring(0, 100),
})), null, 2)}

Feature Flags (${flags.rows.length} total, ${staleFlags.length} stale/expired):
${JSON.stringify(flags.rows.slice(0, 20).map(f => ({
  key: f.key, enabled: f.enabled,
  rollout_pct: f.rollout_pct, expires_at: f.expires_at,
})))}

Recent Releases (${changelog.rows.length}):
${JSON.stringify(changelog.rows.map(c => ({ version: c.version, title: c.title, type: c.type, date: c.published_at })))}

Context:
- UTUBooking serves Gulf and Muslim World (SA, AE, TR, MY, ID, PK, IN primary)
- Hajj/Umrah features are highest strategic value — seasonal but high LTV
- Competition: Wego, Almosafer, Wingie, Booking.com
- Tech stack: Next.js, Node.js microservices, PostgreSQL, AWS
- Key growth drivers: B2B hotel partners, corporate travel, affiliate programme

Respond with ONLY a JSON object (no markdown fences):
{
  "roadmap_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence CPO-level assessment",
  "priority_adjustments": [
    { "title": "...", "current_priority": "...", "suggested_priority": "...", "reason": "..." }
  ],
  "quick_wins": [
    { "title": "...", "why": "...", "effort": "low|medium" }
  ],
  "strategic_bets": [
    { "title": "...", "market_opportunity": "...", "quarter": "..." }
  ],
  "tech_debt_flags": ["flag 1", "flag 2"],
  "feature_flag_risks": ["flag 1"],
  "next_release_rec": "What should the next release focus on and why",
  "market_alignment": "How well the roadmap aligns with Gulf/Muslim world market needs",
  "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"]
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].text
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const ai = JSON.parse(raw);

    await pool.query(`
      INSERT INTO ai_roadmap_advice
        (snapshot_key, total_items, roadmap_health, executive_summary,
         priority_adjustments, quick_wins, strategic_bets, tech_debt_flags,
         feature_flag_risks, next_release_rec, market_alignment, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_items          = EXCLUDED.total_items,
        roadmap_health       = EXCLUDED.roadmap_health,
        executive_summary    = EXCLUDED.executive_summary,
        priority_adjustments = EXCLUDED.priority_adjustments,
        quick_wins           = EXCLUDED.quick_wins,
        strategic_bets       = EXCLUDED.strategic_bets,
        tech_debt_flags      = EXCLUDED.tech_debt_flags,
        feature_flag_risks   = EXCLUDED.feature_flag_risks,
        next_release_rec     = EXCLUDED.next_release_rec,
        market_alignment     = EXCLUDED.market_alignment,
        recommendations      = EXCLUDED.recommendations,
        generated_at         = NOW()
    `, [
      'latest', total,
      ai.roadmap_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.priority_adjustments ?? []),
      JSON.stringify(ai.quick_wins ?? []),
      JSON.stringify(ai.strategic_bets ?? []),
      ai.tech_debt_flags ?? [],
      ai.feature_flag_risks ?? [],
      ai.next_release_rec ?? null,
      ai.market_alignment ?? null,
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_roadmap_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-roadmap-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
