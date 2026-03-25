/**
 * GDPR User Rights Router
 * Mount at: /api/user/gdpr
 *
 * Endpoints:
 *   POST /erase        — Art. 17: right to erasure — cascade delete all regional DBs
 *   GET  /export       — Art. 15: right of access — return all user data as JSON
 *   POST /portability  — Art. 20: right to portability — machine-readable export
 *   GET  /consents     — Art. 7(3): consent history + withdrawal status
 *
 * Auth: All endpoints require valid JWT (authMiddleware).
 * Rate limit: 5 requests / 15 min per user (gdprLimiter).
 *
 * Legal basis:
 *   GDPR (EU) 2016/679 — primary
 *   UK GDPR (post-Brexit) — applied equally for GB users
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import rateLimit from 'express-rate-limit';

// ── Type augmentation for authenticated requests ───────────────────────────────
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id:          string;
      email:       string;
      countryCode: string;
    };
  }
}

// ── Rate limiter — 5 rights-requests per 15 min per user ──────────────────────
export const gdprLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'anon',
  message: { error: 'Too many GDPR requests. Please wait 15 minutes.' },
});

// ── DB shard pools (imported from your shard-router) ─────────────────────────
// In production: import { getShardPool } from '../shared/shard-router';
// Here we type the interface to stay self-contained:
type ShardPool = { pool: Pool; readPool: Pool };
type GetShardPool = (countryCode: string) => ShardPool;

// ── Router factory ─────────────────────────────────────────────────────────────

export function createGdprRouter(
  getShardPool: GetShardPool,
  redis: { rpush: (key: string, ...values: string[]) => Promise<number> },
) {
  const router = express.Router();

  // ── Helper: resolve shard pool for user ─────────────────────────────────────
  function userPool(req: Request): Pool {
    const cc = req.user?.countryCode ?? 'SA';
    return getShardPool(cc).pool;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // POST /erase — Art. 17 Right to Erasure
  // Cascade deletes across all shards where user may have data.
  // ────────────────────────────────────────────────────────────────────────────
  router.post('/erase', gdprLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const email  = req.user?.email;
    if (!userId || !email) return res.status(401).json({ error: 'Authenticated user required' });

    const { reason } = req.body as { reason?: string };

    // Log erasure request to Redis queue for DPO review (GDPR Art. 12 — 30-day response)
    const record = JSON.stringify({
      userId,
      email,
      reason:      reason?.trim() ?? '',
      law:         'GDPR',
      ip:          req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? req.ip,
      userAgent:   req.headers['user-agent'] ?? '',
      requestedAt: new Date().toISOString(),
      status:      'pending',
    });

    await redis.rpush('gdpr:erasure:queue', record);

    // Anonymise PII in primary shard immediately (soft-delete pattern)
    // Hard cascade across all shards is scheduled within 30-day window.
    const pool = userPool(req);
    try {
      await pool.query('BEGIN');

      // Anonymise user profile
      await pool.query(
        `UPDATE users
         SET email     = $2,
             name      = 'Deleted User',
             phone     = NULL,
             nationality = NULL,
             deleted_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [userId, `deleted-${userId}@erased.invalid`],
      );

      // Revoke all active sessions
      await pool.query(
        `DELETE FROM refresh_tokens WHERE user_id = $1`,
        [userId],
      );

      // Cancel pending bookings (completed bookings must be kept 7 years for tax)
      await pool.query(
        `UPDATE bookings
         SET status     = 'cancelled_gdpr',
             updated_at = NOW()
         WHERE user_id = $1
           AND status NOT IN ('completed', 'cancelled', 'cancelled_gdpr')`,
        [userId],
      );

      // Record erasure log (retained 7 years for legal compliance — Art. 17(3)(e))
      await pool.query(
        `INSERT INTO gdpr_erasure_log
           (user_id, email_snapshot, requested_at, completed_at, law)
         VALUES ($1, $2, NOW(), NOW(), 'GDPR')`,
        [userId, email],
      );

      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      return next(err);
    }

    res.json({
      ok:      true,
      message: 'Your erasure request has been processed. PII anonymised immediately. Full cascade deletion completes within 30 days per GDPR Art. 17.',
      referenceId: `GDPR-ERASE-${userId}-${Date.now()}`,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /export — Art. 15 Right of Access + data summary
  // ────────────────────────────────────────────────────────────────────────────
  router.get('/export', gdprLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authenticated user required' });

    const pool = userPool(req);
    try {
      const [profile, bookings, consents, payments] = await Promise.all([
        pool.query(
          `SELECT id, email, name, phone, nationality, created_at, updated_at
           FROM users WHERE id = $1`,
          [userId],
        ),
        pool.query(
          `SELECT id, hotel_id, check_in, check_out, guests, total_amount,
                  currency, status, created_at
           FROM bookings WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId],
        ),
        pool.query(
          `SELECT consent_type, granted, timestamp, ip_address
           FROM consent_log WHERE user_id = $1 ORDER BY timestamp DESC`,
          [userId],
        ),
        pool.query(
          `SELECT id, gateway, amount, currency, status, created_at
           FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId],
        ),
      ]);

      res.json({
        exportedAt:   new Date().toISOString(),
        law:          'GDPR',
        article:      'Art. 15 — Right of access',
        controller:   process.env.EU_DATA_CONTROLLER ?? 'UTUBooking Ltd',
        dpo:          process.env.DPO_EMAIL ?? 'dpo@utubooking.com',
        data: {
          profile:    profile.rows[0] ?? null,
          bookings:   bookings.rows,
          consents:   consents.rows,
          payments:   payments.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /portability — Art. 20 Right to Data Portability
  // Returns structured, machine-readable JSON-LD export
  // ────────────────────────────────────────────────────────────────────────────
  router.post('/portability', gdprLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authenticated user required' });

    const pool = userPool(req);
    try {
      const [profile, bookings] = await Promise.all([
        pool.query(
          `SELECT id, email, name, phone, nationality, created_at
           FROM users WHERE id = $1`,
          [userId],
        ),
        pool.query(
          `SELECT b.id, b.check_in, b.check_out, b.guests, b.total_amount,
                  b.currency, b.status, b.created_at,
                  h.name AS hotel_name, h.city, h.country
           FROM bookings b
           LEFT JOIN hotels h ON h.id = b.hotel_id
           WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
          [userId],
        ),
      ]);

      // JSON-LD schema.org format for interoperability
      const portableData = {
        '@context':  'https://schema.org',
        '@type':     'Person',
        exportedAt:  new Date().toISOString(),
        law:         'GDPR Art. 20 — Right to data portability',
        format:      'application/ld+json',
        identifier:  profile.rows[0]?.id,
        email:       profile.rows[0]?.email,
        name:        profile.rows[0]?.name,
        telephone:   profile.rows[0]?.phone,
        nationality: profile.rows[0]?.nationality,
        reservations: bookings.rows.map(b => ({
          '@type':        'LodgingReservation',
          reservationId:  b.id,
          reservationStatus: b.status,
          checkinTime:    b.check_in,
          checkoutTime:   b.check_out,
          numAdults:      b.guests,
          lodgingUnitDescription: b.hotel_name,
          priceCurrency:  b.currency,
          totalPrice:     b.total_amount,
        })),
      };

      res.setHeader('Content-Disposition', `attachment; filename="utu-data-export-${userId}.json"`);
      res.setHeader('Content-Type', 'application/ld+json');
      res.json(portableData);
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /consents — Art. 7(1): show all consents given + withdrawal status
  // ────────────────────────────────────────────────────────────────────────────
  router.get('/consents', async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authenticated user required' });

    const pool = userPool(req);
    try {
      const result = await pool.query(
        `SELECT consent_type, granted, timestamp, ip_address, user_agent, version
         FROM consent_log
         WHERE user_id = $1
         ORDER BY timestamp DESC`,
        [userId],
      );

      res.json({
        userId,
        law:      'GDPR',
        article:  'Art. 7(1) — Conditions for consent',
        consents: result.rows,
        rights: {
          withdraw: 'POST /api/user/gdpr/erase',
          export:   'GET  /api/user/gdpr/export',
          portable: 'POST /api/user/gdpr/portability',
          contact:  process.env.DPO_EMAIL ?? 'dpo@utubooking.com',
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createGdprRouter;
