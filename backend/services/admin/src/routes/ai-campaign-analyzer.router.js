'use strict';
const express  = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const router  = express.Router();
const client  = new Anthropic.default();
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_campaign_analyses (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key    TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_campaigns INT         NOT NULL DEFAULT 0,
      active_campaigns INT        NOT NULL DEFAULT 0,
      overall_health  TEXT        NOT NULL DEFAULT 'fair',
      executive_summary TEXT      NOT NULL,
      top_campaigns   JSONB       NOT NULL DEFAULT '[]',
      underperformers JSONB       NOT NULL DEFAULT '[]',
      channel_insights JSONB      NOT NULL DEFAULT '[]',
      budget_assessment TEXT,
      content_gaps    TEXT[],
      quick_wins      TEXT[],
      recommendations TEXT[],
      risk_flags      TEXT[],
      generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-campaign-analyzer] bootstrap error:', e.message));

// GET /api/admin/campaign-analyzer — fetch latest snapshot
router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_campaign_analyses WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/admin/campaign-analyzer — run analysis
router.post('/', async (_req, res) => {
  try {
    // Load campaigns
    const campaigns = await pool.query(`
      SELECT id, name, channel, target_audience, objective, budget_sar,
             start_date, end_date, status, submitted_by, notes,
             created_at, updated_at
      FROM marketing_campaigns
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // Load content calendar (recent 90 days)
    const calendar = await pool.query(`
      SELECT platform, content_type, status, publish_date, title
      FROM content_calendar
      WHERE publish_date >= NOW() - INTERVAL '90 days'
      ORDER BY publish_date DESC
      LIMIT 200
    `).catch(() => ({ rows: [] }));

    // Compute stats
    const all = campaigns.rows;
    const total = all.length;
    const active = all.filter(c => ['live', 'scheduled', 'approved'].includes(c.status)).length;
    const completed = all.filter(c => c.status === 'completed').length;
    const totalBudget = all.reduce((s, c) => s + parseFloat(c.budget_sar || 0), 0);

    const channelBreakdown = {};
    all.forEach(c => {
      channelBreakdown[c.channel] = (channelBreakdown[c.channel] || 0) + 1;
    });

    const calRows = calendar.rows;
    const calPlatformBreakdown = {};
    calRows.forEach(r => {
      calPlatformBreakdown[r.platform] = (calPlatformBreakdown[r.platform] || 0) + 1;
    });

    const prompt = `You are the AI Marketing CMO advisor for UTUBooking.com, a travel platform serving Gulf and Muslim World markets (Saudi Arabia primary, UAE, Malaysia, Indonesia, Turkey, Pakistan). Your role is to analyse the marketing department's campaign portfolio and content calendar.

Marketing Data:
- Total campaigns: ${total}
- Active/live campaigns: ${active}
- Completed campaigns: ${completed}
- Total budget allocated: SAR ${totalBudget.toLocaleString()}
- Channel breakdown: ${JSON.stringify(channelBreakdown)}

Campaigns (last 100):
${JSON.stringify(all.map(c => ({
  name: c.name,
  channel: c.channel,
  status: c.status,
  audience: c.target_audience,
  objective: c.objective,
  budget_sar: c.budget_sar,
  start: c.start_date,
  end: c.end_date,
})), null, 2)}

Content Calendar (last 90 days, ${calRows.length} items):
Platform distribution: ${JSON.stringify(calPlatformBreakdown)}

Context:
- Primary market: Saudi Arabia (SAR, Hajj/Umrah, Islamic calendar matters)
- Key channels: Email, LinkedIn, Instagram, TikTok, Google Ads, WhatsApp
- Peak seasons: Ramadan prep (Sha'ban), Hajj season (Dhul Hijjah), Umrah off-peak push
- Avoid generic "slop" — give specific, actionable Gulf-market insights

Respond with ONLY a JSON object (no markdown fences):
{
  "overall_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence CMO-level assessment",
  "top_campaigns": [
    { "name": "...", "channel": "...", "status": "...", "why": "..." }
  ],
  "underperformers": [
    { "name": "...", "channel": "...", "issue": "...", "recommendation": "..." }
  ],
  "channel_insights": [
    { "channel": "...", "assessment": "...", "opportunity": "..." }
  ],
  "budget_assessment": "single paragraph on budget spread and efficiency",
  "content_gaps": ["gap 1", "gap 2"],
  "quick_wins": ["win 1", "win 2", "win 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"],
  "risk_flags": ["flag 1"]
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
      INSERT INTO ai_campaign_analyses
        (snapshot_key, total_campaigns, active_campaigns, overall_health,
         executive_summary, top_campaigns, underperformers, channel_insights,
         budget_assessment, content_gaps, quick_wins, recommendations, risk_flags, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_campaigns  = EXCLUDED.total_campaigns,
        active_campaigns = EXCLUDED.active_campaigns,
        overall_health   = EXCLUDED.overall_health,
        executive_summary = EXCLUDED.executive_summary,
        top_campaigns    = EXCLUDED.top_campaigns,
        underperformers  = EXCLUDED.underperformers,
        channel_insights = EXCLUDED.channel_insights,
        budget_assessment = EXCLUDED.budget_assessment,
        content_gaps     = EXCLUDED.content_gaps,
        quick_wins       = EXCLUDED.quick_wins,
        recommendations  = EXCLUDED.recommendations,
        risk_flags       = EXCLUDED.risk_flags,
        generated_at     = NOW()
    `, [
      'latest', total, active,
      ai.overall_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.top_campaigns ?? []),
      JSON.stringify(ai.underperformers ?? []),
      JSON.stringify(ai.channel_insights ?? []),
      ai.budget_assessment ?? null,
      ai.content_gaps ?? [],
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
      ai.risk_flags ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_campaign_analyses WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-campaign-analyzer] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
