'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_procurement_risk (
      id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key           TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_suppliers        INT         NOT NULL DEFAULT 0,
      total_contracts        INT         NOT NULL DEFAULT 0,
      overall_risk           TEXT        NOT NULL DEFAULT 'medium',
      executive_summary      TEXT        NOT NULL,
      expiring_contracts     JSONB       NOT NULL DEFAULT '[]',
      sla_breach_risks       JSONB       NOT NULL DEFAULT '[]',
      high_risk_suppliers    JSONB       NOT NULL DEFAULT '[]',
      spend_concentration    TEXT,
      consolidation_opportunities TEXT[],
      compliance_gaps        TEXT[],
      quick_wins             TEXT[],
      recommendations        TEXT[]      NOT NULL DEFAULT '{}',
      generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-procurement-risk] bootstrap error:', e.message));

// GET /api/admin/procurement-risk
router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_procurement_risk WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/admin/procurement-risk
router.post('/', async (_req, res) => {
  try {
    const suppliers = await pool.query(`
      SELECT id, name, type, status, country, annual_value_sar, notes
      FROM procurement_suppliers WHERE deleted_at IS NULL
      ORDER BY annual_value_sar DESC NULLS LAST
      LIMIT 100
    `).catch(() => ({ rows: [] }));

    const contracts = await pool.query(`
      SELECT id, supplier_name, title, type, value_sar, start_date, end_date,
             auto_renews, status,
             (end_date::date - CURRENT_DATE) AS days_to_expiry
      FROM procurement_contracts
      WHERE status NOT IN ('cancelled','expired')
      ORDER BY end_date ASC NULLS LAST
      LIMIT 100
    `).catch(() => ({ rows: [] }));

    const slas = await pool.query(`
      SELECT supplier_name, metric, target_value, unit, current_value, status
      FROM procurement_slas
      ORDER BY status DESC
      LIMIT 100
    `).catch(() => ({ rows: [] }));

    const pos = await pool.query(`
      SELECT supplier_name, amount_sar, status, ordered_at, expected_at
      FROM procurement_purchase_orders
      WHERE status NOT IN ('completed','cancelled')
      ORDER BY amount_sar DESC NULLS LAST
      LIMIT 50
    `).catch(() => ({ rows: [] }));

    const totalSuppliers = suppliers.rows.length;
    const totalContracts = contracts.rows.length;
    const expiringIn60 = contracts.rows.filter(c => c.days_to_expiry <= 60 && c.days_to_expiry >= 0);
    const breachedSlas = slas.rows.filter(s => s.status === 'breached');
    const totalSpend = suppliers.rows.reduce((s, x) => s + parseFloat(x.annual_value_sar || 0), 0);

    const prompt = `You are an AI Procurement Risk Advisor for UTUBooking.com (travel technology company, Riyadh-based, ZATCA/VAT regulated). Analyse the procurement portfolio.

Portfolio Summary:
- Suppliers: ${totalSuppliers} (active, total annual value SAR ${totalSpend.toLocaleString()})
- Contracts: ${totalContracts} active, ${expiringIn60.length} expiring within 60 days
- SLA breaches: ${breachedSlas.length} active breaches

Suppliers (by spend):
${JSON.stringify(suppliers.rows.slice(0, 20).map(s => ({
  name: s.name, type: s.type, status: s.status,
  country: s.country, annual_value_sar: s.annual_value_sar,
})), null, 2)}

Contracts (soonest expiry first):
${JSON.stringify(contracts.rows.slice(0, 20).map(c => ({
  supplier: c.supplier_name, title: c.title, type: c.type,
  value_sar: c.value_sar, end_date: c.end_date,
  days_to_expiry: c.days_to_expiry, auto_renews: c.auto_renews,
})), null, 2)}

SLA Status:
${JSON.stringify(slas.rows.map(s => ({
  supplier: s.supplier_name, metric: s.metric,
  target: s.target_value, current: s.current_value,
  unit: s.unit, status: s.status,
})), null, 2)}

Open POs:
${JSON.stringify(pos.rows.slice(0, 15))}

Context:
- Saudi Arabia: ZATCA e-invoicing mandatory, prefer MISA-registered suppliers
- Single-supplier concentration risk > 40% of spend is critical
- Contracts expiring <30 days with no auto-renew = emergency
- SLA breaches from tech/cloud providers can affect platform uptime

Respond with ONLY a JSON object (no markdown fences):
{
  "overall_risk": "low|medium|high|critical",
  "executive_summary": "2-3 sentence CPO-level summary",
  "expiring_contracts": [
    { "supplier": "...", "title": "...", "end_date": "...", "days_left": 0, "action_needed": "..." }
  ],
  "sla_breach_risks": [
    { "supplier": "...", "metric": "...", "gap": "...", "impact": "..." }
  ],
  "high_risk_suppliers": [
    { "name": "...", "risk": "...", "reason": "..." }
  ],
  "spend_concentration": "paragraph on spend distribution risk",
  "consolidation_opportunities": ["opp 1", "opp 2"],
  "compliance_gaps": ["gap 1"],
  "quick_wins": ["win 1", "win 2"],
  "recommendations": ["rec 1", "rec 2", "rec 3"]
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
      INSERT INTO ai_procurement_risk
        (snapshot_key, total_suppliers, total_contracts, overall_risk,
         executive_summary, expiring_contracts, sla_breach_risks, high_risk_suppliers,
         spend_concentration, consolidation_opportunities, compliance_gaps,
         quick_wins, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_suppliers   = EXCLUDED.total_suppliers,
        total_contracts   = EXCLUDED.total_contracts,
        overall_risk      = EXCLUDED.overall_risk,
        executive_summary = EXCLUDED.executive_summary,
        expiring_contracts = EXCLUDED.expiring_contracts,
        sla_breach_risks  = EXCLUDED.sla_breach_risks,
        high_risk_suppliers = EXCLUDED.high_risk_suppliers,
        spend_concentration = EXCLUDED.spend_concentration,
        consolidation_opportunities = EXCLUDED.consolidation_opportunities,
        compliance_gaps   = EXCLUDED.compliance_gaps,
        quick_wins        = EXCLUDED.quick_wins,
        recommendations   = EXCLUDED.recommendations,
        generated_at      = NOW()
    `, [
      'latest', totalSuppliers, totalContracts,
      ai.overall_risk ?? 'medium',
      ai.executive_summary ?? '',
      JSON.stringify(ai.expiring_contracts ?? []),
      JSON.stringify(ai.sla_breach_risks ?? []),
      JSON.stringify(ai.high_risk_suppliers ?? []),
      ai.spend_concentration ?? null,
      ai.consolidation_opportunities ?? [],
      ai.compliance_gaps ?? [],
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_procurement_risk WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-procurement-risk] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
