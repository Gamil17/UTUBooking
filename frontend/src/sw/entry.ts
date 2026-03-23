/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ─── Push Notification Handler ────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    title: string;
    body: string;
    tag?: string;
    data?: Record<string, unknown>;
  };

  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'UTUBooking', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    '/icons/icon-192x192.png',
      badge:   '/icons/badge-72x72.png',
      tag:     payload.tag ?? 'utu-notification',
      data:    payload.data ?? {},
      vibrate: [200, 100, 200],
    })
  );
});

// ─── Notification Click → Deep Link ──────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) ?? '/';

  event.waitUntil(
    (self.clients as Clients)
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if (c.url.includes(self.location.origin) && 'focus' in c) {
            return (c as WindowClient).focus().then((w) => w.navigate(url));
          }
        }
        return (self.clients as Clients).openWindow(url);
      })
  );
});

// ─── Hajj Season: Pre-cache Top 50 Hotels on Install ─────────────────────────

// NEXT_PUBLIC_ prefix is replaced at build time by Next.js Webpack pipeline
const HAJJ_MODE = process.env.NEXT_PUBLIC_HAJJ_MODE === 'true';

self.addEventListener('install', (event: ExtendableEvent) => {
  if (!HAJJ_MODE) return;

  event.waitUntil(
    caches.open('hajj-hotels-cache').then(async (cache) => {
      try {
        const res = await fetch('/api/hajj-precache');
        if (res.ok) await cache.put('/api/hajj-precache', res);
      } catch (err) {
        console.warn('[SW] Hajj pre-cache fetch failed:', err);
      }
    })
  );
});
