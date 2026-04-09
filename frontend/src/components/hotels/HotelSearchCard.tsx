'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import type { HotelOffer } from '@/lib/api';

// ─── Star row ─────────────────────────────────────────────────────────────────
function Stars({ count }: { count: number | null }) {
  if (!count) return null;
  const filled = Math.min(Math.max(Math.round(count), 0), 5);
  return (
    <span className="flex gap-px" aria-label={`${filled} stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < filled ? 'text-amber-400' : 'text-utu-border-default'}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

// ─── Distance to Haram badge ──────────────────────────────────────────────────
function HaramBadge({ meters }: { meters: number | null }) {
  if (!meters) return null;
  const display = meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      {display} from Haram
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  offer:    HotelOffer;
  onSelect: (rateKey: string) => void;
}

// ─── HotelSearchCard ──────────────────────────────────────────────────────────
export default function HotelSearchCard({ offer, onSelect }: Props) {
  const t      = useTranslations('hotelResults');
  const tP     = useTranslations('partner');
  const locale = useLocale();
  const [imgIdx, setImgIdx] = useState(0);

  const RTL = new Set(['ar', 'ur', 'fa']);
  const isRtl = RTL.has(locale);
  const name = typeof offer.name === 'object'
    ? ((isRtl && offer.name.ar) ? offer.name.ar : offer.name.en)
    : (offer.name as unknown as string);

  const mainImage = offer.images?.[imgIdx] ?? null;

  return (
    <article
      className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm mb-3 overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ── Image panel ──────────────────────────────────────────────── */}
      <div className="relative sm:w-52 sm:shrink-0 h-44 sm:h-auto bg-utu-bg-muted overflow-hidden">
        {mainImage ? (
          <Image src={mainImage} alt={name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-utu-text-muted" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/>
            </svg>
          </div>
        )}

        {/* Photo navigation dots */}
        {offer.images?.length > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
            {offer.images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === imgIdx ? 'bg-utu-bg-card' : 'bg-utu-bg-card/50'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">

        {/* Header row: name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-utu-text-primary text-sm leading-tight line-clamp-2">{name}</h3>
            <Stars count={offer.stars} />
          </div>
          <div className="shrink-0 text-end">
            <div className="text-lg font-extrabold text-utu-text-primary leading-none">
              {offer.pricePerNight.toLocaleString(undefined, { style: 'currency', currency: offer.currency ?? 'SAR', maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-utu-text-muted">{tP('perNight')}</div>
            {offer.nights > 1 && (
              <div className="text-[10px] text-utu-text-muted">
                {offer.totalPrice.toLocaleString(undefined, { style: 'currency', currency: offer.currency ?? 'SAR', maximumFractionDigits: 0 })} {tP('total')}
              </div>
            )}
          </div>
        </div>

        {/* Location + Haram distance */}
        <div className="flex items-center flex-wrap gap-1.5">
          {offer.address && (
            <span className="text-xs text-utu-text-muted truncate">{offer.address}</span>
          )}
          <HaramBadge meters={offer.distanceHaramM} />
        </div>

        {/* Amenities */}
        {offer.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {offer.amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {a}
              </span>
            ))}
            {offer.amenities.length > 4 && (
              <span className="text-[10px] text-utu-text-muted">+{offer.amenities.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer row: badges + CTA */}
        <div className="mt-auto pt-1 flex items-center flex-wrap gap-1.5">
          {offer.freeCancellation && (
            <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
              {tP('freeCancellation')}
            </span>
          )}
          {offer.reviewScore != null && (
            <span className="bg-emerald-700 text-white text-xs font-bold px-1.5 py-0.5 rounded">
              {Number(offer.reviewScore).toFixed(1)}
            </span>
          )}
          {offer.urgency && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              {offer.urgency}
            </span>
          )}
          <button
            type="button"
            onClick={() => onSelect(offer.rateKey ?? offer.id)}
            className="ms-auto bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {t('seeAvailability')}
          </button>
        </div>
      </div>
    </article>
  );
}
