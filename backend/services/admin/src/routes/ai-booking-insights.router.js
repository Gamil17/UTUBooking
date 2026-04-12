'use strict';
const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const router = express.Router();
const client = new Anthropic.default();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

async function bootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_booking_insights (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_key          TEXT        NOT NULL UNIQUE DEFAULT 'latest',
      total_bookings        INT         NOT NULL DEFAULT 0,
      revenue_sar           NUMERIC(16,2) NOT NULL DEFAULT 0,
      cancellation_rate_pct INT         NOT NULL DEFAULT 0,
      booking_health        TEXT        NOT NULL DEFAULT 'fair',
      executive_summary     TEXT        NOT NULL,
      anomalies             JSONB       NOT NULL DEFAULT '[]',
      product_breakdown     JSONB       NOT NULL DEFAULT '[]',
      conversion_insights   TEXT,
      cancellation_patterns TEXT,
      revenue_opportunities JSONB       NOT NULL DEFAULT '[]',
      seasonal_forecast     TEXT,
      risk_flags            TEXT[]      NOT NULL DEFAULT '{}',
      recommendations       TEXT[]      NOT NULL DEFAULT '{}',
      generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
bootstrap().catch(e => console.error('[ai-booking-insights] bootstrap error:', e.message));

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ai_booking_insights WHERE snapshot_key = 'latest'`);
    if (!r.rows.length) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json({ data: r.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

router.post('/', async (_req, res) => {
  try {
    // Booking stats by status & type (last 90 days)
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                                          AS total,
        COUNT(*) FILTER (WHERE status = 'confirmed')                     AS confirmed,
        COUNT(*) FILTER (WHERE status = 'pending')                       AS pending,
        COUNT(*) FILTER (WHERE status = 'cancelled')                     AS cancelled,
        COUNT(*) FILTER (WHERE status = 'refunded')                      AS refunded,
        COUNT(*) FILTER (WHERE product_type = 'hotel')                   AS hotels,
        COUNT(*) FILTER (WHERE product_type = 'flight')                  AS flights,
        COUNT(*) FILTER (WHERE product_type = 'car')                     AS cars,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'confirmed'), 0)   AS confirmed_revenue,
        COALESCE(SUM(total_price), 0)                                    AS gross_revenue,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'cancelled') / NULLIF(COUNT(*),0)) AS cancel_pct,
        AVG(total_price) FILTER (WHERE status = 'confirmed')             AS avg_booking_value
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '90 days'
    `).catch(() => ({ rows: [{}] }));

    // Daily trend (last 30 days)
    const trend = await pool.query(`
      SELECT DATE_TRUNC('day', created_at)::date AS day,
             COUNT(*) AS bookings,
             COALESCE(SUM(total_price) FILTER (WHERE status='confirmed'),0) AS revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `).catch(() => ({ rows: [] }));

    // Product breakdown
    const byProduct = await pool.query(`
      SELECT product_type,
             COUNT(*) AS bookings,
             COUNT(*) FILTER (WHERE status='confirmed') AS confirmed,
             COUNT(*) FILTER (WHERE status='cancelled') AS cancelled,
             COALESCE(SUM(total_price) FILTER (WHERE status='confirmed'),0) AS revenue,
             AVG(total_price) FILTER (WHERE status='confirmed') AS avg_value
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY product_type
    `).catch(() => ({ rows: [] }));

    // Payment method breakdown
    const byPayment = await pool.query(`
      SELECT payment_method,
             COUNT(*) AS bookings,
             ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (),0)) AS pct
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '90 days'
        AND payment_method IS NOT NULL
      GROUP BY payment_method ORDER BY bookings DESC LIMIT 10
    `).catch(() => ({ rows: [] }));

    // Currency breakdown
    const byCurrency = await pool.query(`
      SELECT currency, COUNT(*) AS bookings,
             COALESCE(SUM(total_price) FILTER (WHERE status='confirmed'),0) AS revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY currency ORDER BY bookings DESC LIMIT 8
    `).catch(() => ({ rows: [] }));

    const s = stats.rows[0] ?? {};
    const total    = parseInt(s.total || 0);
    const cancelPct = parseInt(s.cancel_pct || 0);
    const confirmedRevenue = parseFloat(s.confirmed_revenue || 0);

    const prompt = `You are an AI Revenue & Bookings Insights Advisor for UTUBooking.com (Gulf travel platform — hotels, flights, car rentals). Analyse booking data and surface actionable revenue intelligence.

Booking Summary (last 90 days):
- Total bookings: ${total}
- Confirmed: ${s.confirmed} | Pending: ${s.pending} | Cancelled: ${s.cancelled} | Refunded: ${s.refunded}
- Hotels: ${s.hotels} | Flights: ${s.flights} | Cars: ${s.cars}
- Confirmed revenue: SAR ${parseFloat(s.confirmed_revenue||0).toLocaleString()}
- Gross value: SAR ${parseFloat(s.gross_revenue||0).toLocaleString()}
- Cancellation rate: ${cancelPct}%
- Avg booking value (confirmed): SAR ${Math.round(parseFloat(s.avg_booking_value||0)).toLocaleString()}

Daily Trend (last 30 days, ${trend.rows.length} days):
${JSON.stringify(trend.rows.map(r => ({ day: r.day, bookings: r.bookings, revenue: Math.round(parseFloat(r.revenue)) })))}

Product Breakdown:
${JSON.stringify(byProduct.rows.map(r => ({
  type: r.product_type,
  bookings: r.bookings, confirmed: r.confirmed, cancelled: r.cancelled,
  revenue_sar: Math.round(parseFloat(r.revenue)),
  avg_value: Math.round(parseFloat(r.avg_value || 0)),
})))}

Payment Methods:
${JSON.stringify(byPayment.rows)}

Currency Mix:
${JSON.stringify(byCurrency.rows.map(r => ({ currency: r.currency, bookings: r.bookings, revenue: Math.round(parseFloat(r.revenue)) })))}

Context:
- Primary market: Saudi Arabia (SAR). SAR dominance should be >60% of revenue.
- Hajj season (Dhul Hijjah) and Umrah surges are revenue peaks — patterns should reflect this.
- Cancellation rate benchmarks: <10% excellent, 10-20% normal, >20% concerning, >30% critical.
- Hotels are the highest margin product; flights are volume drivers.
- Gulf travelers book 2-3 weeks in advance for leisure, 1 week for business.
- Missing payment methods: Mada (Saudi), STC Pay, Apple Pay are key for SA market.

Respond with ONLY a JSON object (no markdown fences):
{
  "booking_health": "excellent|good|fair|poor",
  "executive_summary": "2-3 sentence revenue intelligence summary",
  "anomalies": [
    { "type": "spike|drop|pattern", "description": "...", "severity": "high|medium|low", "likely_cause": "..." }
  ],
  "product_breakdown": [
    { "product": "hotel|flight|car", "assessment": "...", "opportunity": "..." }
  ],
  "conversion_insights": "paragraph on booking conversion patterns and gaps",
  "cancellation_patterns": "paragraph on cancellation drivers and mitigation",
  "revenue_opportunities": [
    { "opportunity": "...", "estimated_impact": "...", "effort": "low|medium|high" }
  ],
  "seasonal_forecast": "paragraph on upcoming seasonal patterns and recommended prep",
  "risk_flags": ["flag 1", "flag 2"],
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
      INSERT INTO ai_booking_insights
        (snapshot_key, total_bookings, revenue_sar, cancellation_rate_pct,
         booking_health, executive_summary, anomalies, product_breakdown,
         conversion_insights, cancellation_patterns, revenue_opportunities,
         seasonal_forecast, risk_flags, recommendations, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      ON CONFLICT (snapshot_key) DO UPDATE SET
        total_bookings       = EXCLUDED.total_bookings,
        revenue_sar          = EXCLUDED.revenue_sar,
        cancellation_rate_pct = EXCLUDED.cancellation_rate_pct,
        booking_health       = EXCLUDED.booking_health,
        executive_summary    = EXCLUDED.executive_summary,
        anomalies            = EXCLUDED.anomalies,
        product_breakdown    = EXCLUDED.product_breakdown,
        conversion_insights  = EXCLUDED.conversion_insights,
        cancellation_patterns = EXCLUDED.cancellation_patterns,
        revenue_opportunities = EXCLUDED.revenue_opportunities,
        seasonal_forecast    = EXCLUDED.seasonal_forecast,
        risk_flags           = EXCLUDED.risk_flags,
        recommendations      = EXCLUDED.recommendations,
        generated_at         = NOW()
    `, [
      'latest', total, confirmedRevenue, cancelPct,
      ai.booking_health ?? 'fair',
      ai.executive_summary ?? '',
      JSON.stringify(ai.anomalies ?? []),
      JSON.stringify(ai.product_breakdown ?? []),
      ai.conversion_insights ?? null,
      ai.cancellation_patterns ?? null,
      JSON.stringify(ai.revenue_opportunities ?? []),
      ai.seasonal_forecast ?? null,
      ai.risk_flags ?? [],
      ai.recommendations ?? [],
    ]);

    const saved = await pool.query(`SELECT * FROM ai_booking_insights WHERE snapshot_key = 'latest'`);
    return res.json({ data: saved.rows[0] });
  } catch (err) {
    console.error('[ai-booking-insights] error:', err.message);
    return res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
});

module.exports = router;
