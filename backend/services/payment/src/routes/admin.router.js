/**
 * Payment service — admin-only monitoring and action routes.
 *
 * All routes require the x-admin-secret header (timingSafeEqual against ADMIN_SECRET).
 *
 * GET  /              — paginated list or ?view=stats dashboard
 * GET  /:id/audit     — payment audit trail
 * POST /:id/refund    — initiate gateway refund + update payment + booking status
 *
 * Registered in app.js as:  app.use('/api/admin/payments', adminRouter)
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');
const repo                = require('../db/payment.repo');
const stripeGateway       = require('../gateways/stripe.gateway');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL ?? 'http://booking-service:3006';
const ADMIN_SECRET        = () => process.env.ADMIN_SECRET ?? '';

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAdminSecret(req, res, next) {
  const secret  = process.env.ADMIN_SECRET ?? '';
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !provided) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    if (timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) {
      return next();
    }
  } catch { /* length mismatch → not equal */ }
  return res.status(401).json({ error: 'UNAUTHORIZED' });
}

const router = Router();
router.use(requireAdminSecret);

// ─── GET / (with ?view=stats or paginated list) ───────────────────────────────

router.get('/', async (req, res) => {
  try {
    // Stats view
    if (req.query.view === 'stats') {
      const [totalsResult, gatewayResult] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*)                                                                      AS total,
            COUNT(*) FILTER (WHERE status = 'failed')                                    AS failed,
            COUNT(*) FILTER (WHERE status = 'pending')                                   AS pending,
            COUNT(*) FILTER (WHERE status = 'paid')                                      AS paid,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')            AS today_total,
            COUNT(*) FILTER (WHERE status = 'failed'
                             AND   created_at >= NOW() - INTERVAL '24 hours')            AS today_failed
          FROM payments
        `),
        pool.query(`
          SELECT method, COUNT(*) AS failures
          FROM   payments
          WHERE  status = 'failed'
          AND    created_at >= NOW() - INTERVAL '7 days'
          GROUP  BY method
          ORDER  BY failures DESC
          LIMIT  10
        `),
      ]);

      const t = totalsResult.rows[0];
      const paid  = parseInt(t.paid,  10) || 0;
      const total = parseInt(t.total, 10) || 0;

      return res.json({
        data: {
          total:            total,
          failed:           parseInt(t.failed,       10) || 0,
          pending:          parseInt(t.pending,      10) || 0,
          paid,
          today_total:      parseInt(t.today_total,  10) || 0,
          today_failed:     parseInt(t.today_failed, 10) || 0,
          success_rate_7d:  total > 0 ? Math.round((paid / total) * 100) : null,
          gateway_failures: gatewayResult.rows.map((r) => ({
            method:   r.method,
            failures: parseInt(r.failures, 10),
          })),
        },
      });
    }

    // ── Paginated list ────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (req.query.status) {
      conditions.push(`status = $${idx++}`);
      values.push(req.query.status);
    }
    if (req.query.gateway) {
      conditions.push(`method = $${idx++}`);
      values.push(req.query.gateway);
    }
    if (req.query.from) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(new Date(req.query.from).toISOString());
    }
    if (req.query.to) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(new Date(req.query.to).toISOString());
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, booking_id, amount, currency, method, status,
                gateway_ref, paid_at, created_at
         FROM   payments
         ${where}
         ORDER  BY created_at DESC
         LIMIT  $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS total FROM payments ${where}`, values),
    ]);

    return res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[admin/payments] GET / error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── POST /:paymentId/refund ──────────────────────────────────────────────────

/**
 * Initiates a refund for a paid payment.
 *
 * Body: { amount?: number, reason?: string }
 *   - amount: partial refund amount in currency units. Omit for full refund.
 *   - reason: 'requested_by_customer' | 'fraudulent' | 'duplicate' (default: requested_by_customer)
 *
 * Flow:
 *   1. Validate payment exists and is in 'paid' status
 *   2. Call gateway refund API (Stripe only for now; others recorded as manual)
 *   3. Mark payment as 'refunded' in DB
 *   4. Update booking status to 'refunded' via booking service HTTP call
 *   5. Return refund summary
 */
router.post('/:paymentId/refund', async (req, res) => {
  const { paymentId } = req.params;
  const { amount, reason = 'requested_by_customer' } = req.body ?? {};

  const VALID_REASONS = new Set(['requested_by_customer', 'fraudulent', 'duplicate']);
  if (!VALID_REASONS.has(reason)) {
    return res.status(400).json({
      error: 'INVALID_REASON',
      allowed: [...VALID_REASONS],
    });
  }

  // 1. Load payment
  const payment = await repo.findById(paymentId).catch(() => null);
  if (!payment) return res.status(404).json({ error: 'PAYMENT_NOT_FOUND' });
  if (payment.status !== 'paid') {
    return res.status(409).json({
      error: 'NOT_REFUNDABLE',
      message: `Payment is '${payment.status}', only 'paid' payments can be refunded.`,
    });
  }

  const refundAmount = amount != null ? parseFloat(amount) : parseFloat(payment.amount);

  // 2. Call gateway
  let refundRef = null;
  try {
    if (payment.method === 'stripe' && payment.gateway_ref) {
      const refund = await stripeGateway.createRefund(
        payment.gateway_ref,
        amount ?? null,
        payment.currency,
        reason,
      );
      refundRef = refund.id;
    }
    // All other gateways: mark as manual refund (ops processes externally via gateway dashboard)
  } catch (gatewayErr) {
    console.error('[admin/payments/refund] gateway error:', gatewayErr.message);
    return res.status(502).json({
      error:   'GATEWAY_REFUND_FAILED',
      message: gatewayErr.message,
    });
  }

  // 3. Update payment record
  try {
    await repo.markRefunded(paymentId, refundRef, refundAmount);
  } catch (dbErr) {
    console.error('[admin/payments/refund] DB update error:', dbErr.message);
    return res.status(500).json({ error: 'DB_UPDATE_FAILED' });
  }

  // 4. Update booking status → booking service (best-effort: don't fail the refund if booking update fails)
  if (payment.booking_id) {
    fetch(`${BOOKING_SERVICE_URL}/api/admin/bookings/${payment.booking_id}/status`, {
      method:  'PATCH',
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': ADMIN_SECRET(),
      },
      body: JSON.stringify({ status: 'refunded' }),
    }).catch((err) => console.error('[admin/payments/refund] booking update failed:', err.message));
  }

  return res.json({
    data: {
      payment_id:    paymentId,
      booking_id:    payment.booking_id,
      status:        'refunded',
      refund_amount: refundAmount,
      currency:      payment.currency,
      refund_ref:    refundRef,
      gateway:       payment.method,
      manual:        refundRef === null,
    },
  });
});

// ─── GET /:paymentId/audit ────────────────────────────────────────────────────

router.get('/:paymentId/audit', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, payment_id, booking_id, event, gateway, amount, currency,
              status, meta, created_at
       FROM   payment_audit_logs
       WHERE  payment_id = $1
       ORDER  BY created_at ASC`,
      [paymentId],
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('[admin/payments] GET /:id/audit error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
