const { pool }   = require('../db/pg');
const repo       = require('../db/wallet.repo');
const fx         = require('../services/fx.service');
const redis      = require('../db/redis');

const VELOCITY_LIMIT  = 5;     // max conversions per hour per user
const VELOCITY_WINDOW = 3600;  // seconds

// Transaction type constants — matches wallet_tx_type enum in DB
const TX = {
  TOPUP:       'topup',
  DEBIT:       'debit',
  CONVERT_OUT: 'convert_out',
  CONVERT_IN:  'convert_in',
  REFUND:      'refund',
};

// ─── GET /api/v1/wallet/balance ──────────────────────────────────────────────

async function getBalance(req, res, next) {
  try {
    const wallets = await repo.getAllBalances(req.user.id);
    res.json({ userId: req.user.id, wallets });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/wallet/topup ────────────────────────────────────────────────
// Body: { currency, amount }

async function topup(req, res, next) {
  try {
    const { currency, amount } = req.body;

    if (!fx.SUPPORTED.includes(currency)) {
      return res.status(400).json({ error: 'UNSUPPORTED_CURRENCY', supported: fx.SUPPORTED });
    }
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      return res.status(400).json({ error: 'INVALID_AMOUNT' });
    }

    const wallet     = await repo.getOrCreateWallet(req.user.id, currency);
    const newBalance = await repo.updateBalance(wallet.id, parsed);
    if (newBalance === null) {
      return res.status(500).json({ error: 'BALANCE_UPDATE_FAILED' });
    }
    await repo.insertTx(wallet.id, parsed, TX.TOPUP);

    res.status(201).json({ walletId: wallet.id, currency, amount: parsed, newBalance });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/wallet/convert ─────────────────────────────────────────────
// Body: { fromCurrency, toCurrency, fromAmount }

async function convert(req, res, next) {
  // Validate all inputs BEFORE acquiring a DB connection
  const { fromCurrency, toCurrency, fromAmount } = req.body;

  if (!fx.SUPPORTED.includes(fromCurrency) || !fx.SUPPORTED.includes(toCurrency)) {
    return res.status(400).json({ error: 'UNSUPPORTED_CURRENCY', supported: fx.SUPPORTED });
  }
  if (fromCurrency === toCurrency) {
    return res.status(400).json({ error: 'SAME_CURRENCY' });
  }
  const parsedFrom = Number(fromAmount);
  if (!parsedFrom || parsedFrom <= 0) {
    return res.status(400).json({ error: 'INVALID_AMOUNT' });
  }

  // Velocity check BEFORE acquiring a DB connection
  const rlKey = `wallet:rl:convert:${req.user.id}`;
  const count = await redis.incr(rlKey);
  if (count === 1) {
    // Set TTL only on first increment — prevents window reset on subsequent hits
    await redis.expire(rlKey, VELOCITY_WINDOW);
  }
  if (count > VELOCITY_LIMIT) {
    const ttl = await redis.ttl(rlKey);
    return res.status(429).json({ error: 'RATE_LIMIT', retryAfter: ttl });
  }

  // Acquire connection only after all validation passes
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock source wallet row for the duration of the transaction
    const { rows: srcRows } = await client.query(
      `SELECT id FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE`,
      [req.user.id, fromCurrency],
    );
    if (!srcRows.length) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'INSUFFICIENT_FUNDS', detail: 'Source wallet does not exist' });
    }
    const srcId = srcRows[0].id;

    // Get live FX rate inside the transaction (after wallet lock, before debit)
    const rate = await fx.getRate(fromCurrency, toCurrency);
    if (!rate || rate <= 0) {
      await client.query('ROLLBACK');
      return res.status(503).json({ error: 'FX_RATE_UNAVAILABLE' });
    }
    const toAmount = Number((parsedFrom * rate).toFixed(6));

    // Debit source
    const srcNewBalance = await repo.updateBalance(srcId, -parsedFrom, client);
    if (srcNewBalance === null) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'INSUFFICIENT_FUNDS' });
    }

    // Credit destination (create wallet if first time)
    const destWallet = await repo.getOrCreateWallet(req.user.id, toCurrency, client);
    await repo.updateBalance(destWallet.id, toAmount, client);

    // Immutable paired transaction records
    const srcTxId = await repo.insertTx(srcId, -parsedFrom, TX.CONVERT_OUT, {}, client);
    await repo.insertTx(destWallet.id, toAmount, TX.CONVERT_IN, { ref_tx_id: srcTxId }, client);

    await client.query('COMMIT');

    res.json({
      fromCurrency,
      toCurrency,
      fromAmount: parsedFrom,
      toAmount,
      rate,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

// ─── GET /api/v1/wallet/fx-rates ─────────────────────────────────────────────
// Public — no auth required

async function getFxRates(req, res, next) {
  try {
    const rates = await fx.getAllRates();
    res
      .set('Cache-Control', `public, max-age=${VELOCITY_WINDOW / 4}`) // 900s = 15 min
      .json({ rates, cachedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBalance, topup, convert, getFxRates };
