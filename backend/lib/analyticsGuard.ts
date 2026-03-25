/**
 * analyticsGuard — CCPA analytics anonymization for opted-out California users
 *
 * Wrap any analytics event before logging to ensure opted-out CA users
 * are anonymised per CCPA §1798.120 (no sale/sharing of personal data).
 *
 * Usage:
 *   const event = anonymizeIfOptedOut(rawEvent, isOptedOut);
 *   await analytics.track(event);
 */

export interface AnalyticsEvent {
  userId?:   string;
  email?:    string;
  ip?:       string;
  sessionId?: string;
  // Any additional event properties
  [key: string]: unknown;
}

/**
 * Strips or hashes personally-identifiable fields from an analytics event
 * when the user has opted out of CCPA data sale/sharing.
 *
 * Retained (non-PII, needed for analytics):
 *   - event name / type
 *   - timestamp
 *   - page / route
 *   - countryCode (coarse — state/country level, not city)
 *
 * Removed (PII):
 *   - userId → replaced with 'anon'
 *   - email  → removed
 *   - ip     → replaced with '0.0.0.0'
 *   - sessionId → removed
 */
export function anonymizeIfOptedOut(
  event:     AnalyticsEvent,
  optedOut:  boolean,
): AnalyticsEvent {
  if (!optedOut) return event;

  const { userId: _userId, email: _email, ip: _ip, sessionId: _sid, ...rest } = event;

  return {
    ...rest,
    userId:    'anon',
    ip:        '0.0.0.0',
    // Keep coarse geo but remove session linkability
  };
}

/**
 * Middleware-style helper for Express analytics routes.
 * Attaches `req.analyticsOptedOut` for downstream handlers.
 *
 * Usage:
 *   router.post('/track', attachCcpaStatus(redis), trackHandler);
 */
import { Request, Response, NextFunction } from 'express';

type Redis = { get: (key: string) => Promise<string | null> };

export function attachCcpaStatus(redis: Redis) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      (req as Request & { analyticsOptedOut: boolean }).analyticsOptedOut = false;
      return next();
    }

    const cached = await redis.get(`ccpa:opted_out:${userId}`);
    (req as Request & { analyticsOptedOut: boolean }).analyticsOptedOut = cached === '1';
    next();
  };
}
