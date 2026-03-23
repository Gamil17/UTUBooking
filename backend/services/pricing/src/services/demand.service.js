'use strict';

const axios        = require('axios');
const { readPool } = require('../db/pg');
const repo         = require('../db/pricing.repo');

const DEMAND_THRESHOLD = 80; // % — trigger push alert above this level

// ── Historical booking analysis → demand forecast ─────────────────────────────

async function forecastDemand(hotelId) {
  const { rows } = await readPool.query(
    `SELECT
       b.check_in::date AS check_in,
       COUNT(*)::int    AS booking_count
     FROM bookings b
     JOIN hotel_offers ho ON ho.id = b.offer_id
     WHERE ho.hotel_id = $1
       AND b.status IN ('confirmed', 'completed')
       AND b.check_in >= NOW() - INTERVAL '1 year'
       AND b.check_in <  NOW()
     GROUP BY b.check_in::date
     ORDER BY b.check_in::date`,
    [hotelId],
  );

  if (!rows.length) {
    return { predictedDemandPct: 20, confidence: 0.3 };
  }

  const capacity    = parseInt(process.env.HOTEL_CAPACITY ?? '50', 10);
  const total       = rows.reduce((sum, r) => sum + r.booking_count, 0);
  const avgBookings = total / rows.length;

  const predictedDemandPct = Math.min(100, (avgBookings / capacity) * 100);
  // More data → higher confidence (asymptotes to 0.95)
  const confidence = Math.min(0.95, 0.3 + (rows.length / 100) * 0.65);

  return {
    predictedDemandPct: Number(predictedDemandPct.toFixed(2)),
    confidence:         Number(confidence.toFixed(3)),
  };
}

// ── Push alert to gold/platinum loyalty users ─────────────────────────────────

async function sendDemandAlerts() {
  const users         = await repo.getAlertableUsers();
  const frontendUrl   = process.env.FRONTEND_URL ?? 'https://utubooking.com';
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret) {
    console.warn('[demand] INTERNAL_API_SECRET not set — skipping push alerts');
    return 0;
  }

  const results = await Promise.allSettled(
    users.map(({ user_id }) =>
      axios.post(
        `${frontendUrl}/api/notifications/push`,
        {
          userId:   user_id,
          trigger:  'price_alert',
          locale:   'en',
          vars:     { price: 'Hajj season hotels are filling fast — book now to secure your stay!' },
          deepLink: '/hotels?location=MCM&isHajj=true',
        },
        {
          headers: { 'x-internal-secret': internalSecret },
          timeout: 5000,
        },
      ).catch((err) => {
        console.warn(`[demand] push failed for user ${user_id}:`, err.message);
        throw err;
      }),
    ),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  console.info(`[demand] push alerts sent: ${sent}/${users.length}`);
  return sent;
}

// ── Full forecast cycle for one hotel ────────────────────────────────────────

async function runForecastForHotel(hotelId) {
  const forecastDate = new Date().toISOString().slice(0, 10);
  const { predictedDemandPct, confidence } = await forecastDemand(hotelId);

  let triggeredAlert = false;
  if (predictedDemandPct > DEMAND_THRESHOLD) {
    await sendDemandAlerts();
    triggeredAlert = true;
    console.info(
      `[demand] alert triggered — hotel ${hotelId}, predicted ${predictedDemandPct}%`,
    );
  }

  await repo.upsertDemandForecast({
    hotelId,
    forecastDate,
    predictedDemandPct,
    confidence,
    triggeredAlert,
  });

  return { hotelId, forecastDate, predictedDemandPct, confidence, triggeredAlert };
}

module.exports = { runForecastForHotel };
