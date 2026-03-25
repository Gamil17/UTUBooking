/**
 * PIPEDA + Quebec Law 25 Data Rights Router
 * Canada market — Phase 13
 *
 * Equivalent of `backend/routes/gdpr.ts` for Canadian privacy law.
 *
 * PIPEDA (federal):
 *   - Right of access (s.4.9): user can request all data held about them
 *   - Right of correction (s.4.9.5): user can correct inaccurate data
 *   - Right of withdrawal (s.4.3.8): user can withdraw consent at any time
 *   - Response SLA: 30 days (extendable to 60 days with notice)
 *
 * Quebec Law 25 (stricter):
 *   - Right of erasure (s.28.1): user can request deletion
 *   - Right of portability (s.27): structured, machine-readable export
 *   - Breach notification: 72h to CAI + affected users
 *
 * Mount in auth service:
 *   const pipedaRouter = createPipedaRouter(getShardPool, redis);
 *   app.use('/api/user/pipeda', pipedaRouter);
 *
 * Data residency: All queries use getShardPool('CA') → ca-central-1 (Montreal).
 */

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiter: 5 requests per 15 min per user (same as GDPR router)
const pipedaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => (req as any).userId ?? req.ip,
  message: { error: 'RATE_LIMITED', message: 'Too many PIPEDA requests. Try again in 15 minutes.' },
});

// Auth middleware stub — replace with real JWT verification in auth service
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  next();
}

export function createPipedaRouter(
  getShardPool: (countryCode: string) => { pool: any; readPool: any },
  redis: any,
) {
  const router = Router();
  router.use(requireAuth);
  router.use(pipedaLimiter);

  // ── GET /api/user/pipeda/access ──────────────────────────────────────────
  // PIPEDA s.4.9: Access request — return all data held about the user.
  // Response SLA: 30 days.
  router.get('/access', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { readPool } = getShardPool('CA');

    try {
      const [profile, bookings, consents, payments] = await Promise.all([
        readPool.query('SELECT id, email, name, phone, created_at FROM users WHERE id = $1', [userId]),
        readPool.query(
          'SELECT id, booking_ref, status, created_at, total_amount, currency FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
          [userId],
        ),
        readPool.query(
          'SELECT consent_type, granted, purpose, language, created_at FROM pipeda_consent_log WHERE user_id = $1 ORDER BY created_at DESC',
          [userId],
        ),
        readPool.query(
          'SELECT id, method, amount, currency, status, created_at FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)',
          [userId],
        ),
      ]);

      // Log access request
      await getShardPool('CA').pool.query(
        `INSERT INTO pipeda_access_log (user_id, request_type, law, due_at)
         VALUES ($1, 'access', 'PIPEDA', NOW() + INTERVAL '30 days')`,
        [userId],
      );

      return res.json({
        law:      'PIPEDA',
        userId,
        export: {
          profile:  profile.rows[0] ?? null,
          bookings: bookings.rows,
          consents: consents.rows,
          payments: payments.rows,
        },
        note: 'This export covers all personal data held in UTUBooking Canada systems as of the request date.',
      });
    } catch (err) {
      return next(err);
    }
  });

  // ── POST /api/user/pipeda/correct ────────────────────────────────────────
  // PIPEDA s.4.9.5: Correction request — flag data for manual review.
  // Auto-correction not safe without human verification; queued for Privacy Officer.
  router.post('/correct', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { field, currentValue, correctValue } = req.body;

    if (!field || !correctValue) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'field and correctValue are required' });
    }

    const { pool } = getShardPool('CA');
    try {
      await pool.query(
        `INSERT INTO pipeda_access_log (user_id, request_type, law, due_at, metadata)
         VALUES ($1, 'correct', 'PIPEDA', NOW() + INTERVAL '30 days', $2)`,
        [userId, JSON.stringify({ field, currentValue, correctValue })],
      );

      // Queue for Privacy Officer review
      await redis.rpush(
        'pipeda:correction:queue',
        JSON.stringify({ userId, field, currentValue, correctValue, requestedAt: new Date().toISOString() }),
      );

      return res.json({
        ok:      true,
        message: 'Correction request received. Our Privacy Officer will review and respond within 30 days.',
        law:     'PIPEDA',
      });
    } catch (err) {
      return next(err);
    }
  });

  // ── POST /api/user/pipeda/withdraw-consent ───────────────────────────────
  // PIPEDA s.4.3.8: Withdrawal of consent — append new row to consent log.
  // Withdrawal takes effect immediately for future processing;
  // data already processed under prior consent is not retroactively unlawful.
  router.post('/withdraw-consent', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { consentType, reason } = req.body;

    const validTypes = [
      'marketing_email', 'marketing_sms', 'analytics',
      'third_party_sharing', 'personalization', 'push_notifications',
    ];
    if (!consentType || !validTypes.includes(consentType)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `consentType must be one of: ${validTypes.join(', ')}`,
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? '0.0.0.0';
    const { pool } = getShardPool('CA');

    try {
      await pool.query(
        `INSERT INTO pipeda_consent_log
           (user_id, law, consent_type, granted, purpose, language, ip_address, source, version)
         VALUES ($1, 'PIPEDA', $2, false, $3, $4, $5, 'web', '1.0')`,
        [userId, consentType, reason ?? 'User withdrew consent', req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en', ip],
      );

      await redis.rpush(
        'pipeda:withdrawal:queue',
        JSON.stringify({ userId, consentType, withdrawnAt: new Date().toISOString() }),
      );

      return res.json({
        ok:      true,
        message: 'Consent withdrawal recorded. We will stop using your data for this purpose immediately.',
        law:     'PIPEDA',
      });
    } catch (err) {
      return next(err);
    }
  });

  // ── POST /api/user/pipeda/erase ──────────────────────────────────────────
  // Quebec Law 25 s.28.1: Right of erasure (de-indexing + deletion).
  // Federal PIPEDA does not have explicit erasure right, but Law 25 does.
  // PII is anonymised immediately; CASCADE queued for 30-day window.
  router.post('/erase', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { pool } = getShardPool('CA');

    try {
      // Anonymise PII immediately
      await pool.query(
        `UPDATE users
         SET email    = 'deleted_' || id || '@pipeda.removed',
             name     = 'DELETED',
             phone    = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [userId],
      );

      // Log erasure request
      await pool.query(
        `INSERT INTO pipeda_access_log (user_id, request_type, law, due_at, status, fulfilled_at)
         VALUES ($1, 'erase', 'QUEBEC_LAW25', NOW() + INTERVAL '30 days', 'fulfilled', NOW())`,
        [userId],
      );

      // Queue cascade for dependent tables (bookings metadata, consent_log anonymisation)
      await redis.rpush(
        'pipeda:erasure:queue',
        JSON.stringify({ userId, requestedAt: new Date().toISOString(), cascadeBy: new Date(Date.now() + 30 * 86400 * 1000).toISOString() }),
      );

      return res.json({
        ok:      true,
        message: 'Your personal information has been erased from our Canada systems. Booking records required for financial/legal purposes will be retained for the minimum legally required period.',
        law:     'QUEBEC_LAW25',
      });
    } catch (err) {
      return next(err);
    }
  });

  // ── GET /api/user/pipeda/portability ─────────────────────────────────────
  // Quebec Law 25 s.27: Right of portability — structured, machine-readable export.
  // Returns JSON-LD (schema.org/Person) attachment.
  router.get('/portability', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { readPool, pool } = getShardPool('CA');

    try {
      const [profile, bookings, consents] = await Promise.all([
        readPool.query('SELECT id, email, name, phone, created_at FROM users WHERE id = $1', [userId]),
        readPool.query(
          'SELECT booking_ref, status, total_amount, currency, created_at FROM bookings WHERE user_id = $1',
          [userId],
        ),
        readPool.query(
          'SELECT consent_type, granted, created_at FROM pipeda_consent_log WHERE user_id = $1',
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
        identifier:       userId,
        email:            p?.email,
        name:             p?.name,
        telephone:        p?.phone,
        memberSince:      p?.created_at,
        reservations:     bookings.rows.map((b: any) => ({
          '@type':           'LodgingReservation',
          reservationId:     b.booking_ref,
          reservationStatus: b.status,
          totalPaymentDue:   { '@type': 'PriceSpecification', price: b.total_amount, priceCurrency: b.currency },
        })),
        consentHistory:   consents.rows,
        exportedAt:       new Date().toISOString(),
        exportLaw:        'Quebec Law 25 s.27 — Right of Portability',
        dataController:   process.env.CA_DATA_CONTROLLER ?? 'UTUBooking Canada Inc.',
      };

      res.setHeader('Content-Disposition', `attachment; filename="utubooking-export-${userId.slice(0, 8)}.json"`);
      return res.json(export_);
    } catch (err) {
      return next(err);
    }
  });

  // ── GET /api/user/pipeda/consents ────────────────────────────────────────
  // Return current consent state — latest entry per consent_type.
  router.get('/consents', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { readPool } = getShardPool('CA');

    try {
      const result = await readPool.query(
        `SELECT DISTINCT ON (consent_type)
           consent_type, granted, purpose, language, created_at
         FROM pipeda_consent_log
         WHERE user_id = $1
         ORDER BY consent_type, created_at DESC`,
        [userId],
      );

      return res.json({ userId, consents: result.rows, law: 'PIPEDA' });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
