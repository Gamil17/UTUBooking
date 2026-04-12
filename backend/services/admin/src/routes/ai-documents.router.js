'use strict';

/**
 * AI Document Generator — POST /api/admin/documents/generate
 *
 * Registered in app.js as:  app.use('/api/admin/documents', requireAdmin, aiDocumentsRouter)
 *
 * Generates professional business documents using Claude claude-sonnet-4-6.
 * Stores generated documents in ai_generated_documents for future reference.
 *
 * Supported document types:
 *   offer_letter          — HR offer letter for a new hire
 *   expense_rejection     — Finance rejection notice for an expense claim
 *   deal_proposal_email   — Sales outreach email for a CRM deal
 *   supplier_contract_summary — Procurement summary of contract terms
 *   welcome_email         — HR onboarding welcome email
 *   performance_improvement_plan — HR PIP document
 *   nda_draft             — Legal non-disclosure agreement draft
 *   po_justification      — Procurement purchase order justification memo
 *
 * GET  /           — list recent documents (paginated)
 * GET  /:id        — full document by ID
 * POST /generate   — generate a new document
 */

const express   = require('express');
const { Pool }  = require('pg');
const Anthropic  = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// ── Bootstrap table ───────────────────────────────────────────────────────────

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_generated_documents (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      type         TEXT        NOT NULL,
      title        TEXT        NOT NULL,
      content_md   TEXT        NOT NULL,
      context_json JSONB       NOT NULL DEFAULT '{}',
      created_by   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-documents] bootstrap error:', e.message));

// ── Document type definitions ─────────────────────────────────────────────────

const DOC_TYPES = new Set([
  'offer_letter',
  'expense_rejection',
  'deal_proposal_email',
  'supplier_contract_summary',
  'welcome_email',
  'performance_improvement_plan',
  'nda_draft',
  'po_justification',
]);

// Derive a short title from context fields for storage
function buildTitle(type, fields) {
  switch (type) {
    case 'offer_letter':                return `Offer Letter — ${fields.candidate_name ?? ''}`;
    case 'expense_rejection':           return `Expense Rejection — ${fields.employee_name ?? ''}`;
    case 'deal_proposal_email':         return `Deal Proposal — ${fields.partner_name ?? ''}`;
    case 'supplier_contract_summary':   return `Contract Summary — ${fields.supplier_name ?? ''}`;
    case 'welcome_email':               return `Welcome Email — ${fields.employee_name ?? ''}`;
    case 'performance_improvement_plan':return `PIP — ${fields.employee_name ?? ''}`;
    case 'nda_draft':                   return `NDA — ${fields.counterparty_name ?? ''}`;
    case 'po_justification':            return `PO Justification — ${fields.item_or_service ?? ''}`;
    default:                            return type;
  }
}

// ── Claude system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional business document writer for UTUBooking.com, a travel booking company headquartered in Saudi Arabia operated by AMEC Solutions.

Writing standards:
- Language: English (professional, formal but warm)
- Currency: SAR (Saudi Riyal) — always write amounts as "SAR X,XXX"
- Regional context: Gulf / Saudi business culture — respectful, relationship-first tone
- Dates: write in full (e.g. "12 April 2026") — do not abbreviate
- Use [PLACEHOLDER] for any field that needs to be filled in before sending
- Output complete, ready-to-use documents in Markdown format
- Include a document header (title, date, To/From where applicable)
- Do NOT add commentary or meta notes — output the document only`;

// ── Type-specific prompt builders ─────────────────────────────────────────────

function buildUserPrompt(type, fields) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  switch (type) {

    case 'offer_letter':
      return `Write a formal employment offer letter.
Today's date: ${today}
Candidate name: ${fields.candidate_name}
Role: ${fields.role}
Department: ${fields.department}
Employment type: ${fields.employment_type}
Monthly salary (SAR): ${fields.salary_sar}
Start date: ${fields.start_date}
Probation period: ${fields.probation_months} months
Reporting to: ${fields.reporting_to}
Work location: ${fields.location}
Additional benefits: ${fields.additional_benefits || 'Standard company benefits package'}

Include: greeting, formal offer statement, role & department, compensation details, start date & probation terms, reporting line, benefits summary, acceptance instructions, closing. Sign off as "Human Resources Department, UTUBooking.com".`;

    case 'expense_rejection':
      return `Write a professional expense claim rejection notice.
Today's date: ${today}
Employee name: ${fields.employee_name}
Claim date: ${fields.claim_date}
Category: ${fields.category}
Amount claimed (SAR): ${fields.amount_sar}
Rejection reason: ${fields.reason}
Additional notes: ${fields.additional_notes || 'None'}
Reviewed by: ${fields.reviewer_name}

Include: reference to the specific claim, clear statement of rejection, reason explained professionally (not harshly), next steps (resubmit with correct documentation / appeal process), polite closing. Sign off as "Finance Department, UTUBooking.com".`;

    case 'deal_proposal_email':
      return `Write a professional B2B partnership proposal email.
Today's date: ${today}
Partner/company name: ${fields.partner_name}
Contact person: ${fields.contact_name}
Partner country: ${fields.partner_country}
Deal type: ${fields.deal_type}
Proposed partnership value (SAR): ${fields.proposed_value_sar || 'TBD'}
Our offering: ${fields.our_offering}
Key differentiators: ${fields.key_differentiators}
Our representative: ${fields.deal_owner}
Suggested meeting/call date: ${fields.cta_date || '[PLACEHOLDER]'}

Include: personalised opening referencing their business, clear value proposition, what UTUBooking.com offers them, key differentiators vs. competitors (Wego, Almosafer), call to action with specific proposed date, professional closing. Email format (Subject line + body).`;

    case 'supplier_contract_summary':
      return `Write a contract summary memo for internal review.
Today's date: ${today}
Supplier name: ${fields.supplier_name}
Contract title: ${fields.contract_title}
Effective date: ${fields.effective_date}
Expiry date: ${fields.expiry_date}
Total contract value (SAR): ${fields.total_value_sar}
Scope of work: ${fields.scope_of_work}
Key obligations: ${fields.key_obligations}
Termination clause: ${fields.termination_clause || 'Standard 30-day written notice'}

Format: Internal Memo. Include: parties, term & value, scope summary, key obligations (both sides), payment terms, termination conditions, risk flags (if any obvious ones can be inferred), recommended action. Sign off as "Procurement Department, UTUBooking.com".`;

    case 'welcome_email':
      return `Write a warm, professional onboarding welcome email.
Today's date: ${today}
Employee name: ${fields.employee_name}
Role: ${fields.role}
Department: ${fields.department}
Start date: ${fields.start_date}
Manager name: ${fields.manager_name}
Office location: ${fields.office_location}
First day instructions: ${fields.first_day_instructions || 'Report to reception at 09:00'}

Include: warm welcome, excitement about them joining, brief intro to what the department does, practical first-day logistics, who to ask for on arrival, next steps before joining (if any), enthusiastic closing. Tone: professional but genuinely warm. Sign off as "People & Culture Team, UTUBooking.com".`;

    case 'performance_improvement_plan':
      return `Write a formal Performance Improvement Plan (PIP) document.
Today's date: ${today}
Employee name: ${fields.employee_name}
Role: ${fields.role}
Department: ${fields.department}
Manager name: ${fields.manager_name}
Areas of concern: ${fields.concern_areas}
Improvement goals: ${fields.improvement_goals}
Support provided by company: ${fields.support_provided}
Review date: ${fields.review_date}
Consequence of non-improvement: ${fields.consequence || 'Further disciplinary action up to and including termination'}

Include: date and parties, purpose statement, specific performance concerns (cite behaviours not character), measurable improvement goals with deadlines, company support commitments, review schedule, signature block for employee and manager. Tone: firm but fair and constructive.`;

    case 'nda_draft':
      return `Draft a Non-Disclosure Agreement (NDA).
Today's date: ${today}
Disclosing party: UTUBooking.com / AMEC Solutions
Receiving party name: ${fields.counterparty_name}
Receiving party type: ${fields.counterparty_type} (company or individual)
Purpose of disclosure: ${fields.purpose}
Confidentiality duration: ${fields.duration_years} years
Governing law jurisdiction: ${fields.governing_jurisdiction || 'Kingdom of Saudi Arabia'}

Include: parties, recitals, definition of confidential information, obligations of receiving party, exclusions from confidentiality, term, return/destruction of materials, remedies for breach, governing law & jurisdiction, signature block. Mark as DRAFT — FOR LEGAL REVIEW BEFORE EXECUTION.`;

    case 'po_justification':
      return `Write a Purchase Order Justification Memo for management approval.
Today's date: ${today}
Item or service: ${fields.item_or_service}
Proposed supplier: ${fields.supplier_name}
Amount (SAR): ${fields.amount_sar}
Department: ${fields.department}
Business justification: ${fields.business_justification}
Alternatives considered: ${fields.alternatives_considered || 'None — sole source'}
Requested by: ${fields.requested_by}
Required by date: ${fields.required_by_date || '[PLACEHOLDER]'}

Format: Internal Memo — TO: Procurement / Finance, FROM: ${fields.requested_by}, RE: PO Approval Request. Include: what is being purchased, why it is needed, which budget line it falls under, alternatives considered and why rejected, urgency/timeline, requested approval action.`;

    default:
      return `Generate a professional business document of type "${type}" using this information: ${JSON.stringify(fields, null, 2)}`;
  }
}

// ── GET / — list documents ────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit ?? '20', 10), 50);
  const offset = parseInt(req.query.offset ?? '0', 10);
  const type   = req.query.type ?? null;

  try {
    const where  = type ? 'WHERE type = $3' : '';
    const vals   = type ? [limit, offset, type] : [limit, offset];
    const cntVal = type ? [type] : [];
    const cntWhere = type ? 'WHERE type = $1' : '';

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT id, type, title, created_by, created_at, LEFT(content_md, 200) AS preview
         FROM ai_generated_documents ${where}
         ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        vals,
      ),
      pool.query(`SELECT COUNT(*) FROM ai_generated_documents ${cntWhere}`, cntVal),
    ]);

    res.json({ data: rows.rows, total: parseInt(count.rows[0].count, 10), limit, offset });
  } catch (err) {
    console.error('[ai-documents] list error:', err.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /:id — full document ──────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM ai_generated_documents WHERE id = $1',
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /generate ────────────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
  const { type, fields = {} } = req.body ?? {};

  if (!type) return res.status(400).json({ error: 'TYPE_REQUIRED' });
  if (!DOC_TYPES.has(type)) return res.status(400).json({ error: 'INVALID_TYPE', valid: [...DOC_TYPES] });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const userPrompt = buildUserPrompt(type, fields);

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: 'NO_OUTPUT', message: 'Claude returned no text' });
    }

    const contentMd = textBlock.text;
    const title     = buildTitle(type, fields);

    const { rows } = await pool.query(
      `INSERT INTO ai_generated_documents (type, title, content_md, context_json, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, title, contentMd, JSON.stringify(fields), req.user?.email ?? 'system'],
    );

    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[ai-documents] generate error:', err.message);
    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(502).json({ error: 'AI_UNAVAILABLE', message: 'AI service not configured' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

module.exports = router;
