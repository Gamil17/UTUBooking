'use client';

/**
 * HotelCard
 *
 * Reusable card component for hotel search results.
 * Displays:
 *  - Hotel name (locale-aware: AR when RTL, EN otherwise)
 *  - Star rating
 *  - Distance from Al-Haram (Makkah searches)
 *  - HalalBadge + DirectPartnerBadge
 *  - Partner perks (compact icon row, hidden on small screens)
 *  - Price per night + total price
 *  - Free cancellation indicator
 *  - "Book Now" CTA
 *
 * Usage:
 *   <HotelCard offer={offer} currency="SAR" onBook={(offer) => router.push(`/hotel/${offer.id}`)} />
 */

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import HalalBadge from './HalalBadge';
import DirectPartnerBadge, { PartnerTier } from './DirectPartnerBadge';
import { formatPrice } from '@/utils/formatting';
import type { Locale } from '@/i18n/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HotelCardOffer {
  id:               string;
  name:             { en: string; ar: string | null };
  stars:            number | null;
  distanceHaramM:   number | null;
  address:          string;
  city:             string;
  images:           string[];
  amenities:        string[];
  halalAmenities:   Record<string, boolean> | null;
  isHalalFriendly:  boolean;
  pricePerNight:    number;
  totalPrice:       number;
  currency:         string;
  checkIn:          string;
  checkOut:         string;
  nights:           number;
  guests?:          number | null;
  freeCancellation: boolean;
  source:           'hotelbeds' | 'bookingcom';
  reviewScore?:     number | null;
  // Partnership fields (from partnership.service overlay)
  isDirectPartner?: boolean;
  commissionRate?:  number;
  partnerTier?:     PartnerTier;
}

interface Props {
  offer:    HotelCardOffer;
  currency: string;
  onBook:   (offer: HotelCardOffer) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ count, label }: { count: number | null; label: string }) {
  if (!count) return null;
  return (
    <span className="flex gap-0.5" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} aria-hidden="true" className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

const RTL_LOCALES = new Set(['ar', 'ur', 'fa', 'he']);

// ─── HotelCard ────────────────────────────────────────────────────────────────

export default function HotelCard({ offer, currency, onBook }: Props) {
  const t      = useTranslations('partner');
  const locale = useLocale();
  const isRtl  = RTL_LOCALES.has(locale);

  // Pick localised name
  const hotelName = (isRtl && offer.name.ar) ? offer.name.ar : offer.name.en;

  // Thumbnail — first image or grey placeholder
  const thumbnail = offer.images?.[0] ?? null;

  return (
    <article
      className="flex flex-col sm:flex-row rounded-2xl border border-utu-border-default bg-utu-bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={hotelName}
    >
      {/* ── Image ── */}
      <div className="relative h-48 sm:h-auto sm:w-48 flex-shrink-0 bg-utu-bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={hotelName}
            fill
            sizes="(max-width: 640px) 100vw, 192px"
            className="object-cover"
            unoptimized={thumbnail.startsWith('http')} // external images skip Next.js optimiser
          />
        ) : (
          // Placeholder when no image available
          <div className="flex h-full items-center justify-center text-utu-text-muted">
            <svg aria-hidden="true" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 22V12h6v10" />
            </svg>
          </div>
        )}

        {/* Direct-partner ribbon on image corner */}
        {offer.isDirectPartner && (
          <div className="absolute top-2 start-2">
            <DirectPartnerBadge
              isDirectPartner
              tier={offer.partnerTier}
              compact
            />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-4 gap-2">

        {/* Name + stars + distance */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-utu-text-primary leading-tight line-clamp-2">
            {hotelName}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <StarRating count={offer.stars} label={t('starRating', { count: offer.stars ?? 0 })} />

            {offer.distanceHaramM !== null && (
              <span className="text-xs text-utu-text-muted">
                {t('distanceHaram', { m: offer.distanceHaramM.toLocaleString() })}
              </span>
            )}

            {offer.reviewScore != null && (
              <span className="inline-flex items-center gap-0.5 rounded bg-utu-blue px-1.5 py-0.5 text-xs font-bold text-white">
                {offer.reviewScore.toFixed(1)}
              </span>
            )}
          </div>

          <p className="text-xs text-utu-text-muted truncate">{offer.address || offer.city}</p>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <HalalBadge isHalalFriendly={offer.isHalalFriendly} compact />
          {/* DirectPartnerBadge in compact mode is shown on the image; hide duplicate here */}
        </div>

        {/* Free cancellation */}
        {offer.freeCancellation && (
          <p className="text-xs font-medium text-utu-blue">
            ✓ {t('freeCancellation')}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-4 pt-2 border-t border-utu-border-default">
          <div>
            <p className="text-xs text-utu-text-muted">
              {offer.nights} {offer.nights === 1 ? t('night') : t('nights')} · {offer.guests ?? ''} guests
            </p>
            <p className="text-xl font-bold text-utu-text-primary">
              {formatPrice(offer.pricePerNight, locale as Locale, { currency })}
              <span className="text-sm font-normal text-utu-text-muted">
                {' '}{t('perNight')}
              </span>
            </p>
            {offer.nights > 1 && (
              <p className="text-xs text-utu-text-muted">
                {formatPrice(offer.totalPrice, locale as Locale, { currency })} {t('total')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onBook(offer)}
            className="shrink-0 rounded-xl bg-utu-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-utu-navy active:bg-utu-navy transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-utu-blue"
          >
            {t('book')}
          </button>
        </div>
      </div>
    </article>
  );
}
