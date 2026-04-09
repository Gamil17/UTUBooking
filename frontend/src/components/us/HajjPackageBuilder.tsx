'use client';

/**
 * HajjPackageBuilder
 *
 * US Umrah package search + results widget.
 * Combines flight + hotel selection into a single "package" search UX.
 *
 * Flow:
 *   1. User picks departure city, dates, travelers, tier
 *   2. Fetches /api/packages/umrah
 *   3. Renders package cards with per-person price
 *   4. "Book This Package" → pre-fills booking flow with flight+hotel
 *
 * Props: none — standalone widget intended for /us/umrah-packages page.
 */

import { useState } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PackageHotel {
  id:               string;
  name:             string;
  starRating:       number;
  pricePerNight:    number | null;
  distanceFromHaram: number;
  isHalalFriendly:  boolean;
  thumbnail:        string | null;
}

interface UmrahPackage {
  id:            string;
  origin:        string;
  tier:          string;
  nights:        number;
  adults:        number;
  checkIn:       string;
  checkOut:      string;
  pricePerPerson: number;
  totalPrice:    number;
  flight:        { connectionNote: string };
  hotel:         PackageHotel;
  includes:      string[];
  isEstimate?:   boolean;
}

// ── Static data ────────────────────────────────────────────────────────────────

const US_AIRPORTS = [
  { iata: 'DTW', label: 'Detroit / Dearborn (DTW)',    note: '★ Largest Muslim community' },
  { iata: 'JFK', label: 'New York City (JFK)',          note: '' },
  { iata: 'ORD', label: 'Chicago (ORD)',                note: '' },
  { iata: 'IAD', label: 'Washington D.C. (IAD)',        note: '' },
  { iata: 'LAX', label: 'Los Angeles (LAX)',            note: '' },
  { iata: 'IAH', label: 'Houston (IAH)',                note: '' },
];

const TIERS = [
  { value: 'economy',  label: 'Economy',  desc: '3-star hotels · Economy airfare',       color: '#6B7280' },
  { value: 'standard', label: 'Standard', desc: '4-star hotels · Economy airfare',       color: '#2563EB' },
  { value: 'premium',  label: 'Premium',  desc: '5-star hotels · Business airfare',      color: '#D97706' },
];

// ── Stars helper ───────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return <span aria-label={`${n} stars`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HajjPackageBuilder() {
  const today    = new Date();
  const defIn    = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const defOut   = new Date(today.getTime() + 44 * 86400000).toISOString().split('T')[0];

  const [origin,   setOrigin]   = useState('DTW');
  const [checkIn,  setCheckIn]  = useState(defIn);
  const [checkOut, setCheckOut] = useState(defOut);
  const [adults,   setAdults]   = useState(2);
  const [tier,     setTier]     = useState('standard');

  const [packages,  setPackages]  = useState<UmrahPackage[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [searched,  setSearched]  = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = new URLSearchParams({ origin, checkIn, checkOut, adults: String(adults), tier });
      const res  = await fetch(`/api/packages/umrah?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      setPackages(data.packages ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }

  const nights = Math.max(
    0,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>

      {/* ── Search Form ──────────────────────────────────────────────── */}
      <form
        onSubmit={handleSearch}
        style={{
          background:   '#fff',
          border:       '1px solid #E5E7EB',
          borderRadius: 16,
          padding:      '24px 28px',
          marginBottom: 32,
        }}
        aria-label="Umrah Package Search"
      >
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>

          {/* Departure city */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Departing From
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, minHeight: 44 }}
            >
              {US_AIRPORTS.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.label}{a.note ? ` ${a.note}` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Check-in */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Check-in
            <input
              type="date"
              value={checkIn}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setCheckIn(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, minHeight: 44 }}
              required
            />
          </label>

          {/* Check-out */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Check-out
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, minHeight: 44 }}
              required
            />
          </label>

          {/* Adults */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Travelers
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, minHeight: 44 }}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'traveler' : 'travelers'}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Tier selector */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Package Tier</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TIERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTier(t.value)}
                aria-pressed={tier === t.value}
                style={{
                  flex:            '1 1 160px',
                  padding:         '12px 16px',
                  border:          `2px solid ${tier === t.value ? t.color : '#E5E7EB'}`,
                  borderRadius:    10,
                  background:      tier === t.value ? `${t.color}12` : '#fff',
                  cursor:          'pointer',
                  textAlign:       'left',
                  transition:      'border-color 0.15s',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: t.color, margin: 0 }}>{t.label}</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop:       20,
            width:           '100%',
            background:      '#1E3A5F',
            color:           '#fff',
            border:          'none',
            borderRadius:    10,
            padding:         '14px 0',
            fontSize:        15,
            fontWeight:      700,
            cursor:          loading ? 'not-allowed' : 'pointer',
            minHeight:       44,
            opacity:         loading ? 0.7 : 1,
          }}
          aria-busy={loading}
        >
          {loading ? '⏳ Searching packages…' : '🕌 Search Umrah Packages'}
        </button>
      </form>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '14px 18px', color: '#991B1B', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {searched && !loading && packages.length === 0 && !error && (
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0' }}>
          No packages found for these dates. Try adjusting your travel dates or departure city.
        </p>
      )}

      {packages.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            {packages.length} package{packages.length !== 1 ? 's' : ''} found · {nights} nights ·{' '}
            {adults} {adults === 1 ? 'traveler' : 'travelers'}
            {packages[0]?.isEstimate && ' · Estimated prices — confirm at booking'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} adults={adults} nights={nights} />
            ))}
          </div>

          <p style={{ marginTop: 24, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
            ✈️ All US–Jeddah flights connect via a Gulf or European hub (16–22 hrs total).
            Prices shown are estimates and may vary at time of booking.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Package Card ───────────────────────────────────────────────────────────────

function PackageCard({ pkg, adults, nights }: { pkg: UmrahPackage; adults: number; nights: number }) {
  const tierColor = TIERS.find((t) => t.value === pkg.tier)?.color ?? '#1E3A5F';
  const bookUrl   = `/booking?packageId=${pkg.id}&origin=${pkg.origin}&checkIn=${pkg.checkIn}&checkOut=${pkg.checkOut}&adults=${adults}&tier=${pkg.tier}`;

  return (
    <article
      style={{
        border:       '1px solid #E5E7EB',
        borderRadius: 14,
        background:   '#fff',
        overflow:     'hidden',
        boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header band */}
      <div style={{ background: `${tierColor}14`, borderBottom: '1px solid #E5E7EB', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: tierColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {pkg.tier} package
        </span>
        {pkg.isEstimate && (
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Estimated</span>
        )}
      </div>

      <div style={{ padding: '18px 20px', display: 'grid', gap: 16, gridTemplateColumns: '1fr auto' }}>
        <div>
          {/* Hotel */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
              {pkg.hotel.name}
            </p>
            <p style={{ fontSize: 12, color: '#F59E0B', margin: '2px 0 0' }}>
              <Stars n={pkg.hotel.starRating} />
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
              📍 {pkg.hotel.distanceFromHaram}m from Haram
              {pkg.hotel.isHalalFriendly && ' · ✓ Halal-friendly'}
            </p>
          </div>

          {/* Flight note */}
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            ✈️ {pkg.origin} → JED · {pkg.flight.connectionNote}
          </p>

          {/* Includes */}
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pkg.includes.map((item) => (
              <span key={item} style={{ fontSize: 11, background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC', borderRadius: 20, padding: '2px 10px' }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Price + CTA */}
        <div style={{ textAlign: 'right', minWidth: 130 }}>
          <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>from</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '2px 0' }}>
            ${pkg.pricePerPerson.toLocaleString('en-US')}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 12px' }}>
            /person · {nights} nights
          </p>
          {adults > 1 && (
            <p style={{ fontSize: 12, color: '#374151', margin: '0 0 10px' }}>
              ${pkg.totalPrice.toLocaleString('en-US')} total
            </p>
          )}
          <Link
            href={bookUrl}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              justifyContent: 'center',
              background:   '#1E3A5F',
              color:        '#fff',
              textDecoration: 'none',
              borderRadius: 8,
              padding:      '10px 18px',
              fontSize:     13,
              fontWeight:   700,
              minHeight:    44,
              whiteSpace:   'nowrap',
            }}
            aria-label={`Book ${pkg.hotel.name} package from $${pkg.pricePerPerson} per person`}
          >
            Book Package →
          </Link>
        </div>
      </div>
    </article>
  );
}
