'use strict';

/**
 * WhatsApp Opt-In / Opt-Out Router — auth service
 * Mounted at: /api/v1/whatsapp (via app.js)
 *
 * Routes:
 *   POST   /subscribe    — opt in to WhatsApp marketing (Brazil, LGPD-gated)
 *   DELETE /subscribe    — opt out of WhatsApp marketing
 *   POST   /webhook      — inbound Meta event (delivery receipts, opt-outs)
 *
 * Auth model:
 *   All routes require x-internal-secret (service-to-service from Next.js BFF).
 *   subscribe/unsubscribe also require a valid JWT Bearer token to identify the user.
 *
 * Redis keys (Brazilian WhatsApp broadcast list):
 *   wa:broadcast:BR          — SADD / SREM the user's phone number
 *   wa:sub:BR:{userId}       — SET the user's subscribed phone (or DEL on opt-out)
 *
 * Consent logging:
 *   All opt-in / opt-out events are appended to consent_log table in the BR shard.
 *   Consent records are IMMUTABLE — opt-out is a new row (granted=false).
 */

const { Router }          = require('express');
const { timingSafeEqual } = require('crypto');
const jwt                 = require('jsonwebtoken');
const { getShardPool }    = require('../../../../shared/shard-router');
const redis               = require('../services/redis.service');

const router = Router();

function safeEqual(a, b) {
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

// ── Internal secret guard ──────────────────────────────────────────────────────

function requireInternalSecret(req, res, next) {
  const secret   = process.env.INTERNAL_API_SECRET ?? '';
  const provided = req.headers['x-internal-secret'] ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid internal secret.' });
  }
  next();
}

// ── JWT extraction (non-blocking — userId may be null for webhook events) ──────

function extractUser(req, _res, next) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id:          payload.sub ?? payload.id,
        email:       payload.email,
        countryCode: payload.countryCode ?? payload.country ?? 'BR',
      };
    } catch { /* invalid/expired token — req.user stays undefined */ }
  }
  next();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function brPool() { return getShardPool('BR').pool; }

async function _logConsent({ userId, phoneNumber, type, granted, ip }) {
  try {
    await brPool().query(
      `INSERT INTO consent_log
         (user_id, type, law, granted, ip_address, phone_number, created_at)
       VALUES ($1, $2, 'LGPD', $3, $4, $5, NOW())`,
      [userId || null, type, granted, ip || null, phoneNumber || null],
    );
  } catch (err) {
    console.warn('[whatsapp-router] consent_log write failed:', err.message);
  }
}

// ── POST /api/v1/whatsapp/subscribe ───────────────────────────────────────────

router.post('/subscribe', requireInternalSecret, extractUser, async (req, res, next) => {
  try {
    const { phone, lgpdConsent } = req.body ?? {};
    const userId = req.user?.id ?? null;

    if (!phone) {
      return res.status(400).json({ error: 'MISSING_PHONE', message: 'phone is required.' });
    }
    if (!lgpdConsent) {
      return res.status(422).json({
        error: 'LGPD_CONSENT_REQUIRED',
        message: 'LGPD consent is required to subscribe to WhatsApp messages.',
      });
    }

    // Normalise phone to E.164
    const e164 = phone.replace(/\s+/g, '');
    if (!/^\+?[1-9]\d{9,14}$/.test(e164)) {
      return res.status(400).json({ error: 'INVALID_PHONE', message: 'Invalid E.164 phone number.' });
    }

    // Add to broadcast set and per-user key
    try {
      const client = require('../../../../shared/redis-cluster');
      await client.sadd('wa:broadcast:BR', e164);
      if (userId) {
        await client.set(`wa:sub:BR:${userId}`, e164);
      }
    } catch (err) {
      console.warn('[whatsapp-subscribe] Redis write failed:', err.message);
      // Non-fatal — proceed and log consent anyway
    }

    // Log LGPD consent
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? null;
    await _logConsent({
      userId,
      phoneNumber: e164,
      type:        'marketing_whatsapp',
      granted:     true,
      ip,
    });

    return res.json({ ok: true, subscribed: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/v1/whatsapp/subscribe ─────────────────────────────────────────

router.delete('/subscribe', requireInternalSecret, extractUser, async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    const userId    = req.user?.id ?? null;

    // Remove from broadcast set
    try {
      const client = require('../../../../shared/redis-cluster');
      if (phone) {
        await client.srem('wa:broadcast:BR', phone.replace(/\s+/g, ''));
      }
      if (userId) {
        const storedPhone = await client.get(`wa:sub:BR:${userId}`);
        if (storedPhone) await client.srem('wa:broadcast:BR', storedPhone);
        await client.del(`wa:sub:BR:${userId}`);
      }
    } catch (err) {
      console.warn('[whatsapp-unsubscribe] Redis write failed:', err.message);
    }

    // Log LGPD consent withdrawal (append-only — new row with granted=false)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? null;
    await _logConsent({
      userId,
      phoneNumber: phone?.replace(/\s+/g, '') ?? null,
      type:        'marketing_whatsapp',
      granted:     false,
      ip,
    });

    return res.json({ ok: true, subscribed: false });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/whatsapp/webhook ─────────────────────────────────────────────
// Inbound Meta events forwarded from the Next.js BFF.
// Signature already verified by the BFF before forwarding.

router.post('/webhook', requireInternalSecret, async (req, res, next) => {
  try {
    const payload = req.body;
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const messages  = change.value?.messages ?? [];
        const statuses  = change.value?.statuses ?? [];

        // Handle inbound opt-out messages (user texts "STOP")
        for (const msg of messages) {
          const body = (msg.text?.body ?? '').trim().toUpperCase();
          if (body === 'STOP' || body === 'CANCELAR' || body === 'PARAR') {
            const phone = msg.from;
            try {
              const client = require('../../../../shared/redis-cluster');
              await client.srem('wa:broadcast:BR', phone);
            } catch { /* non-fatal */ }
            await _logConsent({
              userId:      null,
              phoneNumber: phone,
              type:        'marketing_whatsapp',
              granted:     false,
              ip:          null,
            });
          }
        }

        // Log delivery receipts (future analytics)
        for (const status of statuses) {
          console.info('[whatsapp-webhook] delivery status:', status.status, 'id:', status.id);
        }
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
