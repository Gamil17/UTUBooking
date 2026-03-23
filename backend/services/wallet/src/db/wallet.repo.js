const { pool, readPool } = require('./pg');

/**
 * Get existing wallet or create one with zero balance.
 * Pass a pg client when called inside a transaction.
 */
async function getOrCreateWallet(userId, currency, client) {
  const db = client ?? pool;
  await db.query(
    `INSERT INTO wallets (user_id, currency)
     VALUES ($1, $2)
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId, currency],
  );
  const { rows } = await db.query(
    `SELECT id, user_id, currency, balance, updated_at
     FROM wallets
     WHERE user_id = $1 AND currency = $2`,
    [userId, currency],
  );
  if (!rows.length) throw new Error(`Failed to create wallet for user ${userId} / ${currency}`);
  return rows[0];
}

/** All wallets for a user (read replica). */
async function getAllBalances(userId) {
  const { rows } = await readPool.query(
    `SELECT id, currency, balance, updated_at
     FROM wallets
     WHERE user_id = $1
     ORDER BY currency`,
    [userId],
  );
  return rows;
}

/**
 * Atomically add `delta` to balance.
 * Returns the new balance, or null if the row was not found / balance would go negative.
 */
async function updateBalance(walletId, delta, client) {
  const db = client ?? pool;
  const { rows } = await db.query(
    `UPDATE wallets
     SET balance    = balance + $1,
         updated_at = now()
     WHERE id = $2
       AND balance + $1 >= 0
     RETURNING balance`,
    [delta, walletId],
  );
  return rows.length ? Number(rows[0].balance) : null;
}

/**
 * Append an immutable transaction record.
 * opts: { booking_id?, ref_tx_id?, note? }
 */
async function insertTx(walletId, amount, type, opts = {}, client) {
  const db = client ?? pool;
  const { rows } = await db.query(
    `INSERT INTO wallet_tx (wallet_id, amount, type, booking_id, ref_tx_id, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [walletId, amount, type, opts.booking_id ?? null, opts.ref_tx_id ?? null, opts.note ?? null],
  );
  return rows[0].id;
}

/**
 * Upsert a cached FX rate pair.
 */
async function upsertFxRate(fromCcy, toCcy, rate) {
  await pool.query(
    `INSERT INTO fx_rates (from_ccy, to_ccy, rate, fetched_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (from_ccy, to_ccy)
     DO UPDATE SET rate = EXCLUDED.rate, fetched_at = now()`,
    [fromCcy, toCcy, rate],
  );
}

/**
 * Fetch a rate directly from the DB (fallback level 3).
 */
async function getFxRate(fromCcy, toCcy) {
  const { rows } = await readPool.query(
    `SELECT rate FROM fx_rates WHERE from_ccy = $1 AND to_ccy = $2`,
    [fromCcy, toCcy],
  );
  return rows.length ? Number(rows[0].rate) : null;
}

module.exports = { getOrCreateWallet, getAllBalances, updateBalance, insertTx, upsertFxRate, getFxRate };
