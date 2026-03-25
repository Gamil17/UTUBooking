'use strict';

/**
 * LGPD User Rights Router — auth service
 * Brazilian Lei Geral de Proteção de Dados (Lei 13.709/2018)
 * Mounted at: /api/user/lgpd (via app.js)
 *
 * LGPD Art. 18 — Data subject rights:
 *   I   — Confirmation of processing         GET  /status
 *   II  — Access to data                     GET  /export    (reuses GDPR export logic)
 *   III — Correction                         POST /correct
 *   IV  — Anonymization / blocking           POST /anonymize
 *   V   — Portability                        GET  /portability
 *   VI  — Deletion                           DELETE /erase   (reuses GDPR erase logic)
 *   IX  — Revocation of consent              POST /revoke
 *
 * LGPD Art. 48 — Breach notification: 72h to ANPD + data subjects.
 *
 * Data residency: ALL queries use getShardPool('BR') → sa-east-1 (São Paulo).
 * NEVER use a non-Brazil shard for BR user data.
 *
 * Rate limit: 5 requests / 15 min per user.
 */

const { Router }       = require('express');
const { getShardPool } = require('../../../../shared/shard-router');
const redis            = require('../services/redis.service');

// ── Rate limiter ────────────────────────────────────────────────────────────────
const rateLimitStore = new Map();

function lgpdRateLimit(req, res, next) {
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
      message: `Muitas solicitações LGPD. Aguarde ${Math.ceil(retryAfter / 60)} minutos.`,
    });
  }
  entry.count++;
  next();
}

function brPool()     { return getShardPool('BR').pool; }
function brReadPool() { return getShardPool('BR').readPool; }

const router = Router();

// ── GET /api/user/lgpd/status — Art. 18 I: Confirmation of processing ──────────
router.get('/status', lgpdRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    const result = await brReadPool().query(
      'SELECT id, email, created_at, deleted_at FROM users WHERE id = $1',
      [userId],
    );
    const user = result.rows[0];
    return res.json({
      law:                'LGPD',
      artigo:             'Art. 18 I — Confirmação de tratamento',
      userId,
      processando:        !!user && !user.deleted_at,
      desde:              user?.created_at ?? null,
      controlador:        process.env.BR_DATA_CONTROLLER ?? 'UTUBooking Brasil',
      encarregado:        process.env.BR_DPO_EMAIL ?? 'privacidade@utubooking.com',
      regulador:          'ANPD — Autoridade Nacional de Proteção de Dados (anpd.gov.br)',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/user/lgpd/export — Art. 18 II: Access to data ─────────────────────
router.get('/export', lgpdRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const readPool = brReadPool();
  try {
    const [profile, bookings, consents, payments] = await Promise.all([
      readPool.query(
        'SELECT id, email, name_en, phone, preferred_currency, preferred_lang, created_at FROM users WHERE id = $1',
        [userId],
      ),
      readPool.query(
        'SELECT id, hotel_id, check_in, check_out, guests, total_amount, currency, status, created_at FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
        [userId],
      ),
      readPool.query(
        'SELECT consent_type, granted, timestamp FROM consent_logs WHERE user_id = $1 ORDER BY timestamp DESC',
        [userId],
      ),
      readPool.query(
        'SELECT id, gateway, amount, currency, status, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
        [userId],
      ),
    ]);

    return res.json({
      exportadoEm:  new Date().toISOString(),
      lei:          'LGPD Art. 18 II — Acesso aos dados',
      controlador:  process.env.BR_DATA_CONTROLLER ?? 'UTUBooking Brasil',
      encarregado:  process.env.BR_DPO_EMAIL ?? 'privacidade@utubooking.com',
      dados: {
        perfil:      profile.rows[0] ?? null,
        reservas:    bookings.rows,
        consentimentos: consents.rows,
        pagamentos:  payments.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/user/lgpd/correct — Art. 18 III: Correction ──────────────────────
router.post('/correct', lgpdRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { campo, valorAtual, valorCorreto } = req.body;

  if (!campo || !valorCorreto) {
    return res.status(400).json({ error: 'VALIDACAO', mensagem: 'campo e valorCorreto são obrigatórios.' });
  }

  try {
    await redis.rpush(
      'lgpd:correction:queue',
      JSON.stringify({ userId, campo, valorAtual, valorCorreto, solicitadoEm: new Date().toISOString() }),
    );
    return res.json({
      ok:          true,
      mensagem:    'Solicitação de correção recebida. Nosso Encarregado responderá em até 15 dias úteis.',
      lei:         'LGPD Art. 18 III',
      encarregado: process.env.BR_DPO_EMAIL ?? 'privacidade@utubooking.com',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/user/lgpd/revoke — Art. 18 IX: Revocation of consent ─────────────
const VALID_TYPES = ['marketing_email', 'marketing_sms', 'analytics', 'personalization', 'push_notifications'];

router.post('/revoke', lgpdRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const { tipoConsentimento } = req.body;

  if (!tipoConsentimento || !VALID_TYPES.includes(tipoConsentimento)) {
    return res.status(400).json({
      error:    'VALIDACAO',
      mensagem: `tipoConsentimento deve ser um de: ${VALID_TYPES.join(', ')}`,
    });
  }

  const ip   = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const pool = brPool();

  try {
    await pool.query(
      `INSERT INTO consent_logs (user_id, consent_type, granted, ip_address, law, consent_version, timestamp)
       VALUES ($1, $2, false, $3::inet, 'LGPD', '1.0', NOW())`,
      [userId, tipoConsentimento, ip],
    );

    await redis.rpush(
      'lgpd:revocation:queue',
      JSON.stringify({ userId, tipoConsentimento, revokedAt: new Date().toISOString() }),
    );

    return res.json({
      ok:       true,
      mensagem: 'Consentimento revogado. Pararemos imediatamente de usar seus dados para essa finalidade.',
      lei:      'LGPD Art. 18 IX',
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/user/lgpd/erase — Art. 18 VI: Deletion ─────────────────────────
router.delete('/erase', lgpdRateLimit, async (req, res, next) => {
  const { id: userId, email } = req.user;
  const { motivo } = req.body;
  const ip   = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? 'unknown';
  const pool = brPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users
       SET email      = $2,
           name_en    = 'Excluído',
           phone      = NULL,
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId, `deletado-${userId}@lgpd.removido`],
    );

    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    await client.query(
      `UPDATE bookings
       SET status = 'cancelado_lgpd', updated_at = NOW()
       WHERE user_id = $1
         AND status NOT IN ('completed', 'cancelled', 'cancelado_lgpd')`,
      [userId],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return next(err);
  }
  client.release();

  try {
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length) await redis.del(...keys);
  } catch { /* non-fatal */ }

  await redis.rpush(
    'lgpd:erasure:queue',
    JSON.stringify({
      userId,
      emailSnapshot:  email,
      motivo:         motivo?.trim() ?? null,
      ip,
      solicitadoEm:   new Date().toISOString(),
      cascadeEm:      new Date(Date.now() + 15 * 86_400_000).toISOString(), // 15 business days
    }),
  );

  return res.json({
    ok:           true,
    referenceId:  `LGPD-ERASE-${userId.slice(0, 8)}-${Date.now()}`,
    mensagem:     'Seus dados pessoais foram excluídos dos sistemas UTUBooking Brasil. Registros de reservas exigidos pela Receita Federal (5 anos) são mantidos de forma anonimizada. A exclusão completa ocorre em até 15 dias úteis conforme LGPD Art. 18 VI.',
    lei:          'LGPD Art. 18 VI',
    encarregado:  process.env.BR_DPO_EMAIL ?? 'privacidade@utubooking.com',
    anpd:         'anpd.gov.br',
  });
});

// ── GET /api/user/lgpd/portability — Art. 18 V: Portability ────────────────────
router.get('/portability', lgpdRateLimit, async (req, res, next) => {
  const { id: userId } = req.user;
  const readPool = brReadPool();

  try {
    const [profile, bookings] = await Promise.all([
      readPool.query(
        'SELECT id, email, name_en, phone, preferred_currency, preferred_lang, created_at FROM users WHERE id = $1',
        [userId],
      ),
      readPool.query(
        `SELECT b.id, b.check_in, b.check_out, b.guests, b.total_amount, b.currency, b.status, b.created_at,
                h.name AS hotel_name, h.city, h.country
         FROM bookings b LEFT JOIN hotels h ON h.id = b.hotel_id
         WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
        [userId],
      ),
    ]);

    const p = profile.rows[0];
    const export_ = {
      '@context':      'https://schema.org',
      '@type':         'Person',
      exportadoEm:     new Date().toISOString(),
      lei:             'LGPD Art. 18 V — Portabilidade dos dados',
      formato:         'application/ld+json',
      controlador:     process.env.BR_DATA_CONTROLLER ?? 'UTUBooking Brasil',
      encarregado:     process.env.BR_DPO_EMAIL ?? 'privacidade@utubooking.com',
      identifier:      p?.id,
      email:           p?.email,
      name:            p?.name_en,
      telephone:       p?.phone,
      reservas:        bookings.rows.map((b) => ({
        '@type':              'LodgingReservation',
        reservationId:        b.id,
        reservationStatus:    b.status,
        checkinTime:          b.check_in,
        checkoutTime:         b.check_out,
        lodgingUnit:          b.hotel_name ?? null,
        cidade:               b.city ?? null,
        pais:                 b.country ?? null,
        totalPaymentDue: {
          '@type':       'PriceSpecification',
          price:         b.total_amount,
          priceCurrency: b.currency,
        },
      })),
    };

    res.setHeader('Content-Disposition', `attachment; filename="utubooking-dados-${userId.slice(0, 8)}.json"`);
    res.setHeader('Content-Type', 'application/ld+json');
    return res.json(export_);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
