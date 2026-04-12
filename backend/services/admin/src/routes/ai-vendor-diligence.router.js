'use strict';

/**
 * AI Vendor Due Diligence Analyzer
 *
 * Registered in app.js as:
 *   app.use('/api/admin/vendor-diligence', requireAdmin, aiVendorDiligenceRouter)
 *
 * GET  /:vendorId  — fetch existing diligence report (404 if none)
 * POST /:vendorId  — run fresh AI due diligence on a vendor
 *
 * Claude output schema:
 *   risk_level              'low' | 'medium' | 'high' | 'critical'
 *   overall_score           number 0-100 (higher = lower risk)
 *   executive_summary       string
 *   risk_flags              string[]
 *   missing_compliance      string[] — missing docs / certifications
 *   financial_health_note   string
 *   payment_history_note    string
 *   sla_performance_note    string
 *   recommendations         string[]
 *   approve_recommendation  'approve' | 'approve_with_conditions' | 'defer' | 'reject'
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
    CREATE TABLE IF NOT EXISTS ai_vendor_diligence (
      id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id              UUID        NOT NULL UNIQUE,
      vendor_name            TEXT,
      risk_level             TEXT        NOT NULL DEFAULT 'medium'
                                         CHECK (risk_level IN ('low','medium','high','critical')),
      overall_score          INT         NOT NULL DEFAULT 50 CHECK (overall_score BETWEEN 0 AND 100),
      executive_summary      TEXT        NOT NULL,
      risk_flags             TEXT[]      NOT NULL DEFAULT '{}',
      missing_compliance     TEXT[]      NOT NULL DEFAULT '{}',
      financial_health_note  TEXT,
      payment_history_note   TEXT,
      sla_performance_note   TEXT,
      recommendations        TEXT[]      NOT NULL DEFAULT '{}',
      approve_recommendation TEXT        NOT NULL DEFAULT 'defer'
                                         CHECK (approve_recommendation IN ('approve','approve_with_conditions','defer','reject')),
      generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-vendor-diligence] bootstrap error:', e.message));

// ── GET /:vendorId ────────────────────────────────────────────────────────────

router.get('/:vendorId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_vendor_diligence WHERE vendor_id = $1',
      [req.params.vendorId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:vendorId — run due diligence ───────────────────────────────────────

router.post('/:vendorId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { vendorId } = req.params;

  // Load vendor profile
  let vendor;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM finance_vendors WHERE id = $1`,
      [vendorId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'VENDOR_NOT_FOUND' });
    vendor = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Load invoice history (last 12 months)
  const invoices = await pool.query(
    `SELECT invoice_no, amount, currency, status, due_date, payment_date, category
       FROM finance_invoices
      WHERE vendor_id = $1 AND created_at > NOW() - INTERVAL '12 months'
      ORDER BY created_at DESC LIMIT 20`,
    [vendorId]
  ).then(r => r.rows).catch(() => []);

  // Load procurement contracts
  const contracts = await pool.query(
    `SELECT title, contract_type, status, start_date, end_date, value_sar, currency
       FROM procurement_contracts
      WHERE vendor_id = $1
      ORDER BY created_at DESC LIMIT 5`,
    [vendorId]
  ).then(r => r.rows).catch(() => []);

  // Load SLA history
  const slas = await pool.query(
    `SELECT sla_type, target_value, actual_value, period, met
       FROM procurement_slas
      WHERE vendor_id = $1
      ORDER BY period DESC LIMIT 10`,
    [vendorId]
  ).then(r => r.rows).catch(() => []);

  // Build data summary for Claude
  const totalInvoiced = invoices.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);
  const overdueCount  = invoices.filter(inv => inv.status === 'overdue').length;
  const disputedCount = invoices.filter(inv => inv.status === 'disputed').length;
  const paidOnTime    = invoices.filter(inv => inv.status === 'paid' && inv.payment_date && inv.due_date && inv.payment_date <= inv.due_date).length;
  const slaMet        = slas.filter(s => s.met).length;

  const systemPrompt = `You are the Procurement & Risk AI for UTUBooking.com, a Series A Gulf travel tech startup. You conduct AI-powered vendor due diligence to help the Procurement Manager and CFO decide whether to onboard, renew, or reject a vendor relationship.

UTUBooking vendor requirements:
- All vendors handling payments or user data must have PCI-DSS or equivalent certification
- GCC-operating vendors need Saudi ZATCA registration for VAT invoicing
- Technology vendors must provide SLAs with uptime guarantees ≥99.5%
- Preferred payment terms: Net-30 or Net-45
- Red flags: disputed invoices >10%, overdue invoices >20%, no bank details, blocked status history

Output ONLY valid JSON — no markdown fences, no commentary.

JSON structure:
{
  "risk_level": "low|medium|high|critical",
  "overall_score": <0-100 integer>,
  "executive_summary": "<3-4 sentence executive briefing>",
  "risk_flags": ["<specific risk — be precise>"],
  "missing_compliance": ["<missing cert, registration, or documentation>"],
  "financial_health_note": "<invoice history assessment>",
  "payment_history_note": "<on-time payment, overdue, disputes analysis>",
  "sla_performance_note": "<SLA track record assessment — or 'No SLA history found'>",
  "recommendations": ["<specific actionable recommendation for procurement>"],
  "approve_recommendation": "approve|approve_with_conditions|defer|reject"
}`;

  const userPrompt = `Run vendor due diligence for UTUBooking procurement:

VENDOR PROFILE
Name:            ${vendor.name}
Type:            ${vendor.vendor_type}
Country:         ${vendor.country ?? 'Not specified'}
Currency:        ${vendor.currency}
Status:          ${vendor.status}
Tax ID:          ${vendor.tax_id ?? 'NOT PROVIDED'}
Payment Terms:   ${vendor.payment_terms ?? 'Not specified'}
Bank Name:       ${vendor.bank_name ?? 'NOT PROVIDED'}
IBAN:            ${vendor.iban ? 'Provided' : 'NOT PROVIDED'}
Contact Email:   ${vendor.contact_email ?? 'Not provided'}
Notes:           ${vendor.notes ?? 'None'}

INVOICE HISTORY (last 12 months)
Total Invoiced:  ${vendor.currency} ${totalInvoiced.toFixed(2)}
Invoice Count:   ${invoices.length}
Overdue:         ${overdueCount} (${invoices.length ? Math.round(overdueCount/invoices.length*100) : 0}%)
Disputed:        ${disputedCount}
Paid On Time:    ${paidOnTime}/${invoices.filter(i => i.status === 'paid').length}

CONTRACTS
Active Contracts: ${contracts.filter(c => c.status === 'active').length}
${contracts.map(c => `  - ${c.title || 'Unnamed'} (${c.contract_type}, ${c.status}, expires: ${c.end_date ?? 'open-ended'})`).join('\n') || '  None found'}

SLA PERFORMANCE
SLA Records Found: ${slas.length}
${slas.length ? `SLA Met Rate: ${slaMet}/${slas.length} (${Math.round(slaMet/slas.length*100)}%)` : 'No SLA records'}
${slas.slice(0, 5).map(s => `  - ${s.sla_type}: target=${s.target_value}, actual=${s.actual_value ?? 'N/A'}, met=${s.met}`).join('\n')}

Generate the due diligence report. Be specific and commercial in tone. Highlight any missing banking details or tax registration as high-priority gaps. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,
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

    const VALID_RISK  = new Set(['low','medium','high','critical']);
    const VALID_REC   = new Set(['approve','approve_with_conditions','defer','reject']);
    const risk        = VALID_RISK.has(parsed.risk_level) ? parsed.risk_level : 'medium';
    const approve_rec = VALID_REC.has(parsed.approve_recommendation) ? parsed.approve_recommendation : 'defer';
    const score       = Math.max(0, Math.min(100, parseInt(parsed.overall_score, 10) || 50));

    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_vendor_diligence
        (vendor_id, vendor_name, risk_level, overall_score, executive_summary,
         risk_flags, missing_compliance, financial_health_note, payment_history_note,
         sla_performance_note, recommendations, approve_recommendation)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (vendor_id) DO UPDATE SET
        vendor_name            = EXCLUDED.vendor_name,
        risk_level             = EXCLUDED.risk_level,
        overall_score          = EXCLUDED.overall_score,
        executive_summary      = EXCLUDED.executive_summary,
        risk_flags             = EXCLUDED.risk_flags,
        missing_compliance     = EXCLUDED.missing_compliance,
        financial_health_note  = EXCLUDED.financial_health_note,
        payment_history_note   = EXCLUDED.payment_history_note,
        sla_performance_note   = EXCLUDED.sla_performance_note,
        recommendations        = EXCLUDED.recommendations,
        approve_recommendation = EXCLUDED.approve_recommendation,
        generated_at           = NOW()
      RETURNING *
    `, [
      vendorId, vendor.name, risk, score,
      parsed.executive_summary      ?? '',
      parsed.risk_flags             ?? [],
      parsed.missing_compliance     ?? [],
      parsed.financial_health_note  ?? null,
      parsed.payment_history_note   ?? null,
      parsed.sla_performance_note   ?? null,
      parsed.recommendations        ?? [],
      approve_rec,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-vendor-diligence] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
