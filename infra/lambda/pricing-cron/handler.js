'use strict';

const axios = require('axios');

/**
 * Lambda function — invoked every 6 hours by EventBridge ScheduledRule.
 *
 * Calls the pricing service internal cron endpoint which:
 *   1. Runs demand forecasting for all active Makkah/Madinah hotels
 *   2. Generates AI pricing recommendations (stored as 'pending' for admin review)
 *   3. Sends push alerts to gold/platinum loyalty users if demand > 80%
 *
 * Environment variables (set via SSM / Lambda env config):
 *   PRICING_SERVICE_URL   — e.g. http://pricing-service.utu.internal (private VPC URL)
 *   INTERNAL_API_SECRET   — shared secret checked by pricing service
 */
exports.handler = async (event) => {
  const pricingUrl    = process.env.PRICING_SERVICE_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!pricingUrl || !internalSecret) {
    const msg = '[pricing-cron] Missing PRICING_SERVICE_URL or INTERNAL_API_SECRET';
    console.error(msg);
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }

  console.info('[pricing-cron] Starting 6-hour pricing cycle');

  try {
    const response = await axios.post(
      `${pricingUrl}/api/v1/pricing/internal/cron`,
      {},
      {
        headers: {
          'x-internal-secret': internalSecret,
          'Content-Type':      'application/json',
        },
        timeout: 120000, // 2 min — hotel list can be large during Hajj
      },
    );

    console.info(`[pricing-cron] Completed: ${response.data.processed} hotels processed`);

    return {
      statusCode: 200,
      body:       JSON.stringify(response.data),
    };
  } catch (err) {
    const errBody = {
      error:   err.message,
      status:  err.response?.status,
      details: err.response?.data,
    };
    console.error('[pricing-cron] Failed:', errBody);
    return {
      statusCode: err.response?.status ?? 500,
      body:       JSON.stringify(errBody),
    };
  }
};
