'use strict';

/**
 * Platform settings reader for the notification service.
 * Reads from Redis key `settings:platform` (written by the admin UI BFF).
 * Caches in-process for 60 seconds to avoid Redis round-trips on every job tick.
 * Falls back to hardcoded defaults if Redis is unavailable.
 */

const Redis = require('ioredis');

const REDIS_KEY = 'settings:platform';
const CACHE_TTL = 60_000; // 1 minute

const DEFAULTS = {
  notifications: {
    recovery_delay_hours:    2,
    reminder_hours_before:   24,
    max_recovery_attempts:   3,
    price_alert_threshold:   10,  // percent
  },
};

let _cache  = null;
let _cacheAt = 0;

let _client;
function getClient() {
  if (!_client) {
    _client = new Redis({
      host:        process.env.REDIS_HOST      || 'redis',
      port:        parseInt(process.env.REDIS_PORT || '6379', 10),
      password:    process.env.REDIS_AUTH_TOKEN || undefined,
      lazyConnect: true,
    });
    _client.on('error', () => {}); // suppress unhandled rejection noise
  }
  return _client;
}

/**
 * Returns merged notification settings with defaults as fallback.
 * Cached in memory for 60 s.
 */
async function getNotificationSettings() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
    return _cache.notifications;
  }
  try {
    const raw    = await getClient().get(REDIS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    _cache = {
      notifications: { ...DEFAULTS.notifications, ...(parsed.notifications ?? {}) },
    };
    _cacheAt = Date.now();
    return _cache.notifications;
  } catch {
    // Redis unavailable — return defaults so jobs continue running
    return DEFAULTS.notifications;
  }
}

module.exports = { getNotificationSettings };
