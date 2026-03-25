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
import DirectPartnerBadge, { PartnerPerks, PartnerTier } from './DirectPartnerBadge';
import { formatPrice } from '@/utils/formatting';

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

function StarRating({ count }: { count: number | null }) {
  if (!count) return null;
  return (
    <span className="flex gap-0.5" aria-label={`${count} stars`}>
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

  // Partner perks come embedded in halalAmenities after overlay
  const partnerPerks = offer.isDirectPartner ? (offer.halalAmenities as PartnerPerks | null) : null;

  return (
    <article
      className="flex flex-col sm:flex-row rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={hotelName}
    >
      {/* ── Image ── */}
      <div className="relative h-48 sm:h-auto sm:w-48 flex-shrink-0 bg-gray-100">
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
          <div className="flex h-full items-center justify-center text-gray-300">
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
          <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2">
            {hotelName}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <StarRating count={offer.stars} />

            {offer.distanceHaramM !== null && (
              <span className="text-xs text-gray-500">
                {/* @ts-expect-error next-intl rich text */}
                {t('distanceHaram', { m: offer.distanceHaramM.toLocaleString() })}
              </span>
            )}

            {offer.reviewScore != null && (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {offer.reviewScore.toFixed(1)}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 truncate">{offer.address || offer.city}</p>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <HalalBadge isHalalFriendly={offer.isHalalFriendly} compact />
          {/* DirectPartnerBadge in compact mode is shown on the image; hide duplicate here */}
        </div>

        {/* Free cancellation */}
        {offer.freeCancellation && (
          <p className="text-xs font-medium text-emerald-600">
            {/* @ts-expect-error dynamic key */}
            ✓ {t('freeCancellation')}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-4 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">
              {offer.nights} {offer.nights === 1 ? 'night' : 'nights'} · {offer.guests ?? ''} guests
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(offer.pricePerNight, currency)}
              <span className="text-sm font-normal text-gray-400">
                {' '}{t('perNight')}
              </span>
            </p>
            {offer.nights > 1 && (
              <p className="text-xs text-gray-400">
                {formatPrice(offer.totalPrice, currency)} total
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onBook(offer)}
            className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {t('book')}
          </button>
        </div>
      </div>
    </article>
  );
}
