'use client';

/**
 * /privacy/ccpa-opt-out — California Consumer Privacy Act opt-out page
 *
 * Allows California (and all US) users to:
 *   1. Opt out of sale / sharing of personal data (§1798.120)
 *   2. Request deletion of their data (§1798.105)
 *
 * Linked from the "Do Not Sell or Share My Personal Information" footer link.
 * Client component — uses fetch() to call /api/user/ccpa/* endpoints.
 */

import { useState } from 'react';
import Link from 'next/link';

// ── Inline styles (consistent with /privacy/page.tsx) ─────────────────────────
const S = {
  page: {
    maxWidth:   720,
    margin:     '0 auto',
    padding:    '48px 24px 80px',
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    color:      '#111827',
    lineHeight: 1.75,
    fontSize:   15,
  } as React.CSSProperties,
  badge: {
    display:         'inline-block',
    backgroundColor: '#1D4ED8',
    color:           '#fff',
    fontSize:        11,
    fontWeight:      700,
    padding:         '2px 10px',
    borderRadius:    4,
    marginBottom:    16,
    letterSpacing:   '0.04em',
    textTransform:   'uppercase' as const,
  } as React.CSSProperties,
  h1: {
    fontSize:     26,
    fontWeight:   800,
    color:        '#111827',
    marginBottom: 6,
  } as React.CSSProperties,
  subtitle: {
    color:        '#6B7280',
    fontSize:     14,
    marginBottom: 32,
  } as React.CSSProperties,
  card: {
    border:       '1px solid #E5E7EB',
    borderRadius: 12,
    padding:      '24px 28px',
    marginBottom: 24,
    background:   '#fff',
  } as React.CSSProperties,
  cardTitle: {
    fontSize:     17,
    fontWeight:   700,
    color:        '#111827',
    marginBottom: 8,
  } as React.CSSProperties,
  cardBody: {
    fontSize:     14,
    color:        '#4B5563',
    lineHeight:   1.7,
    marginBottom: 16,
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'danger') => ({
    display:         'inline-flex',
    alignItems:      'center',
    gap:             8,
    backgroundColor: variant === 'primary' ? '#10B981' : '#DC2626',
    color:           '#fff',
    border:          'none',
    borderRadius:    8,
    padding:         '10px 20px',
    fontSize:        14,
    fontWeight:      600,
    cursor:          'pointer',
    minHeight:       44,
    transition:      'opacity 0.15s',
  } as React.CSSProperties),
  success: {
    backgroundColor: '#F0FDF4',
    border:          '1px solid #86EFAC',
    borderRadius:    8,
    padding:         '14px 18px',
    color:           '#166534',
    fontSize:        14,
    marginTop:       12,
  } as React.CSSProperties,
  error: {
    backgroundColor: '#FEF2F2',
    border:          '1px solid #FCA5A5',
    borderRadius:    8,
    padding:         '14px 18px',
    color:           '#991B1B',
    fontSize:        14,
    marginTop:       12,
  } as React.CSSProperties,
  divider: {
    border:    'none',
    borderTop: '1px solid #E5E7EB',
    margin:    '32px 0',
  } as React.CSSProperties,
  noteBox: {
    backgroundColor: '#FEF9C3',
    border:          '1px solid #FDE047',
    borderRadius:    8,
    padding:         '12px 16px',
    fontSize:        13,
    color:           '#713F12',
    marginBottom:    24,
  } as React.CSSProperties,
} as const;

// ── Component ──────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function CcpaOptOutPage() {
  const [optOutStatus,  setOptOutStatus]  = useState<Status>('idle');
  const [deleteStatus,  setDeleteStatus]  = useState<Status>('idle');
  const [optOutRef,     setOptOutRef]     = useState<string>('');
  const [deleteRef,     setDeleteRef]     = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');

  async function handleOptOut() {
    setOptOutStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/user/ccpa/opt-out', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setOptOutRef(data.referenceId ?? '');
      setOptOutStatus('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setOptOutStatus('error');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleteStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/user/ccpa/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setDeleteRef(data.referenceId ?? '');
      setDeleteStatus('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setDeleteStatus('error');
    }
  }

  return (
    <main style={S.page}>
      <span style={S.badge}>California Privacy Rights · CCPA / CPRA</span>

      <h1 style={S.h1}>Do Not Sell or Share My Personal Information</h1>
      <p style={S.subtitle}>
        As a California resident, you have the right to opt out of the sale or sharing of
        your personal information under the California Consumer Privacy Act (CCPA) and
        California Privacy Rights Act (CPRA).
      </p>

      {/* Non-discrimination notice */}
      <div style={S.noteBox}>
        <strong>Non-discrimination guarantee:</strong> Exercising your privacy rights will not
        affect your ability to use UTUBooking, change the price you pay, or reduce the quality
        of service you receive (Cal. Civ. Code §1798.125).
      </div>

      {/* ── Opt-out card ──────────────────────────────────────── */}
      <div style={S.card}>
        <p style={S.cardTitle}>Opt Out of Sale &amp; Sharing</p>
        <p style={S.cardBody}>
          By clicking below, you direct UTUBooking to <strong>stop selling or sharing</strong>{' '}
          your personal information to or with third parties for cross-context behavioural
          advertising. This will take effect within <strong>15 business days</strong> as
          required by California law.
        </p>
        <p style={{ ...S.cardBody, fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          Note: This does not affect sharing of data with service providers necessary to
          fulfil your booking (hotels, airlines, payment processors).
        </p>

        {optOutStatus === 'idle' || optOutStatus === 'loading' || optOutStatus === 'error' ? (
          <button
            style={S.btn('primary')}
            onClick={handleOptOut}
            disabled={optOutStatus === 'loading'}
            aria-busy={optOutStatus === 'loading'}
          >
            {optOutStatus === 'loading' ? '⏳ Processing…' : 'Opt Out of Data Sale / Sharing'}
          </button>
        ) : null}

        {optOutStatus === 'success' && (
          <div style={S.success} role="alert">
            <strong>✓ Opt-out recorded.</strong> Your personal information will no longer be
            sold or shared. Reference: <code>{optOutRef}</code>
          </div>
        )}

        {optOutStatus === 'error' && (
          <div style={S.error} role="alert">
            <strong>Error:</strong> {errorMsg || 'Please sign in to submit this request, or email us at privacy@utubooking.com.'}
          </div>
        )}
      </div>

      <hr style={S.divider} />

      {/* ── Deletion card ─────────────────────────────────────── */}
      <div style={S.card}>
        <p style={S.cardTitle}>Request Deletion of Your Data</p>
        <p style={S.cardBody}>
          Under Cal. Civ. Code §1798.105, you may request that UTUBooking delete your personal
          information. Your account profile will be anonymised immediately. Booking and payment
          records are retained for <strong>7 years</strong> as required by US tax law —
          this is a statutory exemption under §1798.105(d)(8).
        </p>

        {deleteStatus !== 'success' && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
              aria-label="I understand that deletion is irreversible"
            />
            I understand that deletion is irreversible and I will lose access to my account
            and booking history.
          </label>
        )}

        {(deleteStatus === 'idle' || deleteStatus === 'loading' || deleteStatus === 'error') && (
          <button
            style={{ ...S.btn('danger'), opacity: deleteConfirm ? 1 : 0.4 }}
            onClick={handleDelete}
            disabled={!deleteConfirm || deleteStatus === 'loading'}
            aria-busy={deleteStatus === 'loading'}
          >
            {deleteStatus === 'loading' ? '⏳ Processing…' : 'Request Data Deletion'}
          </button>
        )}

        {deleteStatus === 'success' && (
          <div style={S.success} role="alert">
            <strong>✓ Deletion request submitted.</strong> Your account has been anonymised.
            Reference: <code>{deleteRef}</code>
          </div>
        )}

        {deleteStatus === 'error' && (
          <div style={S.error} role="alert">
            <strong>Error:</strong> {errorMsg || 'Please sign in to submit this request, or email privacy@utubooking.com.'}
          </div>
        )}
      </div>

      <hr style={S.divider} />

      {/* ── Authorised Agent ──────────────────────────────────── */}
      <div style={S.card}>
        <p style={S.cardTitle}>Submit via Authorised Agent</p>
        <p style={S.cardBody}>
          California residents may use an authorised agent to submit privacy requests on their
          behalf. Contact{' '}
          <a href="mailto:privacy@utubooking.com" style={{ color: '#10B981' }}>
            privacy@utubooking.com
          </a>{' '}
          to obtain the agent authorisation form. We will verify your identity before processing
          agent-submitted requests.
        </p>
      </div>

      {/* ── Footer links ──────────────────────────────────────── */}
      <p style={{ fontSize: 13, color: '#9CA3AF' }}>
        <Link href="/privacy#ccpa" style={{ color: '#10B981', textDecoration: 'underline' }}>
          Full CCPA privacy disclosures
        </Link>
        {' · '}
        <a href="mailto:privacy@utubooking.com" style={{ color: '#10B981', textDecoration: 'underline' }}>
          privacy@utubooking.com
        </a>
        {' · '}
        For urgent matters: 1 (800) UTU-BOOK
      </p>
    </main>
  );
}
