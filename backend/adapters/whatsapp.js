/**
 * WhatsApp Business Cloud API Gateway
 *
 * Wraps Meta's WhatsApp Cloud API for:
 *   1. Sending pre-approved template messages (booking confirmations, Ramadan greetings,
 *      Umrah season alerts) to opted-in Brazilian users.
 *   2. Broadcasting to the BR Ramadan/Umrah subscriber list stored in Redis.
 *   3. Webhook verification + inbound message handling.
 *
 * Compliance:
 *   - WhatsApp policies require explicit opt-in before messaging any user.
 *   - Opt-in is stored in Redis as `wa:sub:BR:{userId}` (phone + consent timestamp).
 *   - LGPD Art. 7 consent is logged to consent_log via POST /api/compliance/consent.
 *   - Subscriber list key: `wa:broadcast:BR` (Redis SET of phone numbers).
 *
 * Auth: Permanent system-user token (META_WHATSAPP_TOKEN).
 * API version: v18.0 (pin this — do not use "latest").
 *
 * Env vars:
 *   META_WHATSAPP_TOKEN          — permanent system user token from Meta Business Suite
 *   WHATSAPP_PHONE_NUMBER_ID     — Business phone number ID (not the display number)
 *   WHATSAPP_VERIFY_TOKEN        — arbitrary string for webhook verification (choose once)
 *   REDIS_URL
 *
 * Template pre-approval:
 *   All templates below must be submitted to and approved by Meta before use.
 *   Template manager: business.facebook.com → WhatsApp → Message Templates
 *   Language code: pt_BR (Brazilian Portuguese)
 *
 * Rate limits: Tier 1 = 1,000 unique user conversations / 24 h.
 *              Scale to Tier 2/3 by maintaining good quality rating.
 */

'use strict';

require('dotenv').config();
const axios = require('axios');
const Redis = require('ioredis');

const API_VERSION     = 'v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
const BASE_URL        = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

// Redis subscriber list keys
const BR_BROADCAST_KEY = 'wa:broadcast:BR';  // Redis SET of phone numbers (E.164 format)
const SUB_TTL          = 365 * 24 * 3600;   // 1 year — re-consent annually

// ─── Redis ─────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect:          true,
  maxRetriesPerRequest: 1,
});
redis.on('error', (err) => console.warn('[whatsapp] Redis error:', err.message));

// ─── Auth header ───────────────────────────────────────────────────────────────

function _authHeaders() {
  return {
    Authorization:  `Bearer ${process.env.META_WHATSAPP_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

// ─── Template definitions ─────────────────────────────────────────────────────

/**
 * Pre-approved WhatsApp message templates for the Brazilian market (pt_BR).
 *
 * Placeholders use the {{1}}, {{2}} … syntax required by Meta's template system.
 * The `params` array maps to placeholder positions in order.
 *
 * All templates require prior approval from Meta — do not use unapproved names.
 */
const TEMPLATES = {
  /**
   * Booking confirmation sent after payment completes.
   * Template name: utu_booking_confirmed_ptbr
   * Body: "Assalamu Alaykum {{1}}! Sua reserva UTUBooking está confirmada.
   *        Referência: {{2}}. Hotel: {{3}}, Meca. Check-in: {{4}}.
   *        Que Allah aceite seu Umrah. 🕌"
   */
  booking_confirmed: {
    name:     'utu_booking_confirmed_ptbr',
    language: 'pt_BR',
    params:   ['firstName', 'ref', 'hotelName', 'checkIn'],
  },

  /**
   * Ramadan greeting + Umrah season promotion.
   * Template name: utu_ramadan_umrah_ptbr
   * Body: "Ramadan Mubarak, {{1}}! 🌙 Esta é a época mais abençoada para realizar
   *        o Umrah. Hotéis próximos ao Haram a partir de R$ {{2}}/noite.
   *        Reserve agora em utubooking.com"
   */
  ramadan_greeting: {
    name:     'utu_ramadan_umrah_ptbr',
    language: 'pt_BR',
    params:   ['firstName', 'startingPrice'],
  },

  /**
   * Umrah season alert — price drop for hotels near Haram.
   * Template name: utu_preco_umrah_ptbr
   * Body: "Alerta de preço! {{1}}, hotéis perto do Haram caíram para
   *        R$ {{2}}/noite 🕌 Disponibilidade limitada para {{3}}.
   *        utubooking.com"
   */
  price_alert: {
    name:     'utu_preco_umrah_ptbr',
    language: 'pt_BR',
    params:   ['firstName', 'price', 'month'],
  },

  /**
   * Check-in reminder sent 24 hours before arrival.
   * Template name: utu_checkin_amanha_ptbr
   * Body: "Lembrança de check-in, {{1}}! Sua estadia em {{2}} começa amanhã.
   *        Que Allah facilite sua jornada. 🤲"
   */
  checkin_reminder: {
    name:     'utu_checkin_amanha_ptbr',
    language: 'pt_BR',
    params:   ['firstName', 'hotelName'],
  },
};

// ─── sendTemplate ─────────────────────────────────────────────────────────────

/**
 * Send a pre-approved template message to a single recipient.
 *
 * @param {string}   to           Recipient phone number in E.164 format (e.g. '+5511999998888')
 * @param {string}   templateKey  Key from TEMPLATES (e.g. 'booking_confirmed')
 * @param {object}   vars         Placeholder values keyed by param name
 *                                (e.g. { firstName: 'Ahmad', ref: 'UTU-20260325-ABCD' })
 * @returns {Promise<{ messageId: string }>}
 * @throws  {WhatsAppError}
 */
async function sendTemplate(to, templateKey, vars = {}) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new WhatsAppError(`Unknown template key: ${templateKey}`, 400);

  // Build parameter components in order
  const parameters = tmpl.params.map((key) => ({
    type: 'text',
    text: String(vars[key] ?? ''),
  }));

  const body = {
    messaging_product: 'whatsapp',
    to:                to.replace(/\s+/g, ''),
    type:              'template',
    template: {
      name:     tmpl.name,
      language: { code: tmpl.language },
      components: parameters.length > 0 ? [
        {
          type:       'body',
          parameters,
        },
      ] : [],
    },
  };

  let res;
  try {
    res = await axios.post(`${BASE_URL}/messages`, body, {
      headers: _authHeaders(),
      timeout: 10000,
    });
  } catch (err) {
    const status  = err.response?.status ?? 502;
    const message = err.response?.data?.error?.message ?? err.message;
    throw new WhatsAppError(`WhatsApp send failed (${status}): ${message}`, status);
  }

  const messageId = res.data?.messages?.[0]?.id ?? res.data?.message_id ?? 'unknown';
  return { messageId };
}

// ─── Subscriber management ────────────────────────────────────────────────────

/**
 * Register an opt-in for WhatsApp marketing messages (Brazil).
 * Stores the phone number in the BR broadcast Redis SET.
 *
 * Called by the subscribe API route after LGPD consent is recorded.
 *
 * @param {string} phone   E.164 phone number (e.g. '+5511999998888')
 * @param {string} userId  UTUBooking user ID (for opt-out linkage)
 */
async function subscribe(phone, userId) {
  const e164 = _normalisePhone(phone);
  await redis.sadd(BR_BROADCAST_KEY, e164);
  await redis.setex(`wa:sub:BR:${userId}`, SUB_TTL, JSON.stringify({
    phone:       e164,
    subscribedAt: new Date().toISOString(),
    userId,
  }));
}

/**
 * Remove an opt-out from the BR broadcast list.
 * Called by the unsubscribe API route.
 *
 * @param {string} phone   E.164 phone number
 * @param {string} userId  UTUBooking user ID
 */
async function unsubscribe(phone, userId) {
  const e164 = _normalisePhone(phone);
  await redis.srem(BR_BROADCAST_KEY, e164);
  await redis.del(`wa:sub:BR:${userId}`);
}

/**
 * Check if a user has opted in to WhatsApp marketing.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isSubscribed(userId) {
  const sub = await redis.get(`wa:sub:BR:${userId}`);
  return sub !== null;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

/**
 * Send a broadcast template to all opted-in BR subscribers.
 *
 * WhatsApp policies require:
 *   - User has explicitly opted in.
 *   - Template is pre-approved by Meta.
 *   - Do not send more than 2 promotional messages per week.
 *
 * Rate-limited internally: batches of 50 messages, 1 s delay between batches.
 *
 * @param {string}  templateKey   Key from TEMPLATES
 * @param {object}  sharedVars    Vars shared across all recipients
 *                                (personalised vars like firstName are skipped if absent)
 * @param {object}  [opts]
 * @param {number}  [opts.batchSize]   default 50
 * @param {number}  [opts.delayMs]     default 1000 ms between batches
 * @returns {Promise<{ sent: number; failed: number; errors: string[] }>}
 */
async function broadcastBR(templateKey, sharedVars = {}, opts = {}) {
  const { batchSize = 50, delayMs = 1000 } = opts;

  const phones = await redis.smembers(BR_BROADCAST_KEY);
  if (!phones.length) return { sent: 0, failed: 0, errors: [] };

  let sent = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < phones.length; i += batchSize) {
    const batch = phones.slice(i, i + batchSize);
    await Promise.all(batch.map(async (phone) => {
      try {
        await sendTemplate(phone, templateKey, sharedVars);
        sent++;
      } catch (err) {
        failed++;
        errors.push(`${phone}: ${err.message}`);
      }
    }));

    if (i + batchSize < phones.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  console.log(`[whatsapp] broadcast ${templateKey}: sent=${sent} failed=${failed} total=${phones.length}`);
  return { sent, failed, errors };
}

// ─── Webhook verification ─────────────────────────────────────────────────────

/**
 * Handles GET /api/whatsapp/webhook — Meta's hub.challenge verification handshake.
 *
 * @param {string} mode        query param 'hub.mode'
 * @param {string} token       query param 'hub.verify_token'
 * @param {string} challenge   query param 'hub.challenge'
 * @returns {{ valid: boolean; challenge?: string }}
 */
function verifyWebhook(mode, token, challenge) {
  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN ?? '')) {
    return { valid: true, challenge };
  }
  return { valid: false };
}

/**
 * Process an inbound WhatsApp webhook event (POST /api/whatsapp/webhook).
 * Handles opt-out via keyword messages ("PARAR", "STOP", "CANCELAR").
 *
 * @param {object} payload   Parsed webhook JSON body from Meta
 * @returns {Promise<void>}
 */
async function handleWebhook(payload) {
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    for (const change of (entry.changes ?? [])) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        const phone = msg.from;  // E.164 format
        const text  = (msg.text?.body ?? '').trim().toUpperCase();

        // LGPD-compliant opt-out: honour STOP/PARAR keywords immediately
        if (['STOP', 'PARAR', 'CANCELAR', 'SAIR', '0'].includes(text)) {
          await redis.srem(BR_BROADCAST_KEY, _normalisePhone(phone));
          console.log(`[whatsapp] opt-out received from ${phone}`);
        }
      }
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise a phone number to E.164 format.
 * Ensures Brazilian numbers have the +55 country code prefix.
 *
 * @param {string} phone
 * @returns {string}
 */
function _normalisePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  return `+${digits}`;
}

// ─── Error type ───────────────────────────────────────────────────────────────

class WhatsAppError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name       = 'WhatsAppError';
    this.statusCode = statusCode;
    this.status     = statusCode;
  }
}

module.exports = {
  sendTemplate,
  subscribe,
  unsubscribe,
  isSubscribed,
  broadcastBR,
  verifyWebhook,
  handleWebhook,
  TEMPLATES,
  WhatsAppError,
  _normalisePhone, // exported for unit tests
};
