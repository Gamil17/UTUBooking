'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_bizdev_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_partners        INT         NOT NULL DEFAULT 0,
      total_agreements      INT         NOT NULL DEFAULT 0,
      pipeline_health       TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      top_partners          JSONB       NOT NULL DEFAULT '[]',
      at_risk_partners      JSONB       NOT NULL DEFAULT '[]',
      expiring_agreements   JSONB       NOT NULL DEFAULT '[]',
      market_expansion_rec  JSONB       NOT NULL DEFAULT '[]',
      pipeline_gaps         TEXT[]      NOT NULL DEFAULT '{}',
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      strategic_priorities  TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-bizdev-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_bizdev_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    const partners = await pool.query(`
      SELECT id, company_name, type, country, tier, status,
             revenue_share_pct, owner, last_contacted_at, notes
      FROM bizdev_partners
      ORDER BY CASE tier WHEN 'platinum' THEN 1 WHEN 'gold' THEN 2 WHEN 'silver' THEN 3 ELSE 4 END,
               CASE status WHEN 'live' THEN 1 WHEN 'negotiating' THEN 2 WHEN 'signed' THEN 3 ELSE 4 END
      LIMIT 100
    `).catch(() => ({ rows: [] }));

    const agreements = await pool.query(`
      SELECT id, partner_name, title, type, value_sar, commission_pct,
             start_date, end_date, status,
             (end_date::date - CURRENT_DATE) AS days_to_expiry
      FROM bizdev_agreements
      WHERE status NOT IN ('terminated')
      ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
               end_date ASC NULLS LAST
      LIMIT 100
    `).catch(() => ({ rows: [] }));

    const markets = await pool.query(`
      SELECT country_name, country_code, region, status, priority, target_launch_date
      FROM bizdev_markets
      ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    const activities = await pool.query(`
      SELECT partner_name, type, summary, outcome, performed_at
      FROM bizdev_activities
      ORDER BY performed_at DESC LIMIT 30
    `).catch(() => ({ rows: [] }));

    const ps = partners.rows;
    const totalPartners = ps.length;
    const livePartners  = ps.filter(p => p.status === 'live').length;
    const prospectCount = ps.filter(p => p.status === 'prospect').length;
    const expiringIn60  = agreements.rows.filter(a => a.days_to_expiry != null && a.days_to_expiry <= 60 && a.days_to_expiry >= 0);
    const totalAgreements = agreements.rows.length;
    const totalContractValue = agreements.rows
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + parseFloat(a.value_sar || 0), 0);

    const statusBreakdown = {};
    ps.forEach(p => { statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1; });
    const typeBreakdown = {};
    ps.forEach(p => { typeBreakdown[p.type] = (typeBreakdown[p.type] || 0) + 1; });

    const daysSinceContact = (p) => p.last_contacted_at
      ? Math.round((Date.now() - new Date(p.last_contacted_at).getTime()) / 86400000)
      : 999;

    const prompt = `You are an AI Business Development Advisor for UTUBooking.com (Gulf travel platform — SA primary, expanding to 25+ Muslim-world markets). Analyse the partner pipeline and provide strategic B2B growth advice.

Pipeline Summary:
- Total partners: ${totalPartners} (${livePartners} live, ${prospectCount} prospects)
- Active agreements: ${totalAgreements}, total contract value SAR ${totalContractValue.toLocaleString()}
- Agreements expiring within 60 days: ${expiringIn60.length}
- Partner status breakdown: ${JSON.stringify(statusBreakdown)}
- Partner type breakdown: ${JSON.stringify(typeBreakdown)}

Partners (top by tier/status):
${JSON.stringify(ps.slice(0, 25).map(p => ({
  name: p.company_name, type: p.type, country: p.country,
  tier: p.tier, status: p.status,
  revenue_share_pct: p.revenue_share_pct,
  days_since_contact: daysSinceContact(p),
  owner: p.owner,
})), null, 2)}

Active Agreements:
${JSON.stringify(agreements.rows.slice(0, 20).map(a => ({
  partner: a.partner_name, title: a.title, type: a.type,
  value_sar: a.value_sar, commission_pct: a.commission_pct,
  status: a.status, end_date: a.end_date, days_to_expiry: a.days_to_expiry,
})), null, 2)}

Market Expansion Targets:
${JSON.stringify(markets.rows.slice(0, 20).map(m => ({
  country: m.country_name, region: m.region, status: m.status,
  priority: m.priority, target_launch: m.target_launch_date,
})))}

Recent Activity (${activities.rows.length} entries):
${JSON.stringify(activities.rows.slice(0, 10))}

Context:
- UTUBooking competes with Wego, Almosafer, Wingie in Gulf — B2B differentiation is Hajj/Umrah
- Partner types: airlines (codeshare/content), travel_agency (reseller), gds (Amadeus/Sabre), corporate (direct sell), whitelabel, ota (distribution)
- Gulf B2B sales cycles: government/corporate = 90-180 days, agency = 30-60 days
- Revenue share 10-15% = standard, >15% = premium partner, <8% = at risk of churn
- Priority markets: GCC (SA/AE/KW) first, then APAC Muslim world (MY/ID), then Turkey/Pakistan

Respond with ONLY a JSON object (no markdown fences):
{
  "pipeline_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence CCO-level summary",
  "top_partners": [
    { "name": "...", "type": "...", "why": "...", "opportunity": "..." }
  ],
  "at_risk_partners": [
    { "name": "...", "risk": "...", "action": "...", "urgency": "immediate|this_week|this_month" }
  ],
  "expiring_agreements": [
    { "partner": "...", "title": "...", "days_left": 0, "renewal_strategy": "..." }
  ],
  "market_expansion_rec": [
    { "country": "...", "region": "...", "rationale": "...", "partner_type_needed": "..." }
  ],
  "pipeline_gaps": ["gap 1", "gap 2"],
  "quick_wins": ["win 1", "win 2", "win 3"],
  "strategic_priorities": ["priority 1", "priority 2", "priority 3"],
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
      INSERT INTO ai_bizdev_advice
        (snapshot_key, total_partners, total_agreements, pipeline_health,
         executive_summary, top_partners, at_risk_partners, expiring_agreements,
         market_expansion_rec, pipeline_gaps, quick_wins, strategic_priorities,
         recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_partners       = EXCLUDED.total_partners,
        total_agreements     = EXCLUDED.total_agreements,
        pipeline_health      = EXCLUDED.pipeline_health,
        executive_summary    = EXCLUDED.executive_summary,
        top_partners         = EXCLUDED.top_partners,
        at_risk_partners     = EXCLUDED.at_risk_partners,
        expiring_agreements  = EXCLUDED.expiring_agreements,
        market_expansion_rec = EXCLUDED.market_expansion_rec,
        pipeline_gaps        = EXCLUDED.pipeline_gaps,
        quick_wins           = EXCLUDED.quick_wins,
        strategic_priorities = EXCLUDED.strategic_priorities,
        recommendations      = EXCLUDED.recommendations,
        generated_at         = NOW()
    `, [
      'latest', totalPartners, totalAgreements,
      ai.pipeline_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.top_partners ?? []),
      JSON.stringify(ai.at_risk_partners ?? []),
      JSON.stringify(ai.expiring_agreements ?? []),
      JSON.stringify(ai.market_expansion_rec ?? []),
      ai.pipeline_gaps ?? [],
      ai.quick_wins ?? [],
      ai.strategic_priorities ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_bizdev_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-bizdev-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
