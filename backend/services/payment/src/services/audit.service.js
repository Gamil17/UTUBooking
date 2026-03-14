const { pool } = require('../db/pg');

/**
 * Structured transaction audit logger.
 *
 * Writes to:
 *   1. stdout as JSON — picked up by CloudWatch / Datadog / ELK
 *   2. payment_audit_logs table — queryable forensic trail
 *
 * Always fire-and-forget on the DB write — never block a payment response
 * waiting for an audit insert.
 *
 * @param {object} opts
 * @param {string|null} opts.paymentId   — internal payments.id (may be null on initiation failure)
 * @param {string|null} opts.bookingId   — bookings.id
 * @param {string}      opts.event       — e.g. 'initiate', 'webhook_received', 'status_updated'
 * @param {string}      opts.gateway     — 'stcpay' | 'moyasar' | 'stripe'
 * @param {number|null} opts.amount      — payment amount in SAR
 * @param {string}      opts.currency    — 'SAR' | 'AED' | 'USD'
 * @param {string|null} opts.status      — gateway/internal status at this point
 * @param {object}      opts.meta        — raw gateway payload or error details
 */
async function log({ paymentId, bookingId, event, gateway, amount, currency = 'SAR', status, meta }) {
  const entry = {
    ts:        new Date().toISOString(),
    paymentId: paymentId || null,
    bookingId: bookingId || null,
    event,
    gateway,
    amount:    amount || null,
    currency,
    status:    status || null,
  };

  // 1. Structured stdout log
  console.log(JSON.stringify({ level: 'AUDIT', ...entry }));

  // 2. DB write — fire-and-forget
  pool.query(
    `INSERT INTO payment_audit_logs
           (payment_id, booking_id, event, gateway, amount, currency, status, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.paymentId,
      entry.bookingId,
      event,
      gateway,
      entry.amount,
      currency,
      entry.status,
      JSON.stringify(meta || {}),
    ]
  ).catch((err) => console.error('[audit] DB write failed:', err.message));
}

module.exports = { log };
