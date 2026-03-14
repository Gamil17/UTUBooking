const { pool } = require('./pg');

// ─── Create ───────────────────────────────────────────────────────────────────

async function createPayment({ bookingId, amount, currency = 'SAR', method }) {
  const { rows } = await pool.query(
    `INSERT INTO payments (booking_id, amount, currency, method, status)
          VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [bookingId, amount, currency, method]
  );
  return rows[0];
}

// ─── Update — dynamic SET builder ────────────────────────────────────────────

async function updatePayment(id, fields) {
  const allowed = ['status', 'gateway_ref', 'gateway_payload', 'paid_at', 'refunded_at', 'refund_amount'];
  const sets = ['updated_at = NOW()'];
  const vals = [id];
  let idx = 2;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(key === 'gateway_payload' ? JSON.stringify(fields[key]) : fields[key]);
    }
  }

  const { rows } = await pool.query(
    `UPDATE payments SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    vals
  );
  return rows[0];
}

// ─── Read ─────────────────────────────────────────────────────────────────────

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByBookingId(bookingId) {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
    [bookingId]
  );
  return rows;
}

async function findByGatewayRef(gatewayRef) {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE gateway_ref = $1 LIMIT 1`,
    [gatewayRef]
  );
  return rows[0] || null;
}

module.exports = { createPayment, updatePayment, findById, findByBookingId, findByGatewayRef };
