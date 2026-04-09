'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductType = 'hotel' | 'flight' | 'car';
type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

interface Booking {
  id:          string;
  referenceNo: string;
  productType: ProductType;
  totalPrice:  number;
  currency:    string;
  status:      BookingStatus;
  createdAt:   string;
  meta:        Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtPrice(amount: number, currency: string): string {
  return amount.toLocaleString(undefined, {
    style: 'currency', currency, maximumFractionDigits: 0,
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, t }: { status: BookingStatus; t: ReturnType<typeof useTranslations> }) {
  const cfg: Record<BookingStatus, { labelKey: string; cls: string }> = {
    confirmed: { labelKey: 'statusConfirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    pending:   { labelKey: 'statusPending',   cls: 'bg-amber-50  text-amber-700  border-amber-100'  },
    cancelled: { labelKey: 'statusCancelled', cls: 'bg-red-50    text-red-600    border-red-100'    },
  };
  const { labelKey, cls } = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full ${cls}`}>
      {t(labelKey as Parameters<typeof t>[0])}
    </span>
  );
}

// ─── Product icon ─────────────────────────────────────────────────────────────
function ProductIcon({ type }: { type: ProductType }) {
  if (type === 'hotel') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    );
  }
  if (type === 'flight') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

// ─── Booking card ─────────────────────────────────────────────────────────────
function BookingCard({
  booking,
  locale,
  onCancel,
  cancelling,
  t,
}: {
  booking:    Booking;
  locale:     string;
  onCancel:   (id: string) => void;
  cancelling: string | null;
  t:          ReturnType<typeof useTranslations>;
}) {
  const meta = booking.meta ?? {};

  const title = (() => {
    if (booking.productType === 'hotel')  return (meta.name as string)     ?? t('hotelStay');
    if (booking.productType === 'flight') return `${meta.from ?? '?'} → ${meta.to ?? '?'}`;
    return (meta.name as string) ?? t('carRental');
  })();

  const subtitle = (() => {
    if (booking.productType === 'hotel')  return `${meta.checkIn ?? ''} – ${meta.checkOut ?? ''}`;
    if (booking.productType === 'flight') return `${meta.airline ?? ''} ${meta.flightNum ?? ''} · ${String(meta.cabin ?? '').replace(/_/g,' ')}`;
    return `${meta.pickupDate ?? ''} – ${meta.dropoffDate ?? ''} · ${meta.pickupLocation ?? ''}`;
  })();

  const isCancelling = cancelling === booking.id;

  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5">
      <div className="flex items-start gap-4">

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <ProductIcon type={booking.productType} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-utu-text-primary text-sm truncate">{title}</p>
            <StatusBadge status={booking.status} t={t} />
          </div>
          {subtitle && <p className="text-xs text-utu-text-muted mb-1">{subtitle}</p>}
          <p className="text-xs text-utu-text-muted">
            {t('ref')}: <span className="font-mono font-medium text-utu-text-secondary">{booking.referenceNo}</span>
            {' · '}{t('booked')} {fmtDate(booking.createdAt)}
          </p>
        </div>

        {/* Price + actions */}
        <div className="text-right shrink-0 space-y-2">
          <p className="font-bold text-emerald-700">
            {fmtPrice(booking.totalPrice, booking.currency)}
          </p>

          <div className="flex items-center gap-2 justify-end">
            {booking.status === 'confirmed' && (
              <a
                href={`/api/bookings/confirmation-pdf?ref=${booking.referenceNo}&locale=${locale}`}
                download
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                PDF
              </a>
            )}

            {booking.status === 'pending' && (
              <button
                onClick={() => onCancel(booking.id)}
                disabled={!!cancelling}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                {isCancelling ? t('cancelling') : t('cancel')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('account');

  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [authed,     setAuthed]     = useState<boolean | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem('utu_access_token')
      : null;

    if (!token) {
      setAuthed(false);
      setLoading(false);
      return;
    }

    setAuthed(true);

    fetch('/api/bookings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) { setAuthed(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setBookings(data.results ?? []);
      })
      .catch(() => setError(t('loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleSignOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('utu_access_token');
    router.push('/');
  }, [router]);

  const handleCancel = useCallback(async (id: string) => {
    const token = sessionStorage.getItem('utu_access_token');
    if (!token) return;

    setCancelling(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b)
        );
      } else {
        setError(t('cancelError'));
      }
    } catch {
      setError(t('cancelError'));
    } finally {
      setCancelling(null);
    }
  }, [t]);

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (authed === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-utu-text-primary mb-2">{t('signInToView')}</h1>
          <p className="text-sm text-utu-text-muted mb-6">{t('signInDesc')}</p>
          <Link
            href="/login"
            className="w-full inline-block bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {t('signIn')}
          </Link>
          <p className="mt-4 text-xs text-utu-text-muted">
            {t('noAccount')}{' '}
            <Link href="/contact" className="text-emerald-700 hover:underline">{t('contactUs')}</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-8 w-40 bg-utu-border-default rounded animate-pulse mb-6" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-5 mb-3 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-utu-border-default rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-utu-border-default rounded w-1/2" />
                  <div className="h-3 bg-utu-bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Group labels ─────────────────────────────────────────────────────────────
  const groupLabel: Record<string, string> = {
    confirmed: t('upcoming'),
    pending:   t('awaitingPayment'),
    cancelled: t('cancelled'),
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN TRIPS VIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-utu-text-primary">{t('myTrips')}</h1>
            <p className="text-sm text-utu-text-muted mt-0.5">
              {bookings.length === 1 ? t('bookingsCount', { count: 1 }) : t('bookingsCountPlural', { count: bookings.length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/hotels/search" className="text-sm text-emerald-700 font-medium hover:underline">
              {t('bookATrip')}
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-500 hover:text-red-700 font-medium hover:underline"
            >
              {t('signOut')}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!error && bookings.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-utu-border-default mb-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            <p className="text-utu-text-muted font-medium mb-1">{t('noTrips')}</p>
            <p className="text-sm text-utu-text-muted mb-6">{t('noTripsDesc')}</p>
            <Link
              href="/hotels/search"
              className="inline-block bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {t('planNextTrip')}
            </Link>
          </div>
        )}

        {/* Booking list grouped by status */}
        {bookings.length > 0 && (
          <div className="space-y-3">
            {['confirmed', 'pending', 'cancelled'].map((status) => {
              const group = bookings.filter((b) => b.status === status);
              if (group.length === 0) return null;

              return (
                <div key={status}>
                  <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-2 mt-4 first:mt-0">
                    {groupLabel[status]}
                  </p>
                  {group.map((b) => (
                    <div key={b.id} className="mb-3">
                      <BookingCard
                        booking={b}
                        locale={locale}
                        onCancel={handleCancel}
                        cancelling={cancelling}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
