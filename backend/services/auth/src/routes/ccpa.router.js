'use strict';

/**
 * CCPA User Rights Router — auth service
 * Mounted at: /api/user/ccpa (via app.js)
 *
 * POST /opt-out   — Cal. Civ. Code §1798.120 — opt out of data sale/sharing
 * GET  /rights    — Cal. Civ. Code §1798.110 — what data we hold
 * POST /delete    — Cal. Civ. Code §1798.105 — right to deletion
 *
 * Auth: authMiddleware (JWT) required on all routes.
 * Rate limit: 5 requests / 15 min per user.
 * Response window: opt-out within 15 business days; delete within 45 days.
 */

const { Router }       = require('express');
const { getShardPool } = require('../../../../shared/shard-router');
const redis            = require('../services/redis.service');

// ── Rate limiter (in-memory — mirrors gdpr.router.js pattern) ─────────────────
const rateLimitStore = new Map();  // userId → { count, resetAt }

function ccpaRateLimit(req, res, next) {
  const userId   = req.user.id;
  const now      = Date.now();
  const windowMs = 15 * 60 * 1000;
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
      message: `Too many CCPA requests. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    });
  }
  entry.count++;
  next();
}

// ── Helper: US shard pool ──────────────────────────────────────────────────────
function userPool(req) {
  // US users always route to the US shard
  return getShardPool(req.user.countryCode ?? 'US').pool;
}

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /opt-out — Cal. Civ. Code §1798.120
// Marks user as opted out of data sale / sharing.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/opt-out', ccpaRateLimit, async (req, res, next) => {
  const { id: userId, email } = req.user;
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const ua  = req.headers['user-agent'] ?? '';

  const pool   = userPool(req);
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO privacy_preferences
         (user_id, ccpa_opted_out, ccpa_opted_out_at, ip_address, user_agent, updated_at)
       VALUES ($1, TRUE, NOW(), $2::inet, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET ccpa_opted_out    = TRUE,
             ccpa_opted_out_at = NOW(),
             ip_address        = EXCLUDED.ip_address,
             user_agent        = EXCLUDED.user_agent,
             updated_at        = NOW()`,
      [userId, ip, ua],
    );
  } finally {
    client.release();
  }

  // Log to Redis queue for ops review + downstream suppression jobs
  await redis.rpush('ccpa:opt-out:queue', JSON.stringify({
    userId, email,
    law:         'CCPA',
    action:      'opt-out',
    ip,
    requestedAt: new Date().toISOString(),
  }));

  // Cache opt-out flag for fast look-ups by email / analytics services (24h TTL)
  await redis.set(`ccpa:opted_out:${userId}`, '1', 'EX', 86400);

  res.json({
    ok:          true,
    referenceId: `CCPA-OPT-OUT-${userId.slice(0, 8)}-${Date.now()}`,
    message:     'You have successfully opted out of the sale and sharing of your personal information. This takes effect within 15 business days (Cal. Civ. Code §1798.120).',
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /rights — Cal. Civ. Code §1798.110
// Returns categories of personal data UTUBooking holds.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/rights', ccpaRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { readPool }   = getShardPool(req.user.countryCode ?? 'US');

  try {
    const [profile, bookingCount, paymentCount, privacyPrefs] = await Promise.all([
      readPool.query(
        `SELECT email, name_en, phone, nationality, created_at FROM users WHERE id = $1`,
        [userId],
      ),
      readPool.query(`SELECT COUNT(*) AS count FROM bookings WHERE user_id = $1`, [userId]),
      readPool.query(`SELECT COUNT(*) AS count FROM payments WHERE user_id = $1`, [userId]),
      readPool.query(
        `SELECT ccpa_opted_out, ccpa_opted_out_at FROM privacy_preferences WHERE user_id = $1`,
        [userId],
      ),
    ]);

    const prefs = privacyPrefs.rows[0];

    res.json({
      law:                 'CCPA — Cal. Civ. Code §1798.110',
      userId,
      currentOptOutStatus: prefs?.ccpa_opted_out ?? false,
      optedOutAt:          prefs?.ccpa_opted_out_at ?? null,
      dataCategories: [
        { category: 'Identifiers',             examples: 'Name, email, phone, IP',            retained: !!profile.rows[0] },
        { category: 'Commercial information',  examples: 'Bookings, payments',                retained: true,
          recordCount: { bookings: Number(bookingCount.rows[0]?.count ?? 0), payments: Number(paymentCount.rows[0]?.count ?? 0) } },
        { category: 'Geolocation data',        examples: 'Country/state from IP',             retained: true },
        { category: 'Sensitive PI',            examples: 'Nationality (Hajj/Umrah visa)',     retained: !!profile.rows[0]?.nationality },
        { category: 'Internet activity',       examples: 'Browser, search queries',           retained: true },
      ],
      collectionSources: [
        'Directly from you during registration and booking',
        'Automatically via cookies and browser metadata',
        'From payment processors (tokenized only)',
      ],
      businessPurposes: [
        'Fulfilling travel bookings',
        'Payment processing and receipts',
        'Customer support',
        'Trip reminders (with consent)',
        'Fraud prevention',
      ],
      thirdPartyDisclosures: [
        { recipient: 'Stripe / PayPal / Affirm', purpose: 'Payment processing',       category: 'Service provider' },
        { recipient: 'HotelBeds / Booking.com',  purpose: 'Reservation fulfilment',   category: 'Service provider' },
        { recipient: 'AWS (us-east-1)',           purpose: 'Cloud hosting',            category: 'Service provider' },
      ],
      rights: {
        optOut:   'POST /api/user/ccpa/opt-out',
        delete:   'POST /api/user/ccpa/delete',
        know:     'GET  /api/user/ccpa/rights (this endpoint)',
        contact:  'privacy@utubooking.com · 1 (800) UTU-BOOK',
      },
      nonDiscrimination: 'UTUBooking will not deny service, charge different prices, or reduce service quality because you exercised CCPA rights (§1798.125).',
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /delete — Cal. Civ. Code §1798.105
// Anonymises PII immediately. Tax/legal records retained 7 years.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/delete', ccpaRateLimit, async (req, res, next) => {
  const { id: userId, email } = req.user;
  const { reason } = req.body;
  const ip         = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const ua         = req.headers['user-agent'] ?? '';

  const pool   = userPool(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Anonymise user profile
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

    // Revoke sessions
    await client.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);

    // Cancel pending bookings (completed retained for tax)
    await client.query(
      `UPDATE bookings
       SET status = 'cancelled_ccpa', updated_at = NOW()
       WHERE user_id = $1
         AND status NOT IN ('completed', 'cancelled', 'cancelled_gdpr', 'cancelled_ccpa')`,
      [userId],
    );

    // Delete privacy preferences
    await client.query(`DELETE FROM privacy_preferences WHERE user_id = $1`, [userId]);

    // Log for compliance audit (retained 7 years)
    await client.query(
      `INSERT INTO erasure_requests
         (user_id, email_snapshot, status, law, reason, ip_address, user_agent)
       VALUES ($1, $2, 'pending', 'CCPA', $3, $4::inet, $5)`,
      [userId, email, reason?.trim() ?? null, ip, ua],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }

  // Log to Redis deletion queue for cascade cleanup
  await redis.rpush('ccpa:deletion:queue', JSON.stringify({
    userId, email,
    law:         'CCPA',
    action:      'delete',
    reason:      reason?.trim() ?? '',
    ip,
    requestedAt: new Date().toISOString(),
    status:      'pending-cascade',
  }));

  // Clear opt-out cache entry
  await redis.set(`ccpa:opted_out:${userId}`, '0', 'EX', 1);

  // Revoke Redis refresh tokens
  try {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length) await redis.del(...keys);
  } catch { /* non-fatal */ }

  res.json({
    ok:          true,
    referenceId: `CCPA-DELETE-${userId.slice(0, 8)}-${Date.now()}`,
    message:     'Your personal information has been anonymised. Booking/payment records are retained 7 years as required by US tax law (§1798.105(d)(8) exemption).',
    retainedFor: 'Booking/payment records: 7 years',
  });
});

module.exports = router;
