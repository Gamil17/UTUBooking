'use strict';

const pricingSvc = require('../services/pricing.service');
const demandSvc  = require('../services/demand.service');
const repo       = require('../db/pricing.repo');

// ── POST /api/v1/pricing/recommend ───────────────────────────────────────────
async function recommend(req, res, next) {
  try {
    const { hotelId, basePrice, currency = 'SAR', checkIn, checkOut } = req.body;

    if (!hotelId || !basePrice || !checkIn || !checkOut) {
      return res.status(400).json({
        error:    'MISSING_FIELDS',
        required: ['hotelId', 'basePrice', 'checkIn', 'checkOut'],
      });
    }

    const aiResult = await pricingSvc.generateRecommendation({
      hotelId,
      basePrice: Number(basePrice),
      currency,
      checkIn,
      checkOut,
    });

    const rec = await repo.insertRecommendation({
      hotelId,
      basePrice:        Number(basePrice),
      recommendedPrice: aiResult.recommendedPrice,
      currency,
      confidenceScore:  aiResult.confidenceScore,
      reasoning:        aiResult.reasoning,
      status:           'pending',
      season:           aiResult.season,
      occupancyPct:     aiResult.occupancyPct,
      demandCount:      aiResult.demandCount,
      checkIn,
      checkOut,
    });

    res.status(201).json({ ...rec, fromCache: aiResult.fromCache ?? false });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/pricing/recommendations  (admin) ─────────────────────────────
async function listRecommendations(req, res, next) {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const { rows, total } = await repo.listRecommendations({
      status,
      page:  Number(page),
      limit: Number(limit),
    });
    res.json({ status, page: Number(page), limit: Number(limit), total, results: rows });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v1/pricing/recommendations/:id/accept  (admin) ─────────────────
async function acceptRecommendation(req, res, next) {
  try {
    const rec = await repo.getRecommendationById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'NOT_FOUND' });
    if (rec.status !== 'pending') {
      return res.status(409).json({ error: 'ALREADY_DECIDED', current: rec.status });
    }

    await repo.updateRecommendationStatus(rec.id, 'accepted', null);

    // Replace pricing snapshot — expire old, write new
    await repo.expireCurrentSnapshot(rec.hotel_id);
    await repo.insertSnapshot({
      hotelId:        rec.hotel_id,
      effectivePrice: rec.recommended_price,
      currency:       rec.currency,
      source:         'ai',
      recId:          rec.id,
    });

    // Bust Redis price cache so next lookup gets the new price immediately
    await pricingSvc.invalidatePriceCache(rec.hotel_id);

    res.json({ ok: true, hotelId: rec.hotel_id, effectivePrice: rec.recommended_price });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v1/pricing/recommendations/:id/reject  (admin) ─────────────────
async function rejectRecommendation(req, res, next) {
  try {
    const { note } = req.body;
    const rec = await repo.getRecommendationById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'NOT_FOUND' });
    if (rec.status !== 'pending') {
      return res.status(409).json({ error: 'ALREADY_DECIDED', current: rec.status });
    }

    await repo.updateRecommendationStatus(rec.id, 'rejected', note ?? null);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/pricing/current/:hotelId ─────────────────────────────────────
async function getCurrentPrice(req, res, next) {
  try {
    const snapshot = await pricingSvc.getCurrentPrice(req.params.hotelId);
    if (!snapshot) return res.status(404).json({ error: 'NO_PRICE_SET' });
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/pricing/metrics/revpar  (admin) ──────────────────────────────
async function getRevParMetrics(req, res, next) {
  try {
    const { market = 'all', period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const data = await repo.getRevParMetrics({ market, days });
    res.json({ market, period, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/pricing/metrics/funnel  (admin) ──────────────────────────────
async function getFunnelMetrics(req, res, next) {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : 7;
    const data = await repo.getFunnelMetrics({ days });
    res.json({ period, data });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v1/pricing/internal/cron  (Lambda — x-internal-secret) ─────────
async function runCron(req, res, next) {
  try {
    const hotels  = await repo.getActivePilgrimageHotels();
    const results = [];

    for (const hotel of hotels) {
      try {
        // 1. Demand forecast + conditional push alert
        const demand = await demandSvc.runForecastForHotel(hotel.hotel_id);

        // 2. AI pricing recommendation for check-in 30 days from now (proxy window)
        const checkIn  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        const checkOut = new Date(Date.now() + 33 * 86400000).toISOString().slice(0, 10);

        const aiResult = await pricingSvc.generateRecommendation({
          hotelId:   hotel.hotel_id,
          basePrice: Number(hotel.price_per_night),
          currency:  hotel.currency ?? 'SAR',
          checkIn,
          checkOut,
        });

        // Persist as pending — admin reviews on dashboard
        const rec = await repo.insertRecommendation({
          hotelId:          hotel.hotel_id,
          basePrice:        Number(hotel.price_per_night),
          recommendedPrice: aiResult.recommendedPrice,
          currency:         hotel.currency ?? 'SAR',
          confidenceScore:  aiResult.confidenceScore,
          reasoning:        aiResult.reasoning,
          status:           'pending',
          season:           aiResult.season,
          occupancyPct:     aiResult.occupancyPct,
          demandCount:      aiResult.demandCount,
          checkIn,
          checkOut,
        });

        results.push({ hotelId: hotel.hotel_id, demand, recId: rec.id, fromCache: aiResult.fromCache });
      } catch (err) {
        console.error(`[pricing/cron] hotel ${hotel.hotel_id} failed:`, err.message);
        results.push({ hotelId: hotel.hotel_id, error: err.message });
      }
    }

    res.json({ ok: true, processed: results.length, results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recommend,
  listRecommendations,
  acceptRecommendation,
  rejectRecommendation,
  getCurrentPrice,
  getRevParMetrics,
  getFunnelMetrics,
  runCron,
};
