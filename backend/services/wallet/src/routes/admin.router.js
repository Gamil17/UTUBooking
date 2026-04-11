'use strict';

/**
 * Wallet service — admin routes.
 * Mounted at: /api/admin/wallet (via index.js)
 *
 * Auth: x-admin-secret header (timingSafeEqual against ADMIN_SECRET).
 *
 * Routes:
 *   GET  /stats                — total outstanding by currency + transaction counts
 *   GET  /balances             — paginated list of all user wallets (search by user_id/email)
 *   GET  /balances/:userId     — all wallets for a single user
 *   GET  /transactions         — recent transactions across all wallets
 *   POST /credit               — manually credit a user's wallet (admin correction)
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const { pool }            = require('../db/pg');
const repo                = require('../db/wallet.repo');

// ─── Auth ─────────────────────────────────────────────────────────────────────

function requireAdminSecret(req, res, next) {
  const secret   = process.env.ADMIN_SECRET ?? '';
  const provided = req.headers['x-admin-secret'] ?? '';
  if (!secret || !provided) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    if (timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) return next();
  } catch { /* length mismatch */ }
  return res.status(401).json({ error: 'UNAUTHORIZED' });
}

const router = Router();
router.use(requireAdminSecret);

// ─── GET /stats ───────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const [balanceStats, txStats] = await Promise.all([
      pool.query(`
        SELECT
          currency,
          COUNT(DISTINCT user_id)              AS wallet_count,
          COALESCE(SUM(balance), 0)            AS total_outstanding,
          COALESCE(AVG(balance), 0)            AS avg_balance
        FROM wallets
        WHERE balance > 0
        GROUP BY currency
        ORDER BY total_outstanding DESC
      `),
      pool.query(`
        SELECT
          COUNT(*)                                                  AS total_tx,
          COUNT(*) FILTER (WHERE type = 'topup')                    AS topups,
          COUNT(*) FILTER (WHERE type = 'debit')                    AS debits,
          COUNT(*) FILTER (WHERE type IN ('convert_out','convert_in')) AS conversions,
          COUNT(*) FILTER (WHERE type = 'refund')                   AS refunds,
          COALESCE(SUM(amount) FILTER (WHERE type = 'topup'), 0)   AS total_topped_up
        FROM wallet_tx
      `),
    ]);

    return res.json({
      data: {
        byCurrency: balanceStats.rows.map((r) => ({
          currency:          r.currency,
          wallet_count:      parseInt(r.wallet_count,      10),
          total_outstanding: parseFloat(r.total_outstanding),
          avg_balance:       parseFloat(parseFloat(r.avg_balance).toFixed(2)),
        })),
        transactions: {
          total:        parseInt(txStats.rows[0].total_tx,      10),
          topups:       parseInt(txStats.rows[0].topups,        10),
          debits:       parseInt(txStats.rows[0].debits,        10),
          conversions:  parseInt(txStats.rows[0].conversions,   10),
          refunds:      parseInt(txStats.rows[0].refunds,       10),
          total_topped_up: parseFloat(txStats.rows[0].total_topped_up),
        },
      },
    });
  } catch (err) {
    console.error('[wallet admin] GET /stats error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── GET /balances — list all wallets (search by user_id) ────────────────────

router.get('/balances', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const offset = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (search) {
    conditions.push(`w.user_id::text ILIKE $${idx++}`);
    values.push(`%${search}%`);
  }
  if (req.query.currency) {
    conditions.push(`w.currency = $${idx++}`);
    values.push(req.query.currency.toUpperCase());
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           w.id,
           w.user_id,
           w.currency,
           w.balance,
           w.updated_at,
           (SELECT COUNT(*) FROM wallet_tx wt WHERE wt.wallet_id = w.id) AS tx_count
         FROM wallets w
         ${where}
         ORDER BY w.balance DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS total FROM wallets w ${where}`, values),
    ]);

    return res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[wallet admin] GET /balances error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── GET /balances/:userId — all wallets for one user ────────────────────────

router.get('/balances/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         w.id,
         w.currency,
         w.balance,
         w.updated_at,
         (
           SELECT json_agg(t ORDER BY t.created_at DESC)
           FROM (
             SELECT id, amount, type, note, created_at
             FROM wallet_tx
             WHERE wallet_id = w.id
             ORDER BY created_at DESC
             LIMIT 20
           ) t
         ) AS recent_tx
       FROM wallets w
       WHERE w.user_id = $1
       ORDER BY w.currency`,
      [req.params.userId],
    );

    return res.json({ data: rows, userId: req.params.userId });
  } catch (err) {
    console.error('[wallet admin] GET /balances/:userId error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── GET /transactions — recent transactions across all wallets ───────────────

router.get('/transactions', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (req.query.type) {
    conditions.push(`wt.type = $${idx++}`);
    values.push(req.query.type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           wt.id,
           wt.amount,
           wt.type,
           wt.note,
           wt.created_at,
           w.user_id,
           w.currency
         FROM wallet_tx wt
         JOIN wallets w ON w.id = wt.wallet_id
         ${where}
         ORDER BY wt.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS total FROM wallet_tx wt ${where}`, values),
    ]);

    return res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[wallet admin] GET /transactions error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// ─── POST /credit — manually credit a user's wallet ──────────────────────────

router.post('/credit', async (req, res) => {
  const { userId, currency, amount, note } = req.body ?? {};

  if (!userId || !currency || !amount) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'userId, currency, and amount are required' });
  }

  const parsed = parseFloat(amount);
  if (!parsed || parsed <= 0 || parsed > 100_000) {
    return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'Amount must be between 0 and 100,000' });
  }

  const SUPPORTED = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'MYR', 'IDR', 'TRY', 'BDT', 'PKR'];
  if (!SUPPORTED.includes(currency.toUpperCase())) {
    return res.status(400).json({ error: 'UNSUPPORTED_CURRENCY', supported: SUPPORTED });
  }

  try {
    const wallet     = await repo.getOrCreateWallet(userId, currency.toUpperCase());
    const newBalance = await repo.updateBalance(wallet.id, parsed);
    if (newBalance === null) {
      return res.status(500).json({ error: 'CREDIT_FAILED' });
    }

    await repo.insertTx(wallet.id, parsed, 'topup', {
      note: note ? `[admin-credit] ${note}` : '[admin-credit]',
    });

    return res.status(201).json({
      data: {
        walletId:   wallet.id,
        userId,
        currency:   currency.toUpperCase(),
        credited:   parsed,
        newBalance,
      },
    });
  } catch (err) {
    console.error('[wallet admin] POST /credit error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
