'use strict';

const { pool, readPool } = require('./pg');

// ── Recommendations ──────────────────────────────────────────────────────────

async function insertRecommendation({
  hotelId, basePrice, recommendedPrice, currency,
  confidenceScore, reasoning, status, season,
  occupancyPct, demandCount, checkIn, checkOut,
}) {
  const { rows } = await pool.query(
    `INSERT INTO pricing_recommendations
       (hotel_id, base_price, recommended_price, currency, confidence_score, reasoning,
        status, season, occupancy_pct, demand_count, check_in, check_out)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [hotelId, basePrice, recommendedPrice, currency, confidenceScore, reasoning,
     status, season, occupancyPct, demandCount, checkIn, checkOut],
  );
  return rows[0];
}

async function listRecommendations({ status = 'pending', page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [dataRes, countRes] = await Promise.all([
    readPool.query(
      `SELECT * FROM pricing_recommendations
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    ),
    readPool.query(
      'SELECT COUNT(*)::int AS total FROM pricing_recommendations WHERE status = $1',
      [status],
    ),
  ]);
  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

async function getRecommendationById(id) {
  const { rows } = await readPool.query(
    'SELECT * FROM pricing_recommendations WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

async function updateRecommendationStatus(id, status, adminNote) {
  const { rows } = await pool.query(
    `UPDATE pricing_recommendations
     SET status = $1, admin_note = $2, decided_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, adminNote ?? null, id],
  );
  return rows[0];
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

async function insertSnapshot({ hotelId, effectivePrice, currency, source, recId }) {
  const { rows } = await pool.query(
    `INSERT INTO pricing_snapshots (hotel_id, effective_price, currency, source, rec_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [hotelId, effectivePrice, currency, source, recId ?? null],
  );
  return rows[0];
}

/** Close out the current active snapshot (valid_to IS NULL) for this hotel. */
async function expireCurrentSnapshot(hotelId) {
  await pool.query(
    `UPDATE pricing_snapshots
     SET valid_to = NOW()
     WHERE hotel_id = $1 AND valid_to IS NULL`,
    [hotelId],
  );
}

async function getCurrentSnapshot(hotelId) {
  const { rows } = await readPool.query(
    `SELECT * FROM pricing_snapshots
     WHERE hotel_id = $1 AND valid_to IS NULL
     ORDER BY valid_from DESC
     LIMIT 1`,
    [hotelId],
  );
  return rows[0] ?? null;
}

// ── Hotel data ────────────────────────────────────────────────────────────────

/** All active Makkah / Madinah hotels — used by the 6h cron job. */
async function getActivePilgrimageHotels() {
  const { rows } = await readPool.query(
    `SELECT hotel_id, name, name_ar, price_per_night, currency
     FROM hotel_offers
     WHERE (location ILIKE '%makkah%' OR location ILIKE '%madinah%'
            OR location ILIKE '%مكة%'  OR location ILIKE '%المدينة%')
       AND is_active = true`,
  );
  return rows;
}

// ── Demand forecasts ──────────────────────────────────────────────────────────

async function upsertDemandForecast({
  hotelId, forecastDate, predictedDemandPct, confidence, triggeredAlert,
}) {
  const { rows } = await pool.query(
    `INSERT INTO demand_forecasts
       (hotel_id, forecast_date, predicted_demand_pct, confidence, triggered_alert)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (hotel_id, forecast_date) DO UPDATE
       SET predicted_demand_pct = EXCLUDED.predicted_demand_pct,
           confidence           = EXCLUDED.confidence,
           triggered_alert      = EXCLUDED.triggered_alert,
           created_at           = NOW()
     RETURNING *`,
    [hotelId, forecastDate, predictedDemandPct, confidence, triggeredAlert],
  );
  return rows[0];
}

/** Loyalty users (gold/platinum) — candidates for demand surge push alerts. */
async function getAlertableUsers() {
  const { rows } = await readPool.query(
    `SELECT user_id FROM loyalty_accounts WHERE tier IN ('gold', 'platinum')`,
  );
  return rows;
}

// ── Admin metrics ─────────────────────────────────────────────────────────────

/**
 * Revenue per available room by market.
 * market: 'MCM' | 'MED' | 'all'
 * days: 7 | 30 | 90
 */
async function getRevParMetrics({ market, days }) {
  const marketFilter =
    market === 'MCM' ? `AND ho.location ILIKE '%makkah%'` :
    market === 'MED' ? `AND ho.location ILIKE '%madinah%'` :
    '';

  const { rows } = await readPool.query(
    `SELECT
       CASE
         WHEN ho.location ILIKE '%makkah%' THEN 'MCM'
         WHEN ho.location ILIKE '%madinah%' THEN 'MED'
         ELSE 'OTHER'
       END AS market,
       COUNT(DISTINCT b.id)              AS bookings,
       ROUND(AVG(b.total_price)::numeric, 2) AS avg_revenue,
       ROUND(AVG(ps.effective_price)::numeric, 2) AS avg_effective_price,
       COUNT(DISTINCT ho.hotel_id)       AS hotels
     FROM bookings b
     JOIN hotel_offers ho ON ho.id = b.offer_id
     LEFT JOIN pricing_snapshots ps
       ON ps.hotel_id = ho.hotel_id AND ps.valid_to IS NULL
     WHERE b.status IN ('confirmed', 'completed')
       AND b.created_at >= NOW() - ($1 || ' days')::interval
       ${marketFilter}
     GROUP BY 1
     ORDER BY 1`,
    [days],
  );
  return rows;
}

/**
 * Conversion funnel grouped by country + device type.
 * days: 7 | 30
 */
async function getFunnelMetrics({ days }) {
  const { rows } = await readPool.query(
    `SELECT
       event_type,
       COALESCE(country, 'unknown')     AS country,
       COALESCE(device_type, 'unknown') AS device_type,
       COUNT(*)::int                    AS count
     FROM analytics_events
     WHERE created_at >= NOW() - ($1 || ' days')::interval
     GROUP BY event_type, country, device_type
     ORDER BY event_type, count DESC`,
    [days],
  );
  return rows;
}

module.exports = {
  insertRecommendation,
  listRecommendations,
  getRecommendationById,
  updateRecommendationStatus,
  insertSnapshot,
  expireCurrentSnapshot,
  getCurrentSnapshot,
  getActivePilgrimageHotels,
  upsertDemandForecast,
  getAlertableUsers,
  getRevParMetrics,
  getFunnelMetrics,
};
