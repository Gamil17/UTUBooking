'use strict';

/**
 * GDPR User Rights Router — auth service
 * Mounted at: /api/user/gdpr (via app.js)
 *
 * Art. 15 — Right of access         GET  /export
 * Art. 17 — Right to erasure        POST /erase
 * Art. 20 — Right to portability    POST /portability
 * Art. 7(1) — Consent history       GET  /consents
 *
 * Auth: authMiddleware (JWT) required on all routes.
 * Rate limit: 5 requests / 15 min per user (GDPR requests are low-frequency by nature).
 */

const { Router }         = require('express');
const { getShardPool }   = require('../../../../shared/shard-router');
const redis              = require('../services/redis.service');

// ── Rate limiter — prevent abuse of data export endpoints ──────────────────────
// Simple in-memory store (single process). In prod, back with Redis.
const rateLimitStore = new Map();  // userId → { count, resetAt }

function gdprRateLimit(req, res, next) {
  const userId  = req.user.id;
  const now     = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 min
  const maxReqs  = 5;

  const entry = rateLimitStore.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (entry.count >= maxReqs) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error:   'RATE_LIMITED',
      message: `Too many GDPR requests. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    });
  }

  entry.count++;
  next();
}

// ── Helper: get write pool for this user's shard ───────────────────────────────
function userPool(req) {
  return getShardPool(req.user.countryCode).pool;
}

// ── Helper: record erasure request to Redis queue for DPO review ───────────────
async function enqueueErasure(userId, email, reason, ip, userAgent) {
  const record = JSON.stringify({
    userId,
    email,
    reason:      reason?.trim() ?? '',
    law:         'GDPR',
    ip,
    userAgent:   userAgent ?? '',
    requestedAt: new Date().toISOString(),
    status:      'pending',
  });
  await redis.rpush('gdpr:erasure:queue', record);
  return record;
}

// ── Router ─────────────────────────────────────────────────────────────────────
const router = Router();

// ────────────────────────────────────────────────────────────────────────────────
// POST /api/user/gdpr/erase — Art. 17 Right to Erasure
// Anonymises PII immediately. Full cascade across all shards within 30 days.
// ────────────────────────────────────────────────────────────────────────────────
router.post('/erase', gdprRateLimit, async (req, res, next) => {
  const { id: userId, email } = req.user;
  const { reason } = req.body;
  const ip        = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const userAgent = req.headers['user-agent'] ?? '';

  try {
    // 1. Queue for DPO review (permanent audit log)
    await enqueueErasure(userId, email, reason, ip, userAgent);

    const pool   = userPool(req);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Soft-delete: anonymise PII in place (row kept for FK integrity + 7-yr tax law)
      await client.query(
        `UPDATE users
         SET email       = $2,
             name_en     = 'Deleted User',
             name_ar     = NULL,
             phone       = NULL,
             deleted_at  = NOW(),
             updated_at  = NOW()
         WHERE id = $1 AND deleted_at IS NULL`,
        [userId, `deleted-${userId}@erased.invalid`],
      );

      // 3. Revoke all refresh tokens immediately (Art. 17 requires access to stop)
      await client.query(
        `DELETE FROM refresh_tokens WHERE user_id = $1`,
        [userId],
      );

      // 4. Cancel pending bookings (completed ones stay for tax records)
      await client.query(
        `UPDATE bookings
         SET status = 'cancelled_gdpr', updated_at = NOW()
         WHERE user_id = $1
           AND status NOT IN ('completed', 'cancelled', 'cancelled_gdpr')`,
        [userId],
      );

      // 5. Log in erasure_requests table for DPO workflow tracking
      await client.query(
        `INSERT INTO erasure_requests
           (user_id, email_snapshot, status, law, reason, ip_address, user_agent)
         VALUES ($1, $2, 'pending', 'GDPR', $3, $4::inet, $5)`,
        [userId, email, reason?.trim() ?? null, ip, userAgent],
      );

      // 6. Anonymise email_log — GDPR Art. 17 (email_log is append-only; never delete rows)
      await client.query(
        `UPDATE email_log
         SET user_id         = NULL,
             recipient_email = 'erased@deleted.invalid'
         WHERE user_id = $1`,
        [userId],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 6. Revoke Redis refresh tokens for this user (belt + braces)
    // Pattern: refresh:{userId}:* — scan and delete
    try {
      const keys = await redis.keys(`refresh:${userId}:*`);
      if (keys.length) await redis.del(...keys);
    } catch {
      // Non-fatal — tokens will expire naturally (15-min access window max)
    }

    res.json({
      ok:          true,
      referenceId: `GDPR-ERASE-${userId.slice(0, 8)}-${Date.now()}`,
      message:     'Your personal data has been anonymised. Booking history (anonymised) retained 7 years for tax compliance. Full deletion completes within 30 days per GDPR Art. 17.',
    });
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /api/user/gdpr/export — Art. 15 Right of Access
// Returns all data held about the user as a JSON object.
// ────────────────────────────────────────────────────────────────────────────────
router.get('/export', gdprRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { pool, readPool } = getShardPool(req.user.countryCode);

  try {
    const [profile, bookings, consents, payments] = await Promise.all([
      readPool.query(
        `SELECT id, email, name_en, name_ar, phone, preferred_currency,
                preferred_lang, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId],
      ),
      readPool.query(
        `SELECT id, hotel_id, check_in, check_out, guests,
                total_amount, currency, status, created_at
         FROM bookings WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      ),
      readPool.query(
        `SELECT consent_type, granted, timestamp, ip_address, consent_version, law
         FROM consent_logs WHERE user_id = $1 ORDER BY timestamp DESC`,
        [userId],
      ),
      readPool.query(
        `SELECT id, gateway, amount, currency, status, created_at
         FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      ),
    ]);

    // Log that an export was requested
    await pool.query(
      `INSERT INTO data_exports (user_id, export_type, format, ip_address, law, generated_at)
       VALUES ($1, 'access', 'json', $2::inet, 'GDPR', NOW())`,
      [userId, req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown'],
    );

    res.json({
      exportedAt:  new Date().toISOString(),
      law:         'GDPR',
      article:     'Art. 15 — Right of access',
      controller:  process.env.EU_DATA_CONTROLLER ?? 'UTUBooking Ltd',
      dpo:         process.env.DPO_EMAIL ?? 'dpo@utubooking.com',
      data: {
        profile:   profile.rows[0] ?? null,
        bookings:  bookings.rows,
        consents:  consents.rows,
        payments:  payments.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// POST /api/user/gdpr/portability — Art. 20 Right to Data Portability
// Returns structured JSON-LD (schema.org) as a downloadable file.
// ────────────────────────────────────────────────────────────────────────────────
router.post('/portability', gdprRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { pool, readPool } = getShardPool(req.user.countryCode);

  try {
    const [profile, bookings] = await Promise.all([
      readPool.query(
        `SELECT id, email, name_en, phone, preferred_currency, preferred_lang, created_at
         FROM users WHERE id = $1`,
        [userId],
      ),
      readPool.query(
        `SELECT b.id, b.check_in, b.check_out, b.guests,
                b.total_amount, b.currency, b.status, b.created_at,
                h.name AS hotel_name, h.city, h.country
         FROM bookings b
         LEFT JOIN hotels h ON h.id = b.hotel_id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [userId],
      ),
    ]);

    const p = profile.rows[0];

    // JSON-LD schema.org format — machine-readable, interoperable (Art. 20(1))
    const portableData = {
      '@context':   'https://schema.org',
      '@type':      'Person',
      exportedAt:   new Date().toISOString(),
      law:          'GDPR Art. 20 — Right to data portability',
      format:       'application/ld+json',
      identifier:   p?.id,
      email:        p?.email,
      name:         p?.name_en,
      telephone:    p?.phone,
      reservations: bookings.rows.map(b => ({
        '@type':               'LodgingReservation',
        reservationId:         b.id,
        reservationStatus:     b.status,
        checkinTime:           b.check_in,
        checkoutTime:          b.check_out,
        numAdults:             b.guests,
        lodgingUnitDescription: b.hotel_name,
        priceCurrency:         b.currency,
        totalPrice:            b.total_amount,
      })),
    };

    // Log export request
    await pool.query(
      `INSERT INTO data_exports (user_id, export_type, format, ip_address, law, generated_at)
       VALUES ($1, 'portability', 'json-ld', $2::inet, 'GDPR', NOW())`,
      [userId, req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown'],
    );

    res.setHeader('Content-Disposition', `attachment; filename="utu-data-${userId.slice(0, 8)}.json"`);
    res.setHeader('Content-Type', 'application/ld+json');
    res.json(portableData);
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /api/user/gdpr/consents — Art. 7(1) Consent history + current state
// ────────────────────────────────────────────────────────────────────────────────
router.get('/consents', async (req, res, next) => {
  const { id: userId } = req.user;
  const { readPool } = getShardPool(req.user.countryCode);

  try {
    const [history, latest] = await Promise.all([
      // Full chronological audit log
      readPool.query(
        `SELECT consent_type, granted, timestamp, ip_address, consent_version, law
         FROM consent_logs WHERE user_id = $1 ORDER BY timestamp DESC`,
        [userId],
      ),
      // Current state: most recent decision per consent_type
      readPool.query(
        `SELECT DISTINCT ON (consent_type)
           consent_type, granted, timestamp, law
         FROM consent_logs
         WHERE user_id = $1
         ORDER BY consent_type, timestamp DESC`,
        [userId],
      ),
    ]);

    const currentChoices = {};
    for (const row of latest.rows) {
      currentChoices[row.consent_type] = row.granted;
    }

    res.json({
      userId,
      law:            'GDPR',
      article:        'Art. 7(1) — Conditions for consent',
      currentChoices,
      history:        history.rows,
      rights: {
        withdraw:  'POST /api/user/gdpr/erase',
        export:    'GET  /api/user/gdpr/export',
        portable:  'POST /api/user/gdpr/portability',
        contact:   process.env.DPO_EMAIL ?? 'dpo@utubooking.com',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
