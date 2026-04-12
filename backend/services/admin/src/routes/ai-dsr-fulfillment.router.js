'use strict';

/**
 * AI DSR Auto-Fulfillment Assistant
 *
 * Registered in app.js as:
 *   app.use('/api/admin/dsr-fulfillment', requireAdmin, aiDsrFulfillmentRouter)
 *
 * GET  /:dsrId  — fetch existing fulfillment package (404 if none)
 * POST /:dsrId  — compile data across all shards + generate cover letter + store
 *
 * The POST does NOT send anything automatically. It assembles and previews the
 * data package for DPO review before the DPO clicks Send in the compliance UI.
 * This follows CLAUDE.md rule: "NEVER send emails to clients without human approval"
 *
 * Claude output schema:
 *   cover_letter_md      string  — personalised cover letter in Markdown
 *   data_summary         string  — 2-3 sentence summary of what data was found
 *   categories_found     string[] — data categories present across shards
 *   shard_summary        { shard, has_data, record_count, tables_found }[]
 *   retention_notes      string[] — which data will be retained and why (legal basis)
 *   recommended_redactions string[] — fields to redact before sending (e.g., internal notes)
 *   sla_status           'on_track' | 'at_risk' | 'overdue'
 *   response_deadline    string  — ISO date of 30-day deadline
 */

const express         = require('express');
const { Pool }        = require('pg');
const Anthropic        = require('@anthropic-ai/sdk');
const { getShardPool } = require('../../../../shared/shard-router');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

const SHARD_REPS = ['SA', 'GB', 'DE', 'IN', 'ID', 'US', 'CA', 'BR'];

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_dsr_fulfillments (
      id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      dsr_id                 UUID        NOT NULL UNIQUE,
      email_snapshot         TEXT,
      request_type           TEXT,
      law                    TEXT,
      cover_letter_md        TEXT        NOT NULL,
      data_summary           TEXT        NOT NULL,
      categories_found       TEXT[]      NOT NULL DEFAULT '{}',
      shard_summary          JSONB       NOT NULL DEFAULT '[]',
      retention_notes        TEXT[]      NOT NULL DEFAULT '{}',
      recommended_redactions TEXT[]      NOT NULL DEFAULT '{}',
      sla_status             TEXT        NOT NULL DEFAULT 'on_track'
                                         CHECK (sla_status IN ('on_track','at_risk','overdue')),
      response_deadline      TEXT,
      total_records_found    INT         NOT NULL DEFAULT 0,
      generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-dsr-fulfillment] bootstrap error:', e.message));

// ── Data compilation helper ───────────────────────────────────────────────────

async function compileUserData(emailSnapshot) {
  const email = emailSnapshot?.trim().toLowerCase();
  if (!email) return [];

  const shardResults = await Promise.allSettled(
    SHARD_REPS.map(async (cc) => {
      const shardPool = getShardPool(cc);
      const tables = [];
      let totalRecords = 0;

      // Bookings
      const bookings = await shardPool.query(
        `SELECT id, check_in, check_out, hotel_name, total_price, currency, status, created_at
         FROM bookings WHERE LOWER(guest_email) = $1
         ORDER BY created_at DESC LIMIT 20`,
        [email]
      ).catch(() => ({ rows: [] }));
      if (bookings.rows.length) { tables.push('bookings'); totalRecords += bookings.rows.length; }

      // Payments
      const payments = await shardPool.query(
        `SELECT id, amount, currency, status, gateway, created_at
         FROM payments WHERE LOWER(user_email) = $1
         ORDER BY created_at DESC LIMIT 20`,
        [email]
      ).catch(() => ({ rows: [] }));
      if (payments.rows.length) { tables.push('payments'); totalRecords += payments.rows.length; }

      // Consent logs
      const consents = await shardPool.query(
        `SELECT purpose, granted, source, created_at
         FROM consent_logs WHERE LOWER(email) = $1
         ORDER BY created_at DESC LIMIT 30`,
        [email]
      ).catch(() => ({ rows: [] }));
      if (consents.rows.length) { tables.push('consent_logs'); totalRecords += consents.rows.length; }

      // User profile
      const profile = await shardPool.query(
        `SELECT id, email, full_name, phone, country_code, created_at, last_login
         FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      ).catch(() => ({ rows: [] }));
      if (profile.rows.length) { tables.push('user_profile'); totalRecords++; }

      // Support tickets
      const tickets = await shardPool.query(
        `SELECT id, subject, category, priority, status, created_at
         FROM ops_support_tickets WHERE LOWER(user_email) = $1
         ORDER BY created_at DESC LIMIT 10`,
        [email]
      ).catch(() => ({ rows: [] }));
      if (tickets.rows.length) { tables.push('support_tickets'); totalRecords += tickets.rows.length; }

      return {
        shard:        cc,
        has_data:     totalRecords > 0,
        record_count: totalRecords,
        tables_found: tables,
        data: {
          profile:  profile.rows[0] ?? null,
          bookings: bookings.rows,
          payments: payments.rows.map(p => ({ ...p, amount: `${p.currency} ${p.amount}` })),
          consents: consents.rows,
          tickets:  tickets.rows,
        },
      };
    })
  );

  return shardResults.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { shard: SHARD_REPS[i], has_data: false, record_count: 0, tables_found: [], data: {}, error: r.reason?.message }
  );
}

// ── GET /:dsrId — fetch existing fulfillment ──────────────────────────────────

router.get('/:dsrId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_dsr_fulfillments WHERE dsr_id = $1',
      [req.params.dsrId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ── POST /:dsrId — compile data + generate fulfillment package ────────────────

router.post('/:dsrId', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { dsrId } = req.params;

  // Load DSR from SA shard (where it was written)
  let dsr;
  try {
    const saPool = getShardPool('SA');
    const { rows } = await saPool.query(
      `SELECT id, email_snapshot, requested_at, status, law, reason
       FROM erasure_requests WHERE id = $1 LIMIT 1`,
      [dsrId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'DSR_NOT_FOUND' });
    dsr = rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }

  // Compile user data across all shards
  const shardData = await compileUserData(dsr.email_snapshot);
  const totalRecords  = shardData.reduce((s, r) => s + r.record_count, 0);
  const allCategories = [...new Set(shardData.flatMap(r => r.tables_found))];

  // SLA calculation (30 days from requested_at)
  const requestedAt = new Date(dsr.requested_at);
  const deadline    = new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft    = Math.floor((deadline - new Date()) / 86_400_000);
  const slaStatus   = daysLeft < 0 ? 'overdue' : daysLeft <= 5 ? 'at_risk' : 'on_track';

  // Build data summary for Claude
  const shardSummaryText = shardData
    .filter(s => s.has_data)
    .map(s => `  ${s.shard}: ${s.record_count} records in [${s.tables_found.join(', ')}]`)
    .join('\n') || '  No personal data found across any shard.';

  const profileShard = shardData.find(s => s.data?.profile);
  const profile = profileShard?.data?.profile;
  const totalBookings = shardData.reduce((s, r) => s + (r.data?.bookings?.length ?? 0), 0);
  const totalPayments = shardData.reduce((s, r) => s + (r.data?.payments?.length ?? 0), 0);

  const systemPrompt = `You are the DPO (Data Protection Officer) AI assistant for UTUBooking.com. You help fulfil Data Subject Requests (DSRs) under GDPR, PDPL-KSA, CCPA, and other applicable data protection laws.

UTUBooking.com processes data across 8 regional shards (SA, GB, DE, IN, ID, US, CA, BR) under AWS regional hosting.

Legal retention obligations (data that cannot be erased):
- Payment records: 7 years (Saudi accounting law, VAT records)
- Booking confirmations: 5 years (consumer protection)
- Consent logs: 3 years post-withdrawal (audit requirement)
- Fraud-flagged transactions: duration of fraud investigation
- GACA-mandated flight passenger records: 5 years

Tone: Professional, empathetic, clear. The cover letter should be in English (translate summary to Arabic if law = PDPL).

Output ONLY valid JSON — no markdown fences, no commentary.

JSON structure:
{
  "cover_letter_md": "<full cover letter in Markdown — include date, subject ref, greeting, what data was found, what will be erased vs retained and why, timeline, contact details>",
  "data_summary": "<2-3 sentence plain-language summary of what personal data UTUBooking holds for this subject>",
  "categories_found": ["<data category>"],
  "shard_summary": [{ "shard": "<CC>", "has_data": true, "record_count": 0, "tables_found": [] }],
  "retention_notes": ["<specific data retained and legal basis>"],
  "recommended_redactions": ["<field or table to redact from export before sending — e.g. internal fraud notes, staff comments>"],
  "sla_status": "<on_track|at_risk|overdue>",
  "response_deadline": "<ISO date>"
}`;

  const userPrompt = `Generate a DSR fulfilment package for this request:

REQUEST DETAILS
DSR ID:         ${dsr.id}
Subject Email:  ${dsr.email_snapshot}
Request Type:   ${dsr.law ?? 'Not specified'} — ${dsr.reason ?? 'No reason given'}
Status:         ${dsr.status}
Received:       ${dsr.requested_at}
Deadline:       ${deadline.toISOString().slice(0, 10)} (${daysLeft >= 0 ? `${daysLeft} days remaining` : `${Math.abs(daysLeft)} days OVERDUE`})
SLA Status:     ${slaStatus.toUpperCase()}

DATA FOUND ACROSS SHARDS
Total Records:  ${totalRecords}
Categories:     ${allCategories.join(', ') || 'None found'}
Shard Breakdown:
${shardSummaryText}

SUBJECT PROFILE (if found)
Name:         ${profile?.full_name ?? 'Not found'}
Registered:   ${profile?.created_at ?? 'Unknown'}
Last Login:   ${profile?.last_login ?? 'Unknown'}
Country:      ${profile?.country_code ?? 'Unknown'}
Bookings:     ${totalBookings} total bookings found
Payments:     ${totalPayments} payment records found

Generate the DSR fulfilment package. The cover letter should be addressed to the data subject at ${dsr.email_snapshot}. Be specific about what data was found and what will be erased vs retained. Return JSON only.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2500,
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

    const validSla = new Set(['on_track', 'at_risk', 'overdue']);
    const finalSla = validSla.has(parsed.sla_status) ? parsed.sla_status : slaStatus;

    const { rows: [result] } = await pool.query(`
      INSERT INTO ai_dsr_fulfillments
        (dsr_id, email_snapshot, request_type, law,
         cover_letter_md, data_summary, categories_found,
         shard_summary, retention_notes, recommended_redactions,
         sla_status, response_deadline, total_records_found)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (dsr_id) DO UPDATE SET
        cover_letter_md        = EXCLUDED.cover_letter_md,
        data_summary           = EXCLUDED.data_summary,
        categories_found       = EXCLUDED.categories_found,
        shard_summary          = EXCLUDED.shard_summary,
        retention_notes        = EXCLUDED.retention_notes,
        recommended_redactions = EXCLUDED.recommended_redactions,
        sla_status             = EXCLUDED.sla_status,
        response_deadline      = EXCLUDED.response_deadline,
        total_records_found    = EXCLUDED.total_records_found,
        generated_at           = NOW()
      RETURNING *
    `, [
      dsrId,
      dsr.email_snapshot,
      dsr.law ?? null,
      dsr.law ?? null,
      parsed.cover_letter_md      ?? '',
      parsed.data_summary         ?? '',
      parsed.categories_found      ?? allCategories,
      JSON.stringify(parsed.shard_summary ?? shardData.map(s => ({
        shard: s.shard, has_data: s.has_data, record_count: s.record_count, tables_found: s.tables_found
      }))),
      parsed.retention_notes       ?? [],
      parsed.recommended_redactions ?? [],
      finalSla,
      parsed.response_deadline ?? deadline.toISOString().slice(0, 10),
      totalRecords,
    ]);

    return res.json({ data: result });

  } catch (err) {
    console.error('[ai-dsr-fulfillment] error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
