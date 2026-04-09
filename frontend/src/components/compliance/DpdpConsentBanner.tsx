'use client';

/**
 * DpdpConsentBanner — India Digital Personal Data Protection Act 2023
 *
 * Displayed only when the visitor's country is 'IN' (India).
 * Shown in both English + Hindi as required by DPDP consent rules.
 *
 * DPDP Act 2023 §6 — Consent must be:
 *   - Free, specific, informed, unconditional, unambiguous
 *   - Presented in plain language
 *   - Easy to withdraw as it was to give
 *
 * Behaviour:
 *   Accept  → sets cookie dpdp_consent=1 (1 year)
 *            + POSTs to /api/compliance/consent for audit log
 *   Decline → shows limited-functionality bar (no cookie)
 *            + re-prompted on next visit
 *
 * Legal reference:
 *   DPDP Act 2023 §6 (consent), §12 (rights), §13 (erasure)
 *   Ministry of Electronics & IT — Draft Implementation Rules 2024
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';

// ── Types ──────────────────────────────────────────────────────────────────────
type BannerState = 'loading' | 'hidden' | 'visible' | 'accepted' | 'declined';

interface Props {
  /** ISO 3166-1 alpha-2 country code from middleware (e.g. 'IN') */
  countryCode?: string;
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────
const COOKIE_NAME    = 'dpdp_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${maxAge}`,
    'path=/',
    'SameSite=Lax',
    ...(location.protocol === 'https:' ? ['Secure'] : []),
  ].join('; ');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isDpdpRequired(locale: string, countryCode?: string): boolean {
  return locale === 'hi' || locale.startsWith('hi-') || countryCode === 'IN';
}

async function logConsent(consentGiven: boolean, locale: string): Promise<void> {
  try {
    await fetch('/api/compliance/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        consentGiven,
        locale,
        consentVersion: '1.0',
        law:            'DPDP',
      }),
    });
  } catch {
    // Non-fatal — cookie already set client-side; audit log will have gap
  }
}

// ── Shared inline styles (inline to avoid Tailwind purge in server component) ──
const styles = {
  banner: {
    position:        'fixed' as const,
    bottom:          0,
    left:            0,
    right:           0,
    zIndex:          50,
    backgroundColor: '#111827',
    borderTop:       '3px solid #1E3A5F',
    boxShadow:       '0 -4px 24px rgba(0,0,0,0.4)',
    padding:         '20px 24px',
    maxHeight:       '70vh',
    overflowY:       'auto' as const,
  },
  heading: {
    color:        '#F9FAFB',
    fontWeight:   700,
    fontSize:     16,
    marginBottom: 10,
    display:      'flex' as const,
    alignItems:   'center',
    gap:          8,
  },
  body: {
    color:        '#D1D5DB',
    fontSize:     13,
    lineHeight:   1.7,
    marginBottom: 10,
  },
  highlight: { color: '#F9FAFB' },
  link:       { color: '#1E3A5F', textDecoration: 'underline' as const },
  note: {
    color:        '#9CA3AF',
    fontSize:     12,
    lineHeight:   1.5,
    marginBottom: 16,
  },
  actions: {
    display:    'flex' as const,
    gap:        12,
    flexWrap:   'wrap' as const,
    alignItems: 'center',
  },
  acceptBtn: {
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
  },
  declineBtn: {
    backgroundColor: 'transparent',
    color:           '#9CA3AF',
    border:          '1px solid #4B5563',
    borderRadius:    8,
    padding:         '10px 24px',
    fontSize:        14,
    fontWeight:      600,
    cursor:          'pointer',
    minHeight:       44,
  },
} as const;

// ── Component ──────────────────────────────────────────────────────────────────
export default function DpdpConsentBanner({ countryCode }: Props) {
  const tenant            = useTenant();
  const [state, setState] = useState<BannerState>('loading');

  useEffect(() => {
    if (!isDpdpRequired(tenant.locale, countryCode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads cookie (SSR-unavailable), must run after hydration to avoid mismatch
      setState('hidden');
      return;
    }
    setState(getCookie(COOKIE_NAME) === '1' ? 'accepted' : 'visible');
  }, [tenant.locale, countryCode]);

  async function handleAccept(): Promise<void> {
    setCookie(COOKIE_NAME, '1', COOKIE_MAX_AGE);
    setState('accepted');
    await logConsent(true, tenant.locale);
  }

  function handleDecline(): void {
    setState('declined');
    logConsent(false, tenant.locale).catch(() => undefined);
  }

  function handleRevoke(): void {
    setState('visible');
  }

  if (state === 'loading' || state === 'hidden' || state === 'accepted') return null;

  // ── Declined — limited-mode bar ───────────────────────────────────────────
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
          ⚠️ <strong style={{ color: '#F9FAFB' }}>Limited mode / सीमित मोड:</strong>{' '}
          Personal data will not be processed. Booking unavailable. /{' '}
          व्यक्तिगत डेटा प्रोसेस नहीं किया जाएगा। बुकिंग उपलब्ध नहीं होगी।
        </span>
        <button
          onClick={handleRevoke}
          aria-label="Revoke DPDP consent decision / सहमति विकल्प बदलें"
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
          Change / बदलें
        </button>
      </div>
    );
  }

  // ── Visible — full DPDP consent banner (English + Hindi) ─────────────────
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="DPDP Act 2023 — Personal Data Consent Notice"
      style={styles.banner}
    >
      {/* Header */}
      <p style={styles.heading}>
        <span aria-hidden="true">🔒</span>
        Personal Data Protection / व्यक्तिगत डेटा संरक्षण (DPDP Act 2023)
      </p>

      {/* English body */}
      <p style={styles.body}>
        <strong style={styles.highlight}>UTUBooking</strong> processes your personal data
        under India&apos;s <strong>Digital Personal Data Protection Act 2023</strong>.
      </p>

      <p style={styles.body}>
        <strong style={styles.highlight}>Data collected:</strong>{' '}
        Name, email, phone, nationality, and payment details — only what is
        necessary to complete your Hajj / Umrah booking (data minimisation, §6).
      </p>

      <p style={styles.body}>
        <strong style={styles.highlight}>Your rights (§12–14):</strong>{' '}
        Access, correct, erase your data at any time. To request erasure:{' '}
        <a href="mailto:dpo@utubooking.com" style={styles.link} aria-label="Email DPO for data erasure">
          dpo@utubooking.com
        </a>
        {' '}· Response within 30 days.
      </p>

      {/* Hindi body */}
      <p style={{ ...styles.body, borderTop: '1px solid #374151', paddingTop: 10, marginTop: 10 }}>
        <strong style={styles.highlight}>UTUBooking</strong> भारत के{' '}
        <strong>डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023</strong> के तहत
        आपका व्यक्तिगत डेटा संसाधित करती है।
      </p>

      <p style={styles.body}>
        <strong style={styles.highlight}>एकत्रित डेटा:</strong>{' '}
        नाम, ईमेल, फोन, राष्ट्रीयता और भुगतान विवरण — केवल वही जो आपकी
        हज/उमरह बुकिंग के लिए आवश्यक है।
      </p>

      <p style={styles.body}>
        <strong style={styles.highlight}>आपके अधिकार (§12–14):</strong>{' '}
        अपना डेटा देखें, सुधारें, हटाएं। अनुरोध के लिए:{' '}
        <a href="mailto:dpo@utubooking.com" style={styles.link} aria-label="डेटा मिटाने के लिए ईमेल करें">
          dpo@utubooking.com
        </a>
        {' '}· 30 दिनों के भीतर उत्तर।
      </p>

      <p style={styles.note}>
        Data stored in AWS Mumbai (ap-south-1) — India data residency compliant.
        Retention: contract duration + 7 years (legal requirement).{' '}
        डेटा AWS मुंबई में संग्रहीत है। / Breach notification within 72 hours per DPDP §8.{' '}
        <Link href="/privacy" style={styles.link}>Privacy Policy / गोपनीयता नीति</Link>
      </p>

      {/* Action buttons */}
      <div style={styles.actions}>
        <button
          onClick={handleAccept}
          aria-label="Accept DPDP data processing / DPDP डेटा प्रोसेसिंग स्वीकार करें"
          style={styles.acceptBtn}
        >
          I Accept / मैं सहमत हूँ
        </button>

        <button
          onClick={handleDecline}
          aria-label="Decline DPDP data processing — limited mode / डेटा प्रोसेसिंग अस्वीकार करें"
          style={styles.declineBtn}
        >
          Decline / अस्वीकार करें
        </button>

        <span style={{ color: '#6B7280', fontSize: 12 }}>
          Remembered for 1 year / 1 साल के लिए याद रखा जाएगा।
        </span>
      </div>
    </div>
  );
}
