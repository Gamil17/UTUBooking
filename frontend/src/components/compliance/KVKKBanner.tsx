'use client';

/**
 * KVKKBanner — Turkish Data Protection Law (KVKK) consent banner.
 *
 * Displayed only when:
 *  - tenant locale is 'tr' or starts with 'tr-', OR
 *  - the visitor's detected country is 'TR' (injected by middleware via cf-ipcountry)
 *
 * Behaviour:
 *  Accept  → sets cookie kvkk_consent=1 (1 year), hides banner,
 *            POSTs consent record to /api/compliance/consent for audit log.
 *  Decline → shows persistent limited-functionality notice (no cookie set),
 *            POSTs decline record to /api/compliance/consent for audit log.
 *            Banner reappears on next page load until explicit acceptance.
 *
 * KVKK legal basis: 6698 sayılı Kanun md. 5/1 (açık rıza)
 *                   md. 5/2/c (sözleşme ifası) for core booking data.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useTenant } from '@/contexts/TenantContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerState =
  | 'loading'   // SSR / hydration guard
  | 'hidden'    // not applicable for this locale/country
  | 'visible'   // awaiting user decision
  | 'accepted'  // accepted — cookie set, banner dismissed
  | 'declined'; // declined — show limited-mode bar

interface Props {
  /** ISO 3166-1 alpha-2 country code injected by middleware (e.g. 'TR'). */
  countryCode?: string;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAME    = 'kvkk_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${maxAgeSeconds}`,
    'path=/',
    'SameSite=Lax',
    ...(location.protocol === 'https:' ? ['Secure'] : []),
  ].join('; ');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isKvkkRequired(locale: string, countryCode?: string): boolean {
  return (
    locale === 'tr' ||
    locale.startsWith('tr-') ||
    countryCode === 'TR'
  );
}

async function logConsent(
  consentGiven: boolean,
  locale: string
): Promise<void> {
  try {
    await fetch('/api/compliance/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        consentGiven,
        locale,
        consentVersion: '1.0',
        law:            'KVKK',
      }),
    });
  } catch {
    // Non-fatal — consent state is already captured in the cookie client-side.
    // The audit log will have a gap; alert on /api/compliance/consent errors separately.
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KVKKBanner({ countryCode }: Props) {
  const tenant                 = useTenant();
  const t                      = useTranslations('kvkk');
  const [state, setState]      = useState<BannerState>('loading');

  useEffect(() => {
    if (!isKvkkRequired(tenant.locale, countryCode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads cookie (SSR-unavailable), must run after hydration to avoid mismatch
      setState('hidden');
      return;
    }
    const existing = getCookie(COOKIE_NAME);
    setState(existing === '1' ? 'accepted' : 'visible');
  }, [tenant.locale, countryCode]);

  async function handleAccept(): Promise<void> {
    setCookie(COOKIE_NAME, '1', COOKIE_MAX_AGE);
    setState('accepted');
    await logConsent(true, tenant.locale);
  }

  function handleDecline(): void {
    setState('declined');
    // No cookie set — user will be re-prompted on next visit.
    logConsent(false, tenant.locale).catch(() => undefined);
  }

  function handleRevoke(): void {
    // Allow user to re-open the full banner from the limited-mode bar.
    setState('visible');
  }

  // Nothing to render
  if (state === 'loading' || state === 'hidden' || state === 'accepted') {
    return null;
  }

  // ── Declined — persistent limited-functionality notice ────────────────────
  if (state === 'declined') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          50,
          backgroundColor: '#1F2937',
          borderTop:       '1px solid #374151',
          padding:         '10px 20px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             12,
          flexWrap:        'wrap',
        }}
      >
        <span style={{ color: '#D1D5DB', fontSize: 13 }}>
          ⚠️{' '}
          <strong style={{ color: '#F9FAFB' }}>{t('limitedModeLabel')}</strong>{' '}
          {t('limitedModeDesc')}
        </span>
        <button
          onClick={handleRevoke}
          aria-label="KVKK onay seçimini değiştir"
          style={{
            background:   'transparent',
            border:       '1px solid #6B7280',
            borderRadius: 6,
            color:        '#D1D5DB',
            fontSize:     13,
            padding:      '4px 14px',
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            minHeight:    36,
          }}
        >
          {t('revokeBtn')}
        </button>
      </div>
    );
  }

  // ── Visible — full KVKK consent banner ───────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('heading')}
      style={{
        position:        'fixed',
        bottom:          0,
        left:            0,
        right:           0,
        zIndex:          50,
        backgroundColor: '#111827',
        borderTop:       '3px solid #1E3A5F',
        boxShadow:       '0 -4px 24px rgba(0,0,0,0.4)',
        padding:         '20px 24px',
        maxHeight:       '65vh',
        overflowY:       'auto',
      }}
    >
      {/* Header */}
      <p
        style={{
          color:        '#F9FAFB',
          fontWeight:   700,
          fontSize:     16,
          marginBottom: 10,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
        }}
      >
        <span aria-hidden="true">🔒</span>
        {t('heading')}
      </p>

      {/* Body text */}
      <p style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        {t('body1')}
      </p>

      <p style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        <strong style={{ color: '#F3F4F6' }}>{t('dataTypesLabel')}</strong>{' '}
        {t('dataTypes')}
      </p>

      <p style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        <strong style={{ color: '#F3F4F6' }}>{t('purposeLabel')}</strong>{' '}
        {t('purpose')}
      </p>

      <p style={{ color: '#D1D5DB', fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        <strong style={{ color: '#F3F4F6' }}>{t('rightsLabel')}</strong>{' '}
        {t('rights')}{' '}
        <a
          href="mailto:kvkk@utubooking.com"
          style={{ color: '#1E3A5F', textDecoration: 'underline' }}
          aria-label="KVKK talebi için e-posta gönder"
        >
          kvkk@utubooking.com
        </a>
      </p>

      <p style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
        {t('storage')}{' '}
        <Link
          href="/privacy"
          style={{ color: '#1E3A5F', textDecoration: 'underline' }}
          aria-label="Gizlilik politikasını oku"
        >
          {t('privacyPolicyLink')}
        </Link>
      </p>

      {/* Action buttons */}
      <div
        style={{
          display:    'flex',
          gap:        12,
          flexWrap:   'wrap',
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleAccept}
          aria-label="KVKK kapsamında veri işlemeyi kabul et"
          style={{
            backgroundColor: '#1E3A5F',
            color:           '#FFFFFF',
            border:          'none',
            borderRadius:    8,
            padding:         '10px 28px',
            fontSize:        14,
            fontWeight:      700,
            cursor:          'pointer',
            minHeight:       44,
            minWidth:        160,
          }}
        >
          {t('acceptBtn')}
        </button>

        <button
          onClick={handleDecline}
          aria-label="KVKK kapsamında veri işlemeyi reddet — sınırlı mod etkinleştirilir"
          style={{
            backgroundColor: 'transparent',
            color:           '#9CA3AF',
            border:          '1px solid #4B5563',
            borderRadius:    8,
            padding:         '10px 24px',
            fontSize:        14,
            fontWeight:      600,
            cursor:          'pointer',
            minHeight:       44,
          }}
        >
          {t('declineBtn')}
        </button>

        <span style={{ color: '#6B7280', fontSize: 12 }}>
          {t('rememberedFor')}
        </span>
      </div>
    </div>
  );
}
