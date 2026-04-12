'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * AffiliateRefTracker — fires a single click-tracking POST when a visitor
 * lands with a ?ref=UTU-XXXXX-XXXX query parameter.
 *
 * Rendered as a child of the root layout. Uses useSearchParams() so it only
 * runs on the client after hydration, keeping the SSR path clean.
 *
 * The middleware already sets the utu_ref cookie (30-day, httpOnly).
 * This component's job is to increment the partner's total_clicks counter.
 *
 * We store a sessionStorage flag so the POST fires at most once per browser session
 * even if the user navigates between pages with the ?ref= param in the URL.
 */

const SESSION_KEY = 'utu_ref_tracked';
const VALID_REF   = /^UTU-[A-Z0-9]{1,10}-[A-Z0-9]{1,6}$/i;

export default function AffiliateRefTracker() {
  const params = useSearchParams();

  useEffect(() => {
    const ref = params.get('ref') ?? '';
    if (!ref || !VALID_REF.test(ref)) return;

    // De-duplicate: only track once per browser session per ref code
    const alreadyTracked = sessionStorage.getItem(SESSION_KEY);
    if (alreadyTracked === ref.toUpperCase()) return;

    sessionStorage.setItem(SESSION_KEY, ref.toUpperCase());

    fetch('/api/affiliates/track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ref }),
    }).catch(() => {
      // Silent — tracking failure must never affect UX
    });
  }, [params]);

  return null;
}
