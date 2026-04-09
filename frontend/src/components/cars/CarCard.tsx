'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CarOffer } from '@/lib/api';

// ─── Spec icon helpers ────────────────────────────────────────────────────────
function SeatsIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
}
function TransIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4"/>
    </svg>
  );
}
function BagIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 8h-3V6c0-1.1-.9-2-2-2H9C7.9 4 7 4.9 7 6v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-9-2h2v2h-2V6zm-4 0h2v2H7V6zm6 10l-4-4h2.5V9h3v3H17l-4 4z"/>
    </svg>
  );
}
function FuelIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11A3.006 3.006 0 0 0 15 9c0 1.65 1.35 3 3 3 .55 0 1-.05 1-.05V18c0 .55-.45 1-1 1s-1-.45-1-1v-3c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6C4.9 3 4 3.9 4 5v16h10v-7.5h1.5v5A2.5 2.5 0 0 0 18 21a2.5 2.5 0 0 0 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM18 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  );
}
function MileageIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.44 4.56 16.94 4.07 13H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.56 7.06 7.06 4.56 11 4.07V6c0 .55.45 1 1 1s1-.45 1-1V4.07C16.94 4.56 19.44 7.06 19.93 11H18c-.55 0-1 .45-1 1s.45 1 1 1h1.93c-.49 3.94-2.99 6.44-6.93 6.93zM12 11l-4-4 1.41-1.41L12 8.17l2.59-2.58L16 7l-4 4z"/>
    </svg>
  );
}
function DoorsIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-utu-text-muted shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-7c.83 0 1.5-.67 1.5-1.5S11.83 9 11 9s-1.5.67-1.5 1.5S10.17 12 11 12z"/>
    </svg>
  );
}

// ─── Car placeholder SVG ──────────────────────────────────────────────────────
function CarPlaceholder() {
  return (
    <svg className="w-16 h-16 text-utu-text-muted" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  );
}

// ─── Supplier color chip ──────────────────────────────────────────────────────
const SUPPLIER_COLORS: Record<string, string> = {
  alamo:      'bg-blue-700 text-white',
  enterprise: 'bg-green-700 text-white',
  sixt:       'bg-orange-500 text-white',
  hertz:      'bg-yellow-400 text-utu-text-primary',
  avis:       'bg-red-600 text-white',
  national:   'bg-green-600 text-white',
  budget:     'bg-orange-400 text-white',
  thrifty:    'bg-blue-500 text-white',
};
function supplierChip(name: string) {
  const key = name.toLowerCase().split(' ')[0];
  return SUPPLIER_COLORS[key] ?? 'bg-utu-navy text-white';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  offer:    CarOffer;
  isTopPick?: boolean;
  onSelect: (id: string) => void;
}

// ─── CarCard ──────────────────────────────────────────────────────────────────
export default function CarCard({ offer, isTopPick, onSelect }: Props) {
  const t  = useTranslations('carResults');

  const image = offer.images?.[0] ?? null;

  const fuelType      = offer.fuelType      ?? null;
  const mileage       = offer.mileageIncluded ?? null;
  const bags          = offer.bags           ?? null;
  const doors         = offer.doors          ?? null;
  const fuelPolicy    = offer.fuelPolicy     ?? null;
  const pickupType    = offer.pickupType     ?? null;
  const freeCancellation = offer.freeCancellation ?? false;
  const rating        = offer.rating         ?? null;
  const reviewCount   = offer.reviewCount    ?? null;
  const reviewLabel   = offer.reviewLabel    ?? null;

  return (
    <article className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm mb-3 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">

        {/* ── Image ────────────────────────────────────────────────── */}
        <div className="relative sm:w-52 sm:shrink-0 h-40 sm:h-auto bg-utu-bg-muted flex items-center justify-center overflow-hidden">
          {isTopPick && (
            <span className="absolute top-2 start-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
              {t('topPick')}
            </span>
          )}
          {image ? (
            <div className="relative w-full h-full">
              <Image src={image} alt={offer.name} fill className="object-contain p-2" unoptimized />
            </div>
          ) : (
            <CarPlaceholder />
          )}
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">

          {/* Name */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-utu-text-primary text-sm leading-tight">
                {offer.name}
                <span className="ms-1.5 text-xs font-normal text-utu-text-muted">{t('orSimilar')}</span>
              </h3>
              <span className="text-[10px] text-utu-text-muted capitalize">{offer.category}</span>
            </div>

            {/* Price — top right */}
            <div className="shrink-0 text-end">
              {freeCancellation && (
                <div className="text-[10px] font-semibold text-green-700 flex items-center justify-end gap-0.5 mb-0.5">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  {t('freeCancellationBadge')}
                </div>
              )}
              <div className="text-lg font-extrabold text-utu-text-primary leading-none">
                {offer.totalPrice.toLocaleString(undefined, { style: 'currency', currency: offer.currency, maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-utu-text-muted">{t('totalPrice')}</div>
              <div className="text-xs text-utu-text-muted">
                {offer.pricePerDay.toLocaleString(undefined, { style: 'currency', currency: offer.currency, maximumFractionDigits: 0 })} {t('perDay')}
              </div>
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-utu-text-secondary">
            {offer.seats != null && (
              <span className="flex items-center gap-1.5"><SeatsIcon />{offer.seats} {t('seats')}</span>
            )}
            {doors != null && (
              <span className="flex items-center gap-1.5"><DoorsIcon />{doors} {t('doors')}</span>
            )}
            <span className="flex items-center gap-1.5"><TransIcon />{offer.transmission}</span>
            {fuelType && (
              <span className="flex items-center gap-1.5"><FuelIcon />{fuelType}</span>
            )}
            {mileage && (
              <span className="flex items-center gap-1.5"><MileageIcon />{mileage}</span>
            )}
            {bags != null && (
              <span className="flex items-center gap-1.5"><BagIcon />{bags} {t('bags')}</span>
            )}
          </div>

          {/* Policy pills */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {fuelPolicy && (
              <span className="bg-utu-bg-muted text-utu-text-secondary px-2 py-0.5 rounded-full">{fuelPolicy}</span>
            )}
            {pickupType && (
              <span className="bg-utu-bg-muted text-utu-text-secondary px-2 py-0.5 rounded-full">
                {pickupType === 'in_terminal' ? t('inTerminal') : t('meetGreet')}
              </span>
            )}
            {offer.pickupLocation && (
              <span className="text-utu-text-muted truncate">{offer.pickupLocation}</span>
            )}
          </div>

          {/* Footer: supplier + rating + CTA */}
          <div className="mt-auto pt-1 flex items-center gap-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-1 rounded ${supplierChip(offer.supplier)}`}>
              {offer.supplier}
            </span>
            {rating != null && (
              <div className="flex items-center gap-1">
                <span className="bg-utu-navy text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {Number(rating).toFixed(1)}
                </span>
                {reviewLabel && <span className="text-xs text-utu-text-muted">{reviewLabel}</span>}
                {reviewCount != null && (
                  <span className="text-[10px] text-utu-text-muted">({reviewCount})</span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelect(offer.id)}
              className="ms-auto bg-utu-navy hover:bg-utu-blue active:bg-utu-navy text-white text-xs font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              {t('viewDeal')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
