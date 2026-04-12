'use strict';

/**
 * Finance Department routes — admin service.
 *
 * Registered in app.js as:  app.use('/api/admin/finance', financeRouter)
 * Auth: adminAuth middleware (Bearer ADMIN_SECRET or JWT super_admin)
 *
 * ── Revenue Reporting (existing) ──────────────────────────────────────────────
 * GET /summary          — KPIs: revenue today/week/month/YTD, by product, by currency,
 *                         refunds summary, reconciliation check
 * GET /daily?days=30    — daily revenue time series (SAR normalised)
 * GET /refunds          — paginated list of refunded payments
 * GET /reconciliation   — confirmed bookings SAR vs paid payments SAR
 *
 * ── Operational Finance (v2.3.0) ──────────────────────────────────────────────
 * GET/POST /vendors               Vendor master list
 * PATCH/DELETE /vendors/:id
 * GET/POST /invoices              Vendor invoice tracking
 * PATCH /invoices/:id
 * GET/POST /budgets               Annual/quarterly budgets
 * PATCH /budgets/:id
 * GET/POST /budgets/:id/lines     Budget line items
 * PATCH/DELETE /budget-lines/:id
 * GET/POST /expense-claims        Employee expense reimbursements
 * PATCH /expense-claims/:id
 */

const { Router } = require('express');
const { Pool }   = require('pg');
const adminAuth  = require('../middleware/adminAuth');
const wf         = require('../lib/workflow-client');

const router = Router();
router.use(adminAuth);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// ── Bootstrap operational finance tables ─────────────────────────────────────
async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_vendors (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           TEXT NOT NULL UNIQUE,
      vendor_type    TEXT NOT NULL DEFAULT 'other',
      country        TEXT,
      currency       TEXT NOT NULL DEFAULT 'SAR',
      tax_id         TEXT,
      payment_terms  TEXT,
      bank_name      TEXT,
      iban           TEXT,
      swift_bic      TEXT,
      contact_email  TEXT,
      status         TEXT NOT NULL DEFAULT 'active',
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS finance_invoices (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_no     TEXT NOT NULL,
      vendor_id      UUID REFERENCES finance_vendors(id) ON DELETE SET NULL,
      vendor_name    TEXT NOT NULL,
      invoice_date   DATE NOT NULL,
      due_date       DATE,
      amount         NUMERIC(14,2) NOT NULL,
      tax_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_amount   NUMERIC(14,2) NOT NULL,
      currency       TEXT NOT NULL DEFAULT 'SAR',
      category       TEXT NOT NULL DEFAULT 'other',
      description    TEXT,
      status         TEXT NOT NULL DEFAULT 'pending',
      payment_date   DATE,
      payment_ref    TEXT,
      file_url       TEXT,
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS finance_budgets (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title          TEXT NOT NULL,
      period_type    TEXT NOT NULL DEFAULT 'annual',
      year           INT NOT NULL,
      quarter        INT,
      month          INT,
      status         TEXT NOT NULL DEFAULT 'draft',
      total_sar      NUMERIC(16,2) NOT NULL DEFAULT 0,
      approved_by    TEXT,
      approved_at    TIMESTAMPTZ,
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS finance_budget_lines (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      budget_id      UUID NOT NULL REFERENCES finance_budgets(id) ON DELETE CASCADE,
      department     TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'other',
      amount_sar     NUMERIC(14,2) NOT NULL DEFAULT 0,
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS finance_expense_claims (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id    UUID,
      employee_name  TEXT NOT NULL,
      claim_date     DATE NOT NULL DEFAULT CURRENT_DATE,
      category       TEXT NOT NULL DEFAULT 'other',
      amount         NUMERIC(14,2) NOT NULL,
      currency       TEXT NOT NULL DEFAULT 'SAR',
      description    TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      reviewed_by    TEXT,
      reviewed_at    TIMESTAMPTZ,
      payment_date   DATE,
      file_url       TEXT,
      admin_notes    TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Backfill unique constraint on existing databases (idempotent)
  await pool.query(`
    ALTER TABLE finance_vendors
      ADD CONSTRAINT IF NOT EXISTS uq_finance_vendors_name UNIQUE (name)
  `).catch(() => {});

  // Seed default vendors
  const defaults = [
    { name: 'Stripe',       type: 'payment_gateway',     country: 'US',  currency: 'USD' },
    { name: 'Hotelbeds',    type: 'hotel_supplier',       country: 'ES',  currency: 'EUR' },
    { name: 'Amadeus GDS',  type: 'airline_gds',          country: 'FR',  currency: 'EUR' },
    { name: 'AWS',          type: 'infrastructure',       country: 'US',  currency: 'USD' },
    { name: 'Anthropic',    type: 'saas',                 country: 'US',  currency: 'USD' },
  ];
  for (const v of defaults) {
    await pool.query(
      `INSERT INTO finance_vendors (name, vendor_type, country, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [v.name, v.type, v.country, v.currency]
    ).catch(() => {});
  }

  console.log('[finance] bootstrap complete');
}
bootstrap().catch(err => console.error('[finance] bootstrap error:', err.message));

// ── SAR conversion rates (mid-market) ────────────────────────────────────────
const TO_SAR = {
  SAR: 1, AED: 1.02, USD: 3.75, EUR: 4.10, GBP: 4.80,
  KWD: 12.20, BHD: 9.95, OMR: 9.74, QAR: 1.03, EGP: 0.076,
};

// Build a Postgres CASE expression for SAR conversion
function sarCase(col, currencyCol) {
  const arms = Object.entries(TO_SAR)
    .map(([c, r]) => `WHEN ${currencyCol} = '${c}' THEN ${col} * ${r}`)
    .join(' ');
  return `CASE ${arms} ELSE ${col} END`;
}

// ── GET /summary ──────────────────────────────────────────────────────────────
router.get('/summary', async (_req, res) => {
  try {
    const sarExprB = sarCase('b.total_price', 'b.currency');
    const sarExprP = sarCase('p.amount', 'p.currency');

    const [kpiRes, productRes, currencyRes, refundRes, reconBRes, reconPRes] = await Promise.all([

      // KPI: revenue buckets (confirmed bookings only)
      pool.query(`
        SELECT
          COALESCE(SUM(${sarExprB}) FILTER (WHERE b.created_at >= CURRENT_DATE),                              0) AS today_sar,
          COALESCE(SUM(${sarExprB}) FILTER (WHERE b.created_at >= date_trunc('week',  NOW())),                0) AS week_sar,
          COALESCE(SUM(${sarExprB}) FILTER (WHERE b.created_at >= date_trunc('month', NOW())),                0) AS month_sar,
          COALESCE(SUM(${sarExprB}) FILTER (WHERE b.created_at >= date_trunc('year',  NOW())),                0) AS ytd_sar,
          COUNT(*)                                                                                              AS total_confirmed,
          COUNT(*) FILTER (WHERE b.created_at >= CURRENT_DATE)                                                 AS today_count,
          COUNT(*) FILTER (WHERE b.created_at >= date_trunc('month', NOW()))                                   AS month_count
        FROM bookings b
        WHERE b.status = 'confirmed'
      `),

      // By product type (confirmed, month)
      pool.query(`
        SELECT b.product_type,
               COUNT(*)                       AS count,
               COALESCE(SUM(${sarExprB}), 0)  AS revenue_sar
        FROM bookings b
        WHERE b.status = 'confirmed'
          AND b.created_at >= date_trunc('month', NOW())
        GROUP BY b.product_type
      `),

      // By currency (confirmed, month)
      pool.query(`
        SELECT b.currency,
               COUNT(*)                  AS count,
               COALESCE(SUM(b.total_price), 0) AS revenue
        FROM bookings b
        WHERE b.status = 'confirmed'
          AND b.created_at >= date_trunc('month', NOW())
        GROUP BY b.currency
        ORDER BY revenue DESC
      `),

      // Refunds this month
      pool.query(`
        SELECT
          COUNT(*)                       AS count,
          COALESCE(SUM(${sarExprP}), 0)  AS total_sar
        FROM payments p
        WHERE p.status = 'refunded'
          AND p.updated_at >= date_trunc('month', NOW())
      `),

      // Reconciliation: confirmed bookings SAR total (all time)
      pool.query(`
        SELECT COALESCE(SUM(${sarExprB}), 0) AS total_sar
        FROM bookings b WHERE b.status = 'confirmed'
      `),

      // Reconciliation: paid payments SAR total (all time)
      pool.query(`
        SELECT COALESCE(SUM(${sarExprP}), 0) AS total_sar
        FROM payments p WHERE p.status = 'paid'
      `),
    ]);

    const kpi = kpiRes.rows[0];

    // Build product map
    const byProduct = { hotel: 0, flight: 0, car: 0 };
    for (const r of productRes.rows) {
      byProduct[r.product_type] = Math.round(parseFloat(r.revenue_sar));
    }

    // Build currency map
    const byCurrency = {};
    for (const r of currencyRes.rows) {
      byCurrency[r.currency] = { count: parseInt(r.count), revenue: parseFloat(r.revenue) };
    }

    // Reconciliation
    const bookSAR = parseFloat(reconBRes.rows[0].total_sar);
    const paySAR  = parseFloat(reconPRes.rows[0].total_sar);
    const discPct = bookSAR > 0 ? Math.abs((bookSAR - paySAR) / bookSAR) * 100 : 0;

    return res.json({
      data: {
        today_sar:          Math.round(parseFloat(kpi.today_sar)),
        week_sar:           Math.round(parseFloat(kpi.week_sar)),
        month_sar:          Math.round(parseFloat(kpi.month_sar)),
        ytd_sar:            Math.round(parseFloat(kpi.ytd_sar)),
        total_confirmed:    parseInt(kpi.total_confirmed),
        today_count:        parseInt(kpi.today_count),
        month_count:        parseInt(kpi.month_count),
        by_product:         byProduct,
        by_currency:        byCurrency,
        refunds_month_count: parseInt(refundRes.rows[0].count),
        refunds_month_sar:   Math.round(parseFloat(refundRes.rows[0].total_sar)),
        reconciliation: {
          bookings_sar:    Math.round(bookSAR),
          payments_sar:    Math.round(paySAR),
          discrepancy_pct: Math.round(discPct * 10) / 10,
          status:          discPct < 1 ? 'ok' : discPct < 5 ? 'warning' : 'alert',
        },
      },
    });
  } catch (err) {
    console.error('[finance/summary]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /daily ────────────────────────────────────────────────────────────────
router.get('/daily', async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days ?? '30', 10), 7), 90);
  const sarExpr = sarCase('b.total_price', 'b.currency');

  try {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('day', b.created_at)  AS day,
        COUNT(*)                          AS booking_count,
        COALESCE(SUM(${sarExpr}), 0)      AS revenue_sar
      FROM bookings b
      WHERE b.status = 'confirmed'
        AND b.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', b.created_at)
      ORDER BY day ASC
    `);

    return res.json({
      data: rows.map(r => ({
        day:           r.day.toISOString().slice(0, 10),
        booking_count: parseInt(r.booking_count),
        revenue_sar:   Math.round(parseFloat(r.revenue_sar)),
      })),
      days,
    });
  } catch (err) {
    console.error('[finance/daily]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /refunds ──────────────────────────────────────────────────────────────
router.get('/refunds', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT p.id, p.booking_id, p.amount, p.currency, p.gateway_ref,
               p.refund_amount, p.updated_at AS refunded_at,
               b.reference_no, b.product_type,
               u.email AS user_email, u.name AS user_name
        FROM payments p
        LEFT JOIN bookings b ON b.id = p.booking_id
        LEFT JOIN users    u ON u.id = b.user_id
        WHERE p.status = 'refunded'
        ORDER BY p.updated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query(`SELECT COUNT(*) FROM payments WHERE status = 'refunded'`),
    ]);

    return res.json({
      data:  dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('[finance/refunds]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /reconciliation ───────────────────────────────────────────────────────
router.get('/reconciliation', async (_req, res) => {
  const sarExprB = sarCase('b.total_price', 'b.currency');
  const sarExprP = sarCase('p.amount', 'p.currency');

  try {
    const [bookRes, payRes, unmatchedRes] = await Promise.all([
      // Confirmed bookings with no paid payment
      pool.query(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(${sarExprB}), 0) AS total_sar
        FROM bookings b
        WHERE b.status = 'confirmed'
          AND NOT EXISTS (
            SELECT 1 FROM payments p
            WHERE p.booking_id = b.id AND p.status = 'paid'
          )
      `),
      // Paid payments with no confirmed booking
      pool.query(`
        SELECT COUNT(*) AS count,
               COALESCE(SUM(${sarExprP}), 0) AS total_sar
        FROM payments p
        WHERE p.status = 'paid'
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = p.booking_id AND b.status = 'confirmed'
          )
      `),
      // Recent unmatched bookings (sample for investigation)
      pool.query(`
        SELECT b.id, b.reference_no, b.product_type, b.total_price, b.currency, b.created_at,
               u.email AS user_email
        FROM bookings b
        LEFT JOIN users u ON u.id = b.user_id
        WHERE b.status = 'confirmed'
          AND NOT EXISTS (
            SELECT 1 FROM payments p
            WHERE p.booking_id = b.id AND p.status = 'paid'
          )
        ORDER BY b.created_at DESC
        LIMIT 10
      `),
    ]);

    return res.json({
      data: {
        confirmed_no_payment: {
          count:     parseInt(bookRes.rows[0].count),
          total_sar: Math.round(parseFloat(bookRes.rows[0].total_sar)),
          sample:    unmatchedRes.rows,
        },
        paid_no_confirmed: {
          count:     parseInt(payRes.rows[0].count),
          total_sar: Math.round(parseFloat(payRes.rows[0].total_sar)),
        },
        status: parseInt(bookRes.rows[0].count) === 0 && parseInt(payRes.rows[0].count) === 0
          ? 'clean' : 'discrepancies_found',
      },
    });
  } catch (err) {
    console.error('[finance/reconciliation]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Operational Finance — v2.3.0
// ═════════════════════════════════════════════════════════════════════════════

// ── GET /vendors ──────────────────────────────────────────────────────────────
router.get('/vendors', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status) { conditions.push(`status = $${i++}`);       vals.push(req.query.status); }
  if (req.query.type)   { conditions.push(`vendor_type = $${i++}`);  vals.push(req.query.type); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, name, vendor_type, country, currency, tax_id, payment_terms,
                bank_name, iban, swift_bic, contact_email, status, notes, created_at, updated_at
           FROM finance_vendors ${where}
           ORDER BY name ASC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM finance_vendors ${where}`, vals),
    ]);
    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[finance/vendors GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /vendors ─────────────────────────────────────────────────────────────
router.post('/vendors', async (req, res) => {
  const { name, vendor_type, country, currency, tax_id, payment_terms,
          bank_name, iban, swift_bic, contact_email, notes } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'NAME_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO finance_vendors
         (name, vendor_type, country, currency, tax_id, payment_terms,
          bank_name, iban, swift_bic, contact_email, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [name.trim(), vendor_type||'other', country||null, currency||'SAR',
       tax_id||null, payment_terms||null, bank_name||null, iban||null,
       swift_bic||null, contact_email||null, notes||null]
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/vendors POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /vendors/:id ────────────────────────────────────────────────────────
router.patch('/vendors/:id', async (req, res) => {
  const ALLOWED = ['name','vendor_type','country','currency','tax_id','payment_terms',
                   'bank_name','iban','swift_bic','contact_email','status','notes'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] || null); }
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`); vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE finance_vendors SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/vendors PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /vendors/:id ───────────────────────────────────────────────────────
router.delete('/vendors/:id', async (req, res) => {
  try {
    // Check for invoices referencing this vendor
    const { rows: inv } = await pool.query(
      `SELECT id FROM finance_invoices WHERE vendor_id = $1 LIMIT 1`, [req.params.id]
    );
    if (inv.length) {
      // Soft-deactivate if invoices exist
      const { rows } = await pool.query(
        `UPDATE finance_vendors SET status = 'inactive', updated_at = NOW()
           WHERE id = $1 RETURNING id, name, status`, [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
      return res.json({ data: rows[0], message: 'Vendor deactivated (has invoices)' });
    }
    const { rowCount } = await pool.query(`DELETE FROM finance_vendors WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[finance/vendors DELETE]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /invoices ─────────────────────────────────────────────────────────────
router.get('/invoices', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)    { conditions.push(`status = $${i++}`);      vals.push(req.query.status); }
  if (req.query.vendor_id) { conditions.push(`vendor_id = $${i++}`);   vals.push(req.query.vendor_id); }
  if (req.query.category)  { conditions.push(`category = $${i++}`);    vals.push(req.query.category); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, invoice_no, vendor_id, vendor_name, invoice_date, due_date,
                amount, tax_amount, total_amount, currency, category, description,
                status, payment_date, payment_ref, file_url, notes, created_at, updated_at
           FROM finance_invoices ${where}
           ORDER BY
             CASE WHEN (due_date < NOW()::date AND status NOT IN ('paid','cancelled')) THEN 0 ELSE 1 END,
             due_date ASC NULLS LAST,
             invoice_date DESC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM finance_invoices ${where}`, vals),
    ]);
    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[finance/invoices GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /invoices ────────────────────────────────────────────────────────────
router.post('/invoices', async (req, res) => {
  const { invoice_no, vendor_id, vendor_name, invoice_date, due_date,
          amount, tax_amount, total_amount, currency, category,
          description, file_url, notes } = req.body ?? {};

  if (!invoice_no?.trim()) return res.status(400).json({ error: 'INVOICE_NO_REQUIRED' });
  if (!vendor_name?.trim()) return res.status(400).json({ error: 'VENDOR_NAME_REQUIRED' });
  if (!invoice_date) return res.status(400).json({ error: 'INVOICE_DATE_REQUIRED' });
  if (amount == null || total_amount == null) return res.status(400).json({ error: 'AMOUNT_REQUIRED' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO finance_invoices
         (invoice_no, vendor_id, vendor_name, invoice_date, due_date,
          amount, tax_amount, total_amount, currency, category,
          description, file_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [invoice_no.trim(), vendor_id||null, vendor_name.trim(), invoice_date, due_date||null,
       parseFloat(amount), parseFloat(tax_amount||0), parseFloat(total_amount),
       currency||'SAR', category||'other', description||null, file_url||null, notes||null]
    );
    const invoice = rows[0];

    // ── Launch P2P invoice approval workflow ───────────────────────────────────
    wf.launch({
      triggerEvent:   'invoice_received',
      triggerRef:     invoice.id,
      triggerRefType: 'invoice',
      initiatedBy:    req.user?.email ?? 'system',
      context: {
        invoice_id:   invoice.id,
        invoice_no:   invoice_no.trim(),
        vendor_name:  vendor_name.trim(),
        total_amount: parseFloat(total_amount),
        currency:     currency || 'SAR',
        due_date:     due_date ?? null,
        category:     category ?? 'other',
      },
    });

    return res.status(201).json({ data: invoice });
  } catch (err) {
    console.error('[finance/invoices POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /invoices/:id ───────────────────────────────────────────────────────
router.patch('/invoices/:id', async (req, res) => {
  const ALLOWED = ['invoice_no','vendor_id','vendor_name','invoice_date','due_date','amount',
                   'tax_amount','total_amount','currency','category','description',
                   'status','payment_date','payment_ref','file_url','notes'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  // Auto-set payment_date when marking paid
  if (req.body.status === 'paid' && req.body.payment_date === undefined) {
    sets.push(`payment_date = NOW()::date`);
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`); vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE finance_invoices SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/invoices PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /budgets ──────────────────────────────────────────────────────────────
router.get('/budgets', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.year)   { conditions.push(`year = $${i++}`);   vals.push(parseInt(req.query.year)); }
  if (req.query.status) { conditions.push(`status = $${i++}`); vals.push(req.query.status); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT b.id, b.title, b.period_type, b.year, b.quarter, b.month, b.status,
                COALESCE((SELECT SUM(amount_sar) FROM finance_budget_lines WHERE budget_id = b.id), 0) AS total_sar,
                b.approved_by, b.approved_at, b.notes, b.created_at, b.updated_at
           FROM finance_budgets b ${where}
           ORDER BY b.year DESC, b.quarter DESC NULLS LAST, b.created_at DESC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM finance_budgets ${where}`, vals),
    ]);
    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[finance/budgets GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /budgets ─────────────────────────────────────────────────────────────
router.post('/budgets', async (req, res) => {
  const { title, period_type, year, quarter, month, notes, department, requested_by, amount_sar } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: 'TITLE_REQUIRED' });
  if (!year) return res.status(400).json({ error: 'YEAR_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO finance_budgets (title, period_type, year, quarter, month, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [title.trim(), period_type||'annual', parseInt(year), quarter||null, month||null, notes||null]
    );
    const budget = rows[0];

    // ── Launch budget approval workflow ────────────────────────────────────────
    wf.launch({
      triggerEvent:   'budget_requested',
      triggerRef:     budget.id,
      triggerRefType: 'budget',
      initiatedBy:    req.user?.email ?? requested_by ?? 'system',
      context: {
        budget_id:   budget.id,
        title:       budget.title,
        period_type: budget.period_type,
        year:        budget.year,
        department:  department ?? null,
        amount_sar:  amount_sar ?? null,
        requested_by: req.user?.email ?? requested_by ?? null,
      },
    });

    return res.status(201).json({ data: budget });
  } catch (err) {
    console.error('[finance/budgets POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /budgets/:id ────────────────────────────────────────────────────────
router.patch('/budgets/:id', async (req, res) => {
  const ALLOWED = ['title','period_type','year','quarter','month','status','notes','approved_by'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (req.body.status === 'approved' && req.body.approved_at === undefined) {
    sets.push(`approved_at = NOW()`);
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`); vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE finance_budgets SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/budgets PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /budgets/:id/lines ────────────────────────────────────────────────────
router.get('/budgets/:id/lines', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, budget_id, department, category, amount_sar, notes, created_at, updated_at
         FROM finance_budget_lines WHERE budget_id = $1 ORDER BY department, category`,
      [req.params.id]
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('[finance/budgets/:id/lines GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /budgets/:id/lines ───────────────────────────────────────────────────
router.post('/budgets/:id/lines', async (req, res) => {
  const { department, category, amount_sar, notes } = req.body ?? {};
  if (!department?.trim()) return res.status(400).json({ error: 'DEPARTMENT_REQUIRED' });
  if (amount_sar == null) return res.status(400).json({ error: 'AMOUNT_SAR_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO finance_budget_lines (budget_id, department, category, amount_sar, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, department.trim(), category||'other', parseFloat(amount_sar), notes||null]
    );
    // Recalculate budget total_sar
    await pool.query(
      `UPDATE finance_budgets SET total_sar = (SELECT COALESCE(SUM(amount_sar),0) FROM finance_budget_lines WHERE budget_id = $1), updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/budgets/:id/lines POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /budget-lines/:id ───────────────────────────────────────────────────
router.patch('/budget-lines/:id', async (req, res) => {
  const ALLOWED = ['department','category','amount_sar','notes'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`); vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE finance_budget_lines SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    // Recalculate budget total_sar
    await pool.query(
      `UPDATE finance_budgets SET total_sar = (SELECT COALESCE(SUM(amount_sar),0) FROM finance_budget_lines WHERE budget_id = $1), updated_at = NOW() WHERE id = $1`,
      [rows[0].budget_id]
    );
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/budget-lines PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── DELETE /budget-lines/:id ──────────────────────────────────────────────────
router.delete('/budget-lines/:id', async (req, res) => {
  try {
    // Get budget_id before deleting
    const { rows: line } = await pool.query(
      `DELETE FROM finance_budget_lines WHERE id = $1 RETURNING budget_id`, [req.params.id]
    );
    if (!line.length) return res.status(404).json({ error: 'NOT_FOUND' });
    // Recalculate budget total_sar
    await pool.query(
      `UPDATE finance_budgets SET total_sar = (SELECT COALESCE(SUM(amount_sar),0) FROM finance_budget_lines WHERE budget_id = $1), updated_at = NOW() WHERE id = $1`,
      [line[0].budget_id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[finance/budget-lines DELETE]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── GET /expense-claims ───────────────────────────────────────────────────────
router.get('/expense-claims', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];
  let i = 1;

  if (req.query.status)      { conditions.push(`status = $${i++}`);       vals.push(req.query.status); }
  if (req.query.employee_id) { conditions.push(`employee_id = $${i++}`);  vals.push(req.query.employee_id); }
  if (req.query.category)    { conditions.push(`category = $${i++}`);     vals.push(req.query.category); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(
        `SELECT id, employee_id, employee_name, claim_date, category, amount, currency,
                description, status, reviewed_by, reviewed_at, payment_date,
                file_url, admin_notes, created_at, updated_at
           FROM finance_expense_claims ${where}
           ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, claim_date DESC
           LIMIT $${i} OFFSET $${i + 1}`,
        [...vals, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM finance_expense_claims ${where}`, vals),
    ]);
    return res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error('[finance/expense-claims GET]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── POST /expense-claims ──────────────────────────────────────────────────────
router.post('/expense-claims', async (req, res) => {
  const { employee_id, employee_name, claim_date, category, amount, currency, description, file_url } = req.body ?? {};
  if (!employee_name?.trim()) return res.status(400).json({ error: 'EMPLOYEE_NAME_REQUIRED' });
  if (amount == null) return res.status(400).json({ error: 'AMOUNT_REQUIRED' });
  if (!description?.trim()) return res.status(400).json({ error: 'DESCRIPTION_REQUIRED' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO finance_expense_claims
         (employee_id, employee_name, claim_date, category, amount, currency, description, file_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [employee_id||null, employee_name.trim(), claim_date||null,
       category||'other', parseFloat(amount), currency||'SAR', description.trim(), file_url||null]
    );
    const claim = rows[0];

    // ── Trigger workflow engine (fire-and-forget) ─────────────────────────────
    wf.launch({
      triggerEvent:   'expense_submitted',
      triggerRef:     claim.id,
      triggerRefType: 'expense_claim',
      initiatedBy:    req.user?.email ?? employee_name.trim(),
      context: {
        amount:       parseFloat(amount),
        currency:     currency || 'SAR',
        category:     category || 'other',
        description:  description.trim(),
        employee:     employee_name.trim(),
        claim_date:   claim_date || null,
      },
    });

    return res.status(201).json({ data: claim });
  } catch (err) {
    console.error('[finance/expense-claims POST]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ── PATCH /expense-claims/:id ─────────────────────────────────────────────────
router.patch('/expense-claims/:id', async (req, res) => {
  const ALLOWED = ['status','reviewed_by','admin_notes','payment_date','file_url'];
  const sets = []; const vals = []; let i = 1;
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(req.body[k] ?? null); }
  }
  if ((req.body.status === 'approved' || req.body.status === 'rejected') && req.body.reviewed_at === undefined) {
    sets.push(`reviewed_at = NOW()`);
  }
  if (!sets.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE' });
  sets.push(`updated_at = NOW()`); vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE finance_expense_claims SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: rows[0] });
  } catch (err) {
    console.error('[finance/expense-claims PATCH]', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
