'use strict';

/**
 * AI Contract & Legal Document Reviewer
 *
 * Registered in app.js as: app.use('/api/admin/contract-review', requireAdmin, aiContractReviewerRouter)
 *
 * Reads from legal_documents (legal-service table, same DB).
 * Writes review to ai_contract_reviews (admin-service table).
 *
 * GET  /:docId   — fetch existing review (404 if none)
 * POST /:docId   — run AI review, store & return result
 * GET  /         — list recent reviews (newest first)
 *
 * Claude output schema:
 *   risk_level         'low' | 'medium' | 'high' | 'critical'
 *   overall_summary    2-3 sentence assessment of this document's risk posture
 *   risk_flags         string[]  — specific legal risks identified
 *   missing_clauses    string[]  — standard protections that may be absent for this doc type
 *   compliance_notes   string[]  — jurisdiction-specific regulatory considerations
 *   expiry_alert       string | null — if expiry is approaching or already passed
 *   recommendations    string[]  — what the legal team should do next
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
    CREATE TABLE IF NOT EXISTS ai_contract_reviews (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_id           UUID        NOT NULL UNIQUE,
      doc_title        TEXT,
      doc_type         TEXT,
      risk_level       TEXT        NOT NULL
                                   CHECK (risk_level IN ('low','medium','high','critical')),
      overall_summary  TEXT        NOT NULL,
      risk_flags       TEXT[]      NOT NULL DEFAULT '{}',
      missing_clauses  TEXT[]      NOT NULL DEFAULT '{}',
      compliance_notes TEXT[]      NOT NULL DEFAULT '{}',
      expiry_alert     TEXT,
      recommendations  TEXT[]      NOT NULL DEFAULT '{}',
      generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-contract-reviewer] bootstrap error:', e.message));

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert in-house legal counsel for UTUBooking.com, a travel booking technology company headquartered in Saudi Arabia, operating across the Gulf and Muslim World.

Company context:
- UTUBooking.com: Travel tech startup (Hotels, Flights, Cars, Hajj/Umrah). Series A funded.
- HQ: Riyadh, KSA. Operations in UAE, Jordan, remote MENA. Expanding to EU, US, LATAM, APAC.
- Key legal risks: Platform liability for third-party hotel/flight failures, data privacy (GDPR, CCPA, PDPL-KSA), IP in AI/pricing algorithms, payment gateway agreements, Hajj service contracts (Ministry of Hajj regulations), franchise/white-label agreements
- Common counterparties: Hotel chains (Accor, Hilton, IHG), airlines (Saudia, Flydubai), payment processors (Stripe, HyperPay), SaaS vendors (AWS, Anthropic), local travel agencies, government authorities (GACA, SAMA, Ministry of Hajj)
- Governing law preference: Saudi law or UAE DIFC for Gulf deals; English law for EU/UK; NY/DE for US investor agreements

Document type specific risks:
- contract: check for liability caps, IP ownership, termination rights, payment terms, governing law, dispute resolution
- nda: check duration (max 3 years typical), scope (mutual vs one-way), carve-outs, return of information
- license: check exclusivity, territory scope, sub-licensing rights, term and renewal, source code escrow for critical software
- certificate: verify issuing authority, validity period, geographic scope, renewal requirements
- filing: check deadline compliance, jurisdiction, completeness of disclosures
- opinion: verify counsel credentials, scope limitations, reliance language

Compliance jurisdictions to flag:
- SA (KSA): PDPL (Personal Data Protection Law), SAMA payments regulations, GACA aviation rules, Ministry of Hajj permits
- EU/GB: GDPR Art. 28/46 data processing agreements, Standard Contractual Clauses for data transfer
- US: CCPA, Delaware/NY commercial law, FTC guidelines
- TR: KVKK data protection

Analysis rules:
- Be specific — name the clause, not just "missing liability cap"
- For missing clauses, only flag what's genuinely standard for that document type — don't invent requirements
- Expiry alert: flag if expiry_date is within 90 days from today or already past
- risk_level 'critical' = requires immediate legal attention before any use; 'high' = review required before renewal/signing; 'medium' = minor issues to address at next review; 'low' = clean, standard document
- Output ONLY valid JSON — no markdown fences, no commentary before/after

Output this exact JSON structure:
{
  "risk_level": "<low|medium|high|critical>",
  "overall_summary": "<2-3 sentence assessment of this document's risk posture>",
  "risk_flags": ["<specific legal risk 1>", "<specific legal risk 2>"],
  "missing_clauses": ["<standard protection that may be missing for this doc type>"],
  "compliance_notes": ["<jurisdiction-specific regulatory consideration>"],
  "expiry_alert": "<expiry warning if applicable, else null>",
  "recommendations": ["<what the legal team should do next>"]
}`;

// ── GET / — list recent reviews ───────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);

  try {
    const [rows, count] = await Promise.all([
      pool.query(`
        SELECT id, doc_id, doc_title, doc_type, risk_level, generated_at
        FROM ai_contract_reviews
        ORDER BY generated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query('SELECT COUNT(*) FROM ai_contract_reviews'),
    ]);
    res.json({ data: rows.rows, total: parseInt(count.rows[0].count, 10), limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── GET /:docId — fetch existing review ───────────────────────────────────────

router.get('/:docId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_contract_reviews WHERE doc_id = $1',
      [req.params.docId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:docId — run AI review ──────────────────────────────────────────────

router.post('/:docId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { docId } = req.params;

  // Load legal document
  let doc;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, doc_type, counterparty, jurisdiction, status,
              execution_date, expiry_date, file_url, notes, created_at
       FROM legal_documents WHERE id = $1`,
      [docId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
    doc = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Optionally load linked matter for extra context
  let matterTitle = null;
  try {
    const { rows } = await pool.query(
      `SELECT lm.title FROM legal_documents ld
       JOIN legal_matters lm ON lm.id = ld.matter_id
       WHERE ld.id = $1 LIMIT 1`,
      [docId],
    );
    if (rows[0]) matterTitle = rows[0].title;
  } catch {
    // Non-critical
  }

  // Compute expiry context
  const today      = new Date();
  const expiryDate = doc.expiry_date ? new Date(doc.expiry_date) : null;
  const daysToExpiry = expiryDate
    ? Math.floor((expiryDate - today) / 86_400_000)
    : null;

  let expiryContext = 'No expiry date set';
  if (daysToExpiry !== null) {
    if (daysToExpiry < 0)        expiryContext = `EXPIRED ${Math.abs(daysToExpiry)} days ago`;
    else if (daysToExpiry <= 30) expiryContext = `Expires in ${daysToExpiry} days — IMMINENT`;
    else if (daysToExpiry <= 90) expiryContext = `Expires in ${daysToExpiry} days — within 90-day review window`;
    else                         expiryContext = `Expires in ${daysToExpiry} days (${doc.expiry_date})`;
  }

  const docAge = doc.execution_date
    ? Math.floor((today - new Date(doc.execution_date)) / 86_400_000)
    : null;

  const userPrompt = `Review this legal document for UTUBooking.com and return your assessment as JSON only.

DOCUMENT DETAILS
Title:          ${doc.title}
Type:           ${doc.doc_type}
Counterparty:   ${doc.counterparty ?? 'Not specified'}
Jurisdiction:   ${doc.jurisdiction ?? 'Not specified'}
Status:         ${doc.status}
Execution date: ${doc.execution_date ?? 'Not executed'}${docAge !== null ? ` (${docAge} days ago)` : ''}
Expiry:         ${expiryContext}
File attached:  ${doc.file_url ? 'Yes' : 'No'}
${matterTitle ? `Linked matter: ${matterTitle}` : ''}

NOTES / DESCRIPTION:
---
${doc.notes ?? '(No notes or description provided)'}
---

Review this document for legal risks, missing protective clauses, and compliance considerations relevant to UTUBooking.com's operations. Return JSON only.

Note: Since you cannot see the actual document text (only metadata and notes), base your assessment on what is known, flag the expiry status, identify risks typical for this document type and jurisdiction, and note what clauses to verify exist in the actual document.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) return res.status(500).json({ error: 'NO_OUTPUT' });

    // Parse Claude's JSON output
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

    // Validate
    const validRisks = new Set(['low', 'medium', 'high', 'critical']);
    const riskLevel  = validRisks.has(parsed.risk_level) ? parsed.risk_level : 'medium';

    // UPSERT
    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_contract_reviews
        (doc_id, doc_title, doc_type, risk_level, overall_summary,
         risk_flags, missing_clauses, compliance_notes, expiry_alert, recommendations)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (doc_id) DO UPDATE SET
        doc_title        = EXCLUDED.doc_title,
        doc_type         = EXCLUDED.doc_type,
        risk_level       = EXCLUDED.risk_level,
        overall_summary  = EXCLUDED.overall_summary,
        risk_flags       = EXCLUDED.risk_flags,
        missing_clauses  = EXCLUDED.missing_clauses,
        compliance_notes = EXCLUDED.compliance_notes,
        expiry_alert     = EXCLUDED.expiry_alert,
        recommendations  = EXCLUDED.recommendations,
        generated_at     = NOW()
      RETURNING *
    `, [
      docId,
      doc.title,
      doc.doc_type,
      riskLevel,
      parsed.overall_summary  ?? '',
      parsed.risk_flags        ?? [],
      parsed.missing_clauses   ?? [],
      parsed.compliance_notes  ?? [],
      parsed.expiry_alert      ?? null,
      parsed.recommendations   ?? [],
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-contract-reviewer] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
