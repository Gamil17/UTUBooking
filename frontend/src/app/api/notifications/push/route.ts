import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import redis from '@/lib/redis';

// Configure VAPID on first request
let vapidConfigured = false;
function ensureVapidConfigured() {
  if (!vapidConfigured) {
    const publicKey  = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required');
    }
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL ?? 'push@utubooking.com'}`,
      publicKey,
      privateKey,
    );
    vapidConfigured = true;
  }
}

// ─── Multilingual notification templates ─────────────────────────────────────

type Locale = 'en' | 'ar' | 'fr' | 'id' | 'tr';
type TriggerType = 'booking_confirmed' | 'price_alert' | 'checkin_reminder';

interface NotificationTemplate {
  title: string;
  body: string;
}

const TEMPLATES: Record<Locale, Record<TriggerType, NotificationTemplate>> = {
  en: {
    booking_confirmed: {
      title: 'Booking Confirmed!',
      body: 'Your booking #{ref} is confirmed. Have a blessed journey.',
    },
    price_alert: {
      title: 'Price Drop Alert!',
      body: 'A hotel you viewed dropped to SAR {price}/night.',
    },
    checkin_reminder: {
      title: 'Check-in Tomorrow',
      body: 'Your stay at {hotel} starts tomorrow. Safe travels!',
    },
  },
  ar: {
    booking_confirmed: {
      title: 'تم تأكيد الحجز!',
      body: 'تم تأكيد حجزك رقم #{ref}. رحلة موفقة ومباركة.',
    },
    price_alert: {
      title: 'تنبيه انخفاض السعر!',
      body: 'انخفض سعر فندق شاهدته إلى {price} ريال/ليلة.',
    },
    checkin_reminder: {
      title: 'الوصول غداً',
      body: 'إقامتك في {hotel} تبدأ غداً. تشرفنا بخدمتك.',
    },
  },
  fr: {
    booking_confirmed: {
      title: 'Réservation confirmée !',
      body: 'Votre réservation #{ref} est confirmée. Bon voyage béni.',
    },
    price_alert: {
      title: 'Alerte baisse de prix !',
      body: 'Un hôtel consulté est maintenant à {price} SAR/nuit.',
    },
    checkin_reminder: {
      title: 'Arrivée demain',
      body: 'Votre séjour à {hotel} commence demain. Bon voyage !',
    },
  },
  id: {
    booking_confirmed: {
      title: 'Pemesanan Dikonfirmasi!',
      body: 'Pemesanan Anda #{ref} telah dikonfirmasi. Semoga perjalanan Anda diberkahi.',
    },
    price_alert: {
      title: 'Harga Turun!',
      body: 'Hotel yang Anda lihat turun ke Rp {price}/malam.',
    },
    checkin_reminder: {
      title: 'Check-in Besok',
      body: 'Masa menginap Anda di {hotel} dimulai besok. Selamat perjalanan!',
    },
  },
  tr: {
    booking_confirmed: {
      title: 'Rezervasyon Onaylandı!',
      body: '#{ref} numaralı rezervasyonunuz onaylandı. Hayırlı yolculuklar.',
    },
    price_alert: {
      title: 'Fiyat Düştü!',
      body: 'İncelediğiniz bir otel {price} SAR/geceye düştü.',
    },
    checkin_reminder: {
      title: 'Yarın Check-in',
      body: '{hotel} otелindeki konaklamanız yarın başlıyor. İyi yolculuklar!',
    },
  },
};

const VALID_LOCALES: Locale[] = ['en', 'ar', 'fr', 'id', 'tr'];
const VALID_TRIGGERS: TriggerType[] = [
  'booking_confirmed',
  'price_alert',
  'checkin_reminder',
];

function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    template
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/push
 *
 * Internal-only — authenticated by x-internal-secret header.
 * Called by payment service webhooks after booking confirmation.
 *
 * Body: { userId, trigger, locale?, vars?, deepLink? }
 */
export async function POST(req: NextRequest) {
  // Ensure VAPID is configured on first request
  ensureVapidConfigured();

  // Authenticate internal callers
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    userId: string;
    trigger: TriggerType;
    locale?: Locale;
    vars?: Record<string, string>;
    deepLink?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, trigger, locale = 'en', vars = {}, deepLink = '/' } = body;

  if (!userId || !trigger) {
    return NextResponse.json({ error: 'Missing userId or trigger' }, { status: 400 });
  }

  if (!VALID_TRIGGERS.includes(trigger)) {
    return NextResponse.json({ error: 'Unknown trigger' }, { status: 400 });
  }

  const safeLocale = VALID_LOCALES.includes(locale) ? locale : 'en';
  const tmpl = TEMPLATES[safeLocale][trigger];

  const title = interpolate(tmpl.title, vars);
  const notifBody = interpolate(tmpl.body, vars);

  // Retrieve subscription from Redis
  const raw = await redis.get(`push:sub:${userId}`);
  if (!raw) {
    return NextResponse.json({ ok: true, sent: false, reason: 'no_subscription' });
  }

  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(raw) as webpush.PushSubscription;
  } catch {
    await redis.del(`push:sub:${userId}`);
    return NextResponse.json({ ok: true, sent: false, reason: 'invalid_subscription' });
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body:  notifBody,
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag:   trigger,
        data:  { url: deepLink, trigger, userId },
      })
    );

    return NextResponse.json({ ok: true, sent: true });
  } catch (err: unknown) {
    // 410 Gone — subscription expired; clean up to avoid future failures
    const statusCode = (err as Record<string, unknown>)?.statusCode ?? (err as Record<string, unknown>)?.status;
    if (statusCode === 410) {
      await redis.del(`push:sub:${userId}`);
      return NextResponse.json({ ok: true, sent: false, reason: 'subscription_expired' });
    }

    console.error('[notifications/push] send error:', err);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
