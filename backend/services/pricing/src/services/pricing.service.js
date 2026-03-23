'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const redis     = require('../db/redis');
const { readPool } = require('../db/pg');
const repo      = require('../db/pricing.repo');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Season detection ─────────────────────────────────────────────────────────
// 2026 Hajj window (Dhul Hijja 8–13, 1447 AH)
const HAJJ_2026_START = new Date('2026-05-26');
const HAJJ_2026_END   = new Date('2026-06-02');

function detectSeason(checkIn) {
  const d = new Date(checkIn);
  if (d >= HAJJ_2026_START && d <= HAJJ_2026_END) return 'hajj';
  // Umrah peak: October–February
  const month = d.getUTCMonth() + 1; // 1-based
  if (month >= 10 || month <= 2) return 'umrah_peak';
  return 'normal';
}

// ── Demand signal from Redis ─────────────────────────────────────────────────
// Search counts written by hotel-service as: INCR hotel:searches:{hotelId}:{date}
async function getDemandCount(hotelId, checkIn) {
  try {
    const key = `hotel:searches:${hotelId}:${checkIn}`;
    const raw = await redis.get(key);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0; // non-fatal — cache miss treated as zero demand
  }
}

// ── Occupancy estimate from bookings table ────────────────────────────────────
async function getOccupancyPct(hotelId, checkIn, checkOut) {
  try {
    const { rows } = await readPool.query(
      `SELECT COUNT(*) AS cnt
       FROM bookings b
       JOIN hotel_offers ho ON ho.id = b.offer_id
       WHERE ho.hotel_id = $1
         AND b.status IN ('confirmed', 'completed')
         AND b.check_in  <= $3
         AND b.check_out >= $2`,
      [hotelId, checkIn, checkOut],
    );
    const capacity = parseInt(process.env.HOTEL_CAPACITY ?? '50', 10);
    return Math.min(100, (parseInt(rows[0].cnt, 10) / capacity) * 100);
  } catch {
    return 50; // fallback: assume 50% occupancy
  }
}

// ── Redis velocity guard ──────────────────────────────────────────────────────
const AI_CALL_TTL = 21600; // 6 hours — matches cron interval

async function getCachedAiResult(hotelId, checkIn) {
  try {
    const raw = await redis.get(`pricing:ai:${hotelId}:${checkIn}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedAiResult(hotelId, checkIn, result) {
  try {
    await redis.setex(`pricing:ai:${hotelId}:${checkIn}`, AI_CALL_TTL, JSON.stringify(result));
  } catch {
    // non-fatal
  }
}

// ── Claude pricing recommendation ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a hotel revenue management AI for UTUBooking, a Hajj and Umrah booking platform serving pilgrims in Makkah and Madinah.

Your job is to recommend an optimal nightly hotel price in SAR based on market signals.

OUTPUT FORMAT: Respond with ONLY valid JSON — no markdown, no explanation outside the JSON object.
Schema: { "recommendedPrice": number, "confidenceScore": number, "reasoning": string, "multiplier": number }

Rules:
- recommendedPrice: SAR amount, max 2 decimal places
- confidenceScore: float 0.0 to 1.0 (higher = more confident)
- reasoning: 1-2 sentences in English explaining the recommendation to the admin
- multiplier: recommendedPrice ÷ basePrice (e.g. 1.35 means 35% premium)
- Never recommend below basePrice × 0.7 or above basePrice × 3.0
- Hajj season: demand is at maximum — premium pricing (1.5x–2.5x) is expected and appropriate
- Umrah peak (Oct–Feb): moderate premium (1.2x–1.6x)
- Normal season: price near base or slight discount if low demand`;

async function generateRecommendation({ hotelId, basePrice, currency, checkIn, checkOut }) {
  // 1. Return cached result if available (avoids repeat Claude calls within 6h)
  const cached = await getCachedAiResult(hotelId, checkIn);
  if (cached) return { ...cached, fromCache: true };

  // 2. Gather context signals in parallel
  const [demandCount, occupancyPct] = await Promise.all([
    getDemandCount(hotelId, checkIn),
    getOccupancyPct(hotelId, checkIn, checkOut),
  ]);
  const season = detectSeason(checkIn);

  const competitorContext =
    season === 'hajj'       ? 'Competitor Hajj hotels near Haram: SAR 800–1500/night.' :
    season === 'umrah_peak' ? 'Competitor Umrah season hotels near Haram: SAR 400–800/night.' :
                              'Normal season competitor rates near Haram: SAR 200–500/night.';

  const userMessage =
    `Hotel pricing context:
- Hotel ID: ${hotelId}
- Base price per night: ${basePrice} ${currency}
- Check-in: ${checkIn} | Check-out: ${checkOut}
- Season: ${season}
- Estimated occupancy: ${occupancyPct.toFixed(1)}%
- Search demand (24h): ${demandCount} searches
- ${competitorContext}
- Market: Makkah / Madinah pilgrimage destination (KSA)

Recommend the optimal price for this hotel on the check-in date.`;

  // 3. Call Claude
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  });

  // 4. Parse JSON — strip any accidental markdown fencing
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  let parsed;
  try {
    const jsonStr = text.replace(/^```json\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    throw Object.assign(new Error(`Claude returned non-JSON: ${text.slice(0, 200)}`), { statusCode: 502, name: 'AI_PARSE_ERROR' });
  }

  // 5. Validate schema
  const { recommendedPrice, confidenceScore, reasoning, multiplier } = parsed;
  if (
    typeof recommendedPrice !== 'number' || recommendedPrice <= 0 ||
    typeof confidenceScore  !== 'number' || confidenceScore < 0 || confidenceScore > 1 ||
    typeof reasoning        !== 'string' || !reasoning.trim() ||
    typeof multiplier       !== 'number'
  ) {
    throw Object.assign(new Error('Claude response failed schema validation'), { statusCode: 502, name: 'AI_SCHEMA_ERROR' });
  }

  const result = {
    recommendedPrice: Number(recommendedPrice.toFixed(2)),
    confidenceScore:  Number(confidenceScore.toFixed(3)),
    reasoning:        reasoning.trim(),
    multiplier:       Number(multiplier.toFixed(4)),
    season,
    occupancyPct:     Number(occupancyPct.toFixed(2)),
    demandCount,
  };

  // 6. Cache for 6h
  await setCachedAiResult(hotelId, checkIn, result);

  return result;
}

// ── Current effective price ───────────────────────────────────────────────────

const PRICE_CACHE_TTL = 21600;

async function getCurrentPrice(hotelId) {
  try {
    const cacheKey = `pricing:current:${hotelId}`;
    const cached   = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const snapshot = await repo.getCurrentSnapshot(hotelId);
    if (!snapshot) return null;

    await redis.setex(cacheKey, PRICE_CACHE_TTL, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    // Redis unavailable — fall through to DB
    return repo.getCurrentSnapshot(hotelId);
  }
}

async function invalidatePriceCache(hotelId) {
  try {
    await redis.del(`pricing:current:${hotelId}`);
  } catch {
    // non-fatal
  }
}

module.exports = { generateRecommendation, getCurrentPrice, invalidatePriceCache, detectSeason };
