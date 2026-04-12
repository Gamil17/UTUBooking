'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_loyalty_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_members         INT         NOT NULL DEFAULT 0,
      points_outstanding    BIGINT      NOT NULL DEFAULT 0,
      programme_health      TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      tier_health           JSONB       NOT NULL DEFAULT '[]',
      churn_risk_segments   JSONB       NOT NULL DEFAULT '[]',
      redemption_insights   TEXT,
      liability_assessment  TEXT,
      engagement_gaps       TEXT[]      NOT NULL DEFAULT '{}',
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      reward_recommendations JSONB      NOT NULL DEFAULT '[]',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-loyalty-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_loyalty_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Member tier breakdown
    const memberStats = await pool.query(`
      SELECT tier,
             COUNT(*)                        AS count,
             AVG(points)                     AS avg_points,
             SUM(points)                     AS total_points,
             AVG(lifetime_points)            AS avg_lifetime,
             COUNT(*) FILTER (WHERE points = 0) AS zero_balance
      FROM loyalty_members
      GROUP BY tier
    `).catch(() => ({ rows: [] }));

    // Overall totals
    const totals = await pool.query(`
      SELECT COUNT(*) AS total_members,
             SUM(points) AS total_outstanding,
             SUM(lifetime_points) AS total_lifetime
      FROM loyalty_members
    `).catch(() => ({ rows: [{}] }));

    // Recent activity (last 30 days)
    const activity = await pool.query(`
      SELECT action,
             COUNT(*) AS count,
             SUM(points) AS total_points
      FROM loyalty_ledger
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action ORDER BY count DESC LIMIT 15
    `).catch(() => ({ rows: [] }));

    // Rewards catalogue
    const rewards = await pool.query(`
      SELECT name_en, points_cost, active, category
      FROM loyalty_rewards
      ORDER BY active DESC, points_cost ASC LIMIT 20
    `).catch(() => ({ rows: [] }));

    // Dormant members (no activity 90d)
    const dormant = await pool.query(`
      SELECT COUNT(DISTINCT lm.id) AS dormant_count
      FROM loyalty_members lm
      WHERE NOT EXISTS (
        SELECT 1 FROM loyalty_ledger ll
        WHERE ll.user_id = lm.user_id
          AND ll.created_at >= NOW() - INTERVAL '90 days'
      )
    `).catch(() => ({ rows: [{ dormant_count: 0 }] }));

    const t = totals.rows[0] ?? {};
    const totalMembers    = parseInt(t.total_members || 0);
    const totalOutstanding = parseInt(t.total_outstanding || 0);
    const dormantCount    = parseInt(dormant.rows[0]?.dormant_count || 0);
    const dormantPct      = totalMembers ? Math.round((dormantCount / totalMembers) * 100) : 0;

    const prompt = `You are an AI Loyalty Programme Advisor for UTUBooking.com (Gulf travel platform — hotels, flights, Hajj/Umrah). Analyse the loyalty programme health and provide strategic recommendations.

Programme Overview:
- Total members: ${totalMembers}
- Total points outstanding: ${totalOutstanding.toLocaleString()} (= liability)
- Dormant members (no activity 90d): ${dormantCount} (${dormantPct}%)

Tier Breakdown:
${JSON.stringify(memberStats.rows.map(r => ({
  tier: r.tier,
  count: parseInt(r.count),
  avg_points: Math.round(parseFloat(r.avg_points || 0)),
  total_points: parseInt(r.total_points || 0),
  avg_lifetime: Math.round(parseFloat(r.avg_lifetime || 0)),
  zero_balance: parseInt(r.zero_balance || 0),
})))}

Point Activity (last 30 days, ${activity.rows.length} action types):
${JSON.stringify(activity.rows)}

Rewards Catalogue (${rewards.rows.length} rewards):
${JSON.stringify(rewards.rows)}

Context:
- UTUBooking's loyalty programme earns points on hotel bookings (primary), flights, car rentals
- Gulf loyalty expectations: tier recognition matters more than points (status symbol in KSA/UAE)
- Ramadan is peak redemption period — members redeem for Umrah upgrades
- Dormancy >30% is a programme health concern
- High points liability relative to monthly bookings = financial risk
- Top Gulf loyalty benchmarks: Almosafer Mosafir Club, Flyadeal Miles, Saudi Airlines Alfursan

Respond with ONLY a JSON object (no markdown fences):
{
  "programme_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence CLO-level summary",
  "tier_health": [
    { "tier": "...", "assessment": "...", "action": "..." }
  ],
  "churn_risk_segments": [
    { "segment": "...", "size_estimate": "...", "risk": "...", "re_engagement_tactic": "..." }
  ],
  "redemption_insights": "paragraph on redemption patterns, barriers, and opportunities",
  "liability_assessment": "paragraph on outstanding points liability and risk",
  "engagement_gaps": ["gap 1", "gap 2"],
  "quick_wins": ["win 1", "win 2", "win 3"],
  "reward_recommendations": [
    { "reward": "...", "rationale": "...", "gulf_relevance": "..." }
  ],
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
      INSERT INTO ai_loyalty_advice
        (snapshot_key, total_members, points_outstanding, programme_health,
         executive_summary, tier_health, churn_risk_segments, redemption_insights,
         liability_assessment, engagement_gaps, quick_wins, reward_recommendations,
         recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_members        = EXCLUDED.total_members,
        points_outstanding   = EXCLUDED.points_outstanding,
        programme_health     = EXCLUDED.programme_health,
        executive_summary    = EXCLUDED.executive_summary,
        tier_health          = EXCLUDED.tier_health,
        churn_risk_segments  = EXCLUDED.churn_risk_segments,
        redemption_insights  = EXCLUDED.redemption_insights,
        liability_assessment = EXCLUDED.liability_assessment,
        engagement_gaps      = EXCLUDED.engagement_gaps,
        quick_wins           = EXCLUDED.quick_wins,
        reward_recommendations = EXCLUDED.reward_recommendations,
        recommendations      = EXCLUDED.recommendations,
        generated_at         = NOW()
    `, [
      'latest', totalMembers, totalOutstanding,
      ai.programme_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.tier_health ?? []),
      JSON.stringify(ai.churn_risk_segments ?? []),
      ai.redemption_insights ?? null,
      ai.liability_assessment ?? null,
      ai.engagement_gaps ?? [],
      ai.quick_wins ?? [],
      JSON.stringify(ai.reward_recommendations ?? []),
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_loyalty_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-loyalty-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
