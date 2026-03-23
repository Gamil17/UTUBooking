'use client';

import { useEffect } from 'react';

/**
 * Mounts in root layout. Registers the service worker after the page loads
 * so it never competes with the critical rendering path.
 * Renders nothing — side-effect only.
 */
export default function PwaInit() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = () =>
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => console.error('[PWA] SW registration failed:', err));

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
