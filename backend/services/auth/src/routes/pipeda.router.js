'use strict';

/**
 * PIPEDA + Quebec Law 25 User Rights Router — auth service
 * Mounted at: /api/user/pipeda (via app.js)
 *
 * PIPEDA (federal Canada):
 *   s.4.9   — Right of access          GET  /access
 *   s.4.9.5 — Right of correction      POST /correct
 *   s.4.3.8 — Withdrawal of consent    POST /withdraw-consent
 *
 * Quebec Law 25 (stricter — applies to QC residents):
 *   s.28.1  — Right of erasure         POST /erase
 *   s.27    — Right of portability     GET  /portability
 *
 * Common:
 *   Current consent state              GET  /consents
 *
 * Auth: authMiddleware (JWT) required — wired in app.js.
 * Rate limit: 5 requests / 15 min per user.
 * Data residency: ALL queries use getShardPool('CA') → ca-central-1 (Montreal).
 */

const { Router }       = require('express');
const { getShardPool } = require('../../../../shared/shard-router');
const redis            = require('../services/redis.service');

// ── In-memory rate limiter (mirrors gdpr.router.js pattern) ───────────────────
const rateLimitStore = new Map(); // userId → { count, resetAt }

// Purge expired entries every 15 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) rateLimitStore.delete(key);
  }
}, 15 * 60 * 1000).unref();

function pipedaRateLimit(req, res, next) {
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
      message: `Too many PIPEDA requests. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    });
  }

  entry.count++;
  next();
}

// ── Helper: always use CA shard (ca-central-1 / Montreal) ─────────────────────
function caPool()     { return getShardPool('CA').pool; }
function caReadPool() { return getShardPool('CA').readPool; }

const router = Router();

// ── GET /api/user/pipeda/access ────────────────────────────────────────────────
// PIPEDA s.4.9: Right of access — all personal data held about the user.
// SLA: respond within 30 days (PIPEDA s.4.9.2).
router.get('/access', pipedaRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const pool     = caPool();
  const readPool = caReadPool();

  try {
    const [profile, bookings, consents, payments] = await Promise.all([
      readPool.query(
        `SELECT id, email, name_en, phone, preferred_currency, preferred_lang, created_at
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
        `SELECT consent_type, granted, created_at
         FROM pipeda_consent_log WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      ),
      readPool.query(
        `SELECT id, gateway, amount, currency, status, created_at
         FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      ),
    ]);

    // Log access request with 30-day due date
    await pool.query(
      `INSERT INTO pipeda_access_log (user_id, request_type, law, due_at, status, fulfilled_at)
       VALUES ($1, 'access', 'PIPEDA', NOW() + INTERVAL '30 days', 'fulfilled', NOW())`,
      [userId],
    );

    return res.json({
      exportedAt:     new Date().toISOString(),
      law:            'PIPEDA',
      section:        's.4.9 — Right of access',
      dataController: process.env.CA_DATA_CONTROLLER ?? 'UTUBooking Canada Inc.',
      privacyOfficer: process.env.CA_PRIVACY_OFFICER_EMAIL ?? 'privacy@utubooking.com',
      data: {
        profile:  profile.rows[0] ?? null,
        bookings: bookings.rows,
        consents: consents.rows,
        payments: payments.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/user/pipeda/correct ──────────────────────────────────────────────
// PIPEDA s.4.9.5: Correction request — queued for Privacy Officer review.
// Auto-update without PO sign-off is not safe for financial records.
router.post('/correct', pipedaRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { field, currentValue, correctValue } = req.body;

  if (!field || !correctValue) {
    return res.status(400).json({
      error:   'VALIDATION_ERROR',
      message: 'field and correctValue are required.',
    });
  }

  const pool = caPool();
  try {
    await pool.query(
      `INSERT INTO pipeda_access_log (user_id, request_type, law, due_at, metadata)
       VALUES ($1, 'correct', 'PIPEDA', NOW() + INTERVAL '30 days', $2)`,
      [userId, JSON.stringify({ field, currentValue, correctValue })],
    );

    await redis.rpush(
      'pipeda:correction:queue',
      JSON.stringify({
        userId,
        field,
        currentValue,
        correctValue,
        requestedAt: new Date().toISOString(),
      }),
    );

    return res.json({
      ok:             true,
      referenceId:    `PIPEDA-CORRECT-${userId.slice(0, 8)}-${Date.now()}`,
      message:        'Correction request received. Our Privacy Officer will review and respond within 30 days.',
      law:            'PIPEDA',
      section:        's.4.9.5 — Right of correction',
      privacyOfficer: process.env.CA_PRIVACY_OFFICER_EMAIL ?? 'privacy@utubooking.com',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/user/pipeda/withdraw-consent ─────────────────────────────────────
// PIPEDA s.4.3.8: Withdrawal of consent — append-only to pipeda_consent_log.
// Effective immediately for future processing.
const VALID_CONSENT_TYPES = [
  'marketing_email', 'marketing_sms', 'analytics',
  'third_party_sharing', 'personalization', 'push_notifications',
];

router.post('/withdraw-consent', pipedaRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { consentType, reason } = req.body;

  if (!consentType || !VALID_CONSENT_TYPES.includes(consentType)) {
    return res.status(400).json({
      error:   'VALIDATION_ERROR',
      message: `consentType must be one of: ${VALID_CONSENT_TYPES.join(', ')}`,
    });
  }

  const ip       = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const lang     = req.headers['accept-language']?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const pool     = caPool();

  try {
    await pool.query(
      `INSERT INTO pipeda_consent_log
         (user_id, law, consent_type, granted, purpose, language, ip_address, source, version)
       VALUES ($1, 'PIPEDA', $2, false, $3, $4, $5, 'web', '1.0')`,
      [userId, consentType, reason?.trim() ?? 'User withdrew consent', lang, ip],
    );

    await redis.rpush(
      'pipeda:withdrawal:queue',
      JSON.stringify({ userId, consentType, withdrawnAt: new Date().toISOString() }),
    );

    return res.json({
      ok:      true,
      message: 'Consent withdrawal recorded. We will stop using your data for this purpose immediately.',
      law:     'PIPEDA',
      section: 's.4.3.8 — Withdrawal of consent',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/user/pipeda/erase ────────────────────────────────────────────────
// Quebec Law 25 s.28.1: Right of erasure (de-indexing + deletion).
// Anonymises PII immediately. Cascade queued for 30-day window.
router.post('/erase', pipedaRateLimit, async (req, res, next) => {
  const { id: userId, email } = req.user;
  const { reason } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';

  const pool   = caPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Anonymise PII immediately
    await client.query(
      `UPDATE users
       SET email       = $2,
           name_en     = 'Deleted User',
           phone       = NULL,
           deleted_at  = NOW(),
           updated_at  = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId, `deleted-${userId}@pipeda.removed`],
    );

    // 2. Revoke all refresh tokens (stop access immediately)
    await client.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [userId],
    );

    // 3. Cancel pending bookings (completed bookings stay for tax law — 7 years CRA)
    await client.query(
      `UPDATE bookings
       SET status = 'cancelled_pipeda', updated_at = NOW()
       WHERE user_id = $1
         AND status NOT IN ('completed', 'cancelled', 'cancelled_pipeda', 'cancelled_gdpr')`,
      [userId],
    );

    // 4. Log erasure in PIPEDA access log
    await client.query(
      `INSERT INTO pipeda_access_log
         (user_id, request_type, law, due_at, status, fulfilled_at, metadata)
       VALUES ($1, 'erase', 'QUEBEC_LAW25', NOW() + INTERVAL '30 days', 'fulfilled', NOW(), $2)`,
      [userId, JSON.stringify({ reason: reason?.trim() ?? null, ip, emailSnapshot: email })],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return next(err);
  }
  client.release();

  // 5. Revoke Redis refresh tokens
  try {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length) await redis.del(...keys);
  } catch { /* non-fatal */ }

  // 6. Queue cascade (bookings metadata, consent_log anonymisation — 30-day window)
  // emailSnapshot intentionally excluded — email was already anonymised in step 1;
  // storing PII in a Redis queue violates data minimisation (PIPEDA s.4.4).
  await redis.rpush(
    'pipeda:erasure:queue',
    JSON.stringify({
      userId,
      reason:      reason?.trim() ?? null,
      requestedAt: new Date().toISOString(),
      cascadeBy:   new Date(Date.now() + 30 * 86_400_000).toISOString(),
    }),
  );

  return res.json({
    ok:          true,
    referenceId: `PIPEDA-ERASE-${userId.slice(0, 8)}-${Date.now()}`,
    message:     'Your personal information has been erased from UTUBooking Canada systems. Booking records required for CRA tax purposes (7 years) are retained in anonymised form. Full cascade completes within 30 days per Quebec Law 25 s.28.1.',
    law:         'QUEBEC_LAW25',
    section:     's.28.1 — Right to erasure (de-indexing)',
    privacyOfficer: process.env.CA_PRIVACY_OFFICER_EMAIL ?? 'privacy@utubooking.com',
  });
});

// ── GET /api/user/pipeda/portability ──────────────────────────────────────────
// Quebec Law 25 s.27: Portability — structured, machine-readable JSON-LD export.
router.get('/portability', pipedaRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const pool     = caPool();
  const readPool = caReadPool();

  try {
    const [profile, bookings, consents] = await Promise.all([
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
      readPool.query(
        `SELECT consent_type, granted, created_at FROM pipeda_consent_log WHERE user_id = $1`,
        [userId],
      ),
    ]);

    await pool.query(
      `INSERT INTO pipeda_access_log (user_id, request_type, law, due_at, status, fulfilled_at)
       VALUES ($1, 'portability', 'QUEBEC_LAW25', NOW() + INTERVAL '30 days', 'fulfilled', NOW())`,
      [userId],
    );

    const p = profile.rows[0];
    const export_ = {
      '@context':       'https://schema.org',
      '@type':          'Person',
      exportedAt:       new Date().toISOString(),
      exportLaw:        'Quebec Law 25 s.27 — Right of portability',
      format:           'application/ld+json',
      dataController:   process.env.CA_DATA_CONTROLLER ?? 'UTUBooking Canada Inc.',
      privacyOfficer:   process.env.CA_PRIVACY_OFFICER_EMAIL ?? 'privacy@utubooking.com',
      identifier:       p?.id,
      email:            p?.email,
      name:             p?.name_en,
      telephone:        p?.phone,
      memberSince:      p?.created_at,
      preferredCurrency: p?.preferred_currency,
      preferredLanguage: p?.preferred_lang,
      reservations:     bookings.rows.map((b) => ({
        '@type':               'LodgingReservation',
        reservationId:         b.id,
        reservationStatus:     b.status,
        checkinTime:           b.check_in,
        checkoutTime:          b.check_out,
        numAdults:             b.guests,
        lodgingUnitDescription: b.hotel_name ?? null,
        addressLocality:       b.city ?? null,
        addressCountry:        b.country ?? null,
        totalPaymentDue: {
          '@type':       'PriceSpecification',
          price:         b.total_amount,
          priceCurrency: b.currency,
        },
      })),
      consentHistory: consents.rows,
    };

    res.setHeader('Content-Disposition', `attachment; filename="utubooking-ca-export-${userId.slice(0, 8)}.json"`);
    res.setHeader('Content-Type', 'application/ld+json');
    return res.json(export_);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/user/pipeda/consents ─────────────────────────────────────────────
// Current consent state — most recent row per consent_type.
router.get('/consents', pipedaRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const readPool = caReadPool();

  try {
    const [history, latest] = await Promise.all([
      readPool.query(
        `SELECT consent_type, granted, language, created_at
         FROM pipeda_consent_log WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      ),
      readPool.query(
        `SELECT DISTINCT ON (consent_type)
           consent_type, granted, created_at
         FROM pipeda_consent_log
         WHERE user_id = $1
         ORDER BY consent_type, created_at DESC`,
        [userId],
      ),
    ]);

    const currentChoices = {};
    for (const row of latest.rows) {
      currentChoices[row.consent_type] = row.granted;
    }

    return res.json({
      userId,
      law:            'PIPEDA',
      currentChoices,
      history:        history.rows,
      rights: {
        access:          'GET  /api/user/pipeda/access',
        correct:         'POST /api/user/pipeda/correct',
        withdrawConsent: 'POST /api/user/pipeda/withdraw-consent',
        erase:           'POST /api/user/pipeda/erase   (Quebec Law 25)',
        portability:     'GET  /api/user/pipeda/portability   (Quebec Law 25)',
        contact:         process.env.CA_PRIVACY_OFFICER_EMAIL ?? 'privacy@utubooking.com',
        opc:             'https://www.priv.gc.ca/en/report-a-concern/',
        cai:             'https://www.cai.gouv.qc.ca/en/complaints/',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
