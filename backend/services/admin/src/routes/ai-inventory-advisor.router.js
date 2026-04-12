'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_inventory_advice (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_hotels          INT         NOT NULL DEFAULT 0,
      total_flights         INT         NOT NULL DEFAULT 0,
      total_cars            INT         NOT NULL DEFAULT 0,
      inventory_health      TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      hotel_insights        JSONB       NOT NULL DEFAULT '[]',
      flight_insights       JSONB       NOT NULL DEFAULT '[]',
      car_insights          JSONB       NOT NULL DEFAULT '[]',
      coverage_gaps         JSONB       NOT NULL DEFAULT '[]',
      pricing_flags         TEXT[]      NOT NULL DEFAULT '{}',
      hajj_umrah_readiness  TEXT,
      quick_wins            TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-inventory-advisor] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_inventory_advice WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Hotels summary
    const hotels = await pool.query(`
      SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE is_active)                            AS active,
        COUNT(*) FILTER (WHERE is_hajj_package)                      AS hajj,
        COUNT(*) FILTER (WHERE is_umrah_package)                     AS umrah,
        COUNT(*) FILTER (WHERE is_halal_friendly)                    AS halal,
        AVG(price_per_night) FILTER (WHERE is_active)                AS avg_price,
        MIN(price_per_night) FILTER (WHERE is_active)                AS min_price,
        MAX(price_per_night) FILTER (WHERE is_active)                AS max_price,
        COUNT(DISTINCT location)                                     AS locations
      FROM inventory_hotels
    `).catch(() => ({ rows: [{}] }));

    // Hotel location breakdown
    const hotelLocs = await pool.query(`
      SELECT location,
             COUNT(*) AS count,
             COUNT(*) FILTER (WHERE is_active) AS active,
             AVG(price_per_night) AS avg_price,
             COUNT(*) FILTER (WHERE is_hajj_package) AS hajj,
             COUNT(*) FILTER (WHERE is_umrah_package) AS umrah
      FROM inventory_hotels
      GROUP BY location ORDER BY count DESC LIMIT 20
    `).catch(() => ({ rows: [] }));

    // Flights summary
    const flights = await pool.query(`
      SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE is_active)                            AS active,
        COUNT(DISTINCT airline_code)                                 AS airlines,
        COUNT(DISTINCT origin || '-' || dest)                        AS routes,
        AVG(price) FILTER (WHERE is_active)                          AS avg_price,
        SUM(seats_available) FILTER (WHERE is_active)                AS total_seats
      FROM inventory_flights
    `).catch(() => ({ rows: [{}] }));

    // Flight routes to/from key hubs
    const routes = await pool.query(`
      SELECT origin, dest, airline_code,
             COUNT(*) AS flights,
             AVG(price) AS avg_price,
             SUM(seats_available) AS seats
      FROM inventory_flights
      WHERE is_active = true
      GROUP BY origin, dest, airline_code
      ORDER BY flights DESC LIMIT 20
    `).catch(() => ({ rows: [] }));

    // Cars summary
    const cars = await pool.query(`
      SELECT
        COUNT(*)                              AS total,
        COUNT(*) FILTER (WHERE is_active)    AS active,
        COUNT(DISTINCT vendor_name)          AS vendors,
        COUNT(DISTINCT pickup_location)      AS locations,
        AVG(price_per_day) FILTER (WHERE is_active) AS avg_price
      FROM inventory_cars
    `).catch(() => ({ rows: [{}] }));

    const h = hotels.rows[0] ?? {};
    const fl = flights.rows[0] ?? {};
    const c = cars.rows[0] ?? {};

    const prompt = `You are an AI Inventory Advisor for UTUBooking.com (Gulf travel platform). Analyse the hotel, flight, and car rental inventory and provide gap analysis and strategic recommendations.

Hotel Inventory:
- Total: ${h.total} | Active: ${h.active} | Locations: ${h.locations}
- Hajj packages: ${h.hajj} | Umrah packages: ${h.umrah} | Halal-friendly: ${h.halal}
- Price range: SAR ${Math.round(parseFloat(h.min_price||0))} - SAR ${Math.round(parseFloat(h.max_price||0))} | Avg: SAR ${Math.round(parseFloat(h.avg_price||0))}/night

Hotel Location Breakdown:
${JSON.stringify(hotelLocs.rows.map(r => ({
  location: r.location,
  total: parseInt(r.count), active: parseInt(r.active),
  avg_price_sar: Math.round(parseFloat(r.avg_price||0)),
  hajj: parseInt(r.hajj), umrah: parseInt(r.umrah),
})))}

Flight Inventory:
- Total flights: ${fl.total} | Active: ${fl.active}
- Airlines: ${fl.airlines} | Routes: ${fl.routes}
- Avg price: SAR ${Math.round(parseFloat(fl.avg_price||0))} | Total seats available: ${fl.total_seats}

Top Routes:
${JSON.stringify(routes.rows.map(r => ({
  route: `${r.origin}-${r.dest}`, airline: r.airline_code,
  flights: parseInt(r.flights), avg_price: Math.round(parseFloat(r.avg_price||0)),
  seats: parseInt(r.seats),
})))}

Car Rental Inventory:
- Total: ${c.total} | Active: ${c.active}
- Vendors: ${c.vendors} | Pickup locations: ${c.locations}
- Avg price: SAR ${Math.round(parseFloat(c.avg_price||0))}/day

Context:
- Critical hotels: Makkah (within 500m of Haram) and Madinah (within 1km of Prophet's Mosque)
- Hajj season (Dhul Hijjah 1-10) and Umrah year-round — Makkah/Madinah inventory is the core product
- Key flight hubs: JED (Jeddah), RUH (Riyadh), MED (Madinah), DMM (Dammam)
- Competitors stock 50+ Makkah hotels; <10 Makkah hotels = critical gap
- Car rental in Makkah during Hajj/Umrah = premium product
- Halal-friendly flag is a key differentiator for Muslim travelers

Respond with ONLY a JSON object (no markdown fences):
{
  "inventory_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence COO-level inventory summary",
  "hotel_insights": [
    { "finding": "...", "priority": "critical|high|medium", "action": "..." }
  ],
  "flight_insights": [
    { "finding": "...", "priority": "critical|high|medium", "action": "..." }
  ],
  "car_insights": [
    { "finding": "...", "priority": "high|medium|low", "action": "..." }
  ],
  "coverage_gaps": [
    { "gap": "...", "location_or_route": "...", "impact": "...", "fix": "..." }
  ],
  "pricing_flags": ["flag 1", "flag 2"],
  "hajj_umrah_readiness": "paragraph on Hajj/Umrah season inventory readiness",
  "quick_wins": ["win 1", "win 2", "win 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"]
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].text
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const ai = JSON.parse(raw);

    await pool.query(`
      INSERT INTO ai_inventory_advice
        (snapshot_key, total_hotels, total_flights, total_cars, inventory_health,
         executive_summary, hotel_insights, flight_insights, car_insights,
         coverage_gaps, pricing_flags, hajj_umrah_readiness, quick_wins, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_hotels         = EXCLUDED.total_hotels,
        total_flights        = EXCLUDED.total_flights,
        total_cars           = EXCLUDED.total_cars,
        inventory_health     = EXCLUDED.inventory_health,
        executive_summary    = EXCLUDED.executive_summary,
        hotel_insights       = EXCLUDED.hotel_insights,
        flight_insights      = EXCLUDED.flight_insights,
        car_insights         = EXCLUDED.car_insights,
        coverage_gaps        = EXCLUDED.coverage_gaps,
        pricing_flags        = EXCLUDED.pricing_flags,
        hajj_umrah_readiness = EXCLUDED.hajj_umrah_readiness,
        quick_wins           = EXCLUDED.quick_wins,
        recommendations      = EXCLUDED.recommendations,
        generated_at         = NOW()
    `, [
      'latest',
      parseInt(h.total||0), parseInt(fl.total||0), parseInt(c.total||0),
      ai.inventory_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.hotel_insights ?? []),
      JSON.stringify(ai.flight_insights ?? []),
      JSON.stringify(ai.car_insights ?? []),
      JSON.stringify(ai.coverage_gaps ?? []),
      ai.pricing_flags ?? [],
      ai.hajj_umrah_readiness ?? null,
      ai.quick_wins ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_inventory_advice WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-inventory-advisor] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
