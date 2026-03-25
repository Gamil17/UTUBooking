/**
 * CCPA User Rights Router
 * Mount at: /api/user/ccpa
 *
 * Endpoints:
 *   POST /opt-out   — mark user as opted out of data sale / sharing
 *   GET  /rights    — return what data UTUBooking holds about the user (Cal. Civ. Code §1798.110)
 *   POST /delete    — right to deletion (§1798.105) — same mechanics as GDPR erasure
 *
 * Auth: All endpoints require valid JWT (authMiddleware).
 * Rate limit: 5 requests / 15 min per user (ccpaLimiter).
 *
 * Legal basis:
 *   California Consumer Privacy Act (CCPA) 2018 + CPRA amendment 2023
 *   Cal. Civ. Code §1798.100 – §1798.199
 *
 * Compliance notes:
 *   - Opt-out must be honoured within 15 business days (§1798.120)
 *   - No re-sale of opted-out data to third parties
 *   - Annual data inventory review required (see compliance/ccpa/)
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import rateLimit from 'express-rate-limit';
import { PrivacyPreferencesRepository } from '../models/PrivacyPreferences';

// ── Rate limiter — 5 rights-requests per 15 min per user ──────────────────────
export const ccpaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'anon',
  message: { error: 'Too many CCPA requests. Please wait 15 minutes.' },
});

// ── Types ──────────────────────────────────────────────────────────────────────
type ShardPool   = { pool: Pool; readPool: Pool };
type GetShardPool = (countryCode: string) => ShardPool;

// ── Router factory ─────────────────────────────────────────────────────────────

export function createCcpaRouter(
  getShardPool: GetShardPool,
  redis: {
    rpush: (key: string, ...values: string[]) => Promise<number>;
    set:   (key: string, value: string, ...args: unknown[]) => Promise<unknown>;
  },
) {
  const router = express.Router();

  function userPool(req: Request): Pool {
    // US users always route to us-east-1 shard
    return getShardPool(req.user?.countryCode ?? 'US').pool;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // POST /opt-out — Cal. Civ. Code §1798.120
  // Marks user as opted out of data sale/sharing within 15 business days.
  // ────────────────────────────────────────────────────────────────────────────
  router.post('/opt-out', ccpaLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const email  = req.user?.email;
    if (!userId || !email) return res.status(401).json({ error: 'Authenticated user required' });

    const pool  = userPool(req);
    const prefs = new PrivacyPreferencesRepository(pool);
    const ip    = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? req.ip;
    const ua    = req.headers['user-agent'] ?? '';

    try {
      await prefs.setCcpaOptOut({ userId, optedOut: true, ipAddress: ip, userAgent: ua });
    } catch (err) {
      return next(err);
    }

    // Log to Redis for ops review + downstream suppression jobs
    const record = JSON.stringify({
      userId,
      email,
      law:         'CCPA',
      action:      'opt-out',
      ip,
      requestedAt: new Date().toISOString(),
    });
    await redis.rpush('ccpa:opt-out:queue', record);

    // Cache opt-out flag for fast look-ups by email/analytics services (24 h TTL)
    await redis.set(`ccpa:opted_out:${userId}`, '1', 'EX', 86400);

    res.json({
      ok:      true,
      message: 'You have successfully opted out of the sale and sharing of your personal information. This will take effect within 15 business days per California law (Cal. Civ. Code §1798.120).',
      referenceId: `CCPA-OPT-OUT-${userId}-${Date.now()}`,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /rights — Cal. Civ. Code §1798.110
  // Returns categories of personal data UTUBooking holds about this user.
  // ────────────────────────────────────────────────────────────────────────────
  router.get('/rights', ccpaLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authenticated user required' });

    const pool = userPool(req);
    const prefs = new PrivacyPreferencesRepository(pool);

    try {
      const [profile, bookingCount, paymentCount, privacyPrefs] = await Promise.all([
        pool.query(
          `SELECT email, name, phone, nationality, created_at
           FROM users WHERE id = $1`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM bookings WHERE user_id = $1`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM payments WHERE user_id = $1`,
          [userId],
        ),
        prefs.findByUserId(userId),
      ]);

      res.json({
        law:     'CCPA — Cal. Civ. Code §1798.110',
        userId,
        currentOptOutStatus: privacyPrefs?.ccpa_opted_out ?? false,
        optedOutAt:          privacyPrefs?.ccpa_opted_out_at ?? null,

        // Categories of data held (§1798.110(c))
        dataCategories: [
          {
            category: 'Identifiers',
            examples: 'Name, email address, phone number, IP address',
            retained: !!profile.rows[0],
          },
          {
            category: 'Commercial information',
            examples: 'Booking history, payment records',
            retained: Number(bookingCount.rows[0]?.count ?? 0) > 0,
            recordCount: {
              bookings: Number(bookingCount.rows[0]?.count ?? 0),
              payments: Number(paymentCount.rows[0]?.count ?? 0),
            },
          },
          {
            category: 'Geolocation data',
            examples: 'Country code derived from IP address for routing',
            retained: true,
          },
          {
            category: 'Sensitive personal information',
            examples: 'Nationality (for Hajj/Umrah visa requirements)',
            retained: !!profile.rows[0]?.nationality,
          },
          {
            category: 'Internet or network activity',
            examples: 'Browser type, search queries on UTUBooking',
            retained: true,
          },
        ],

        // Sources of collection (§1798.110(c)(1))
        collectionSources: [
          'Directly from you when creating an account or making a booking',
          'Automatically via cookies and browser metadata (see Privacy Policy §8)',
          'From payment processors (Stripe, PayPal, Affirm) — tokenized only',
        ],

        // Business purposes (§1798.110(c)(2))
        businessPurposes: [
          'Fulfilling travel bookings (hotels, flights, cars)',
          'Processing payments and issuing receipts',
          'Providing customer support',
          'Sending booking confirmations and trip reminders (with your consent)',
          'Fraud prevention and security',
        ],

        // Third-party disclosures (§1798.115)
        thirdPartyDisclosures: [
          { recipient: 'Stripe / PayPal / Affirm', purpose: 'Payment processing', category: 'Commercial' },
          { recipient: 'HotelBeds / Booking.com', purpose: 'Hotel reservation fulfilment', category: 'Commercial' },
          { recipient: 'AWS (us-east-1)', purpose: 'Cloud infrastructure / hosting', category: 'Service provider' },
        ],

        // Your rights
        rights: {
          optOut:       'POST /api/user/ccpa/opt-out — stop data sale/sharing',
          delete:       'POST /api/user/ccpa/delete — delete your data',
          knowCategories: 'GET /api/user/ccpa/rights (this endpoint)',
          gdprExport:   'GET /api/user/gdpr/export — machine-readable data export',
          contact:      'privacy@utubooking.com · 1 (800) UTU-BOOK',
          agentInfo:    'California residents may submit requests via an authorised agent — contact privacy@utubooking.com for the agent request form',
        },

        // Non-discrimination notice (§1798.125)
        nonDiscrimination: 'UTUBooking will not deny service, charge different prices, or provide a different level of quality because you exercised your CCPA rights.',
      });
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /delete — Cal. Civ. Code §1798.105
  // Right to deletion — mirrors GDPR erasure mechanics.
  // Exemption: booking/payment records retained 7 years for tax/legal.
  // ────────────────────────────────────────────────────────────────────────────
  router.post('/delete', ccpaLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const email  = req.user?.email;
    if (!userId || !email) return res.status(401).json({ error: 'Authenticated user required' });

    const { reason } = req.body as { reason?: string };
    const pool = userPool(req);
    const ip   = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? req.ip;

    try {
      await pool.query('BEGIN');

      // Anonymise user profile
      await pool.query(
        `UPDATE users
         SET email       = $2,
             name        = 'Deleted User',
             phone       = NULL,
             nationality = NULL,
             deleted_at  = NOW(),
             updated_at  = NOW()
         WHERE id = $1`,
        [userId, `deleted-${userId}@erased.invalid`],
      );

      // Revoke sessions
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);

      // Cancel pending bookings (completed retained for tax)
      await pool.query(
        `UPDATE bookings
         SET status     = 'cancelled_ccpa',
             updated_at = NOW()
         WHERE user_id = $1
           AND status NOT IN ('completed', 'cancelled', 'cancelled_gdpr', 'cancelled_ccpa')`,
        [userId],
      );

      // Delete privacy preferences row
      await pool.query(`DELETE FROM privacy_preferences WHERE user_id = $1`, [userId]);

      // Log deletion for compliance audit
      await pool.query(
        `INSERT INTO gdpr_erasure_log
           (user_id, email_snapshot, requested_at, completed_at, law)
         VALUES ($1, $2, NOW(), NOW(), 'CCPA')`,
        [userId, email],
      );

      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      return next(err);
    }

    // Log to Redis deletion queue for ops / cascade cleanup
    const record = JSON.stringify({
      userId,
      email,
      law:         'CCPA',
      action:      'delete',
      reason:      reason?.trim() ?? '',
      ip,
      requestedAt: new Date().toISOString(),
      status:      'pending-cascade',
    });
    await redis.rpush('ccpa:deletion:queue', record);

    // Clear opt-out cache entry
    await redis.set(`ccpa:opted_out:${userId}`, '0', 'EX', 1);

    res.json({
      ok:      true,
      message: 'Your deletion request has been processed. Personal information has been anonymised immediately. Booking/payment records are retained for 7 years as required by California law and US tax regulations.',
      referenceId: `CCPA-DELETE-${userId}-${Date.now()}`,
      retainedFor: 'Booking/payment records: 7 years (Cal. Civ. Code §1798.105(d)(8) exemption)',
    });
  });

  return router;
}

export default createCcpaRouter;
