'use client';

/**
 * HalalBadge
 *
 * Displays a halal-friendly badge on hotel cards and detail pages.
 *
 * compact=true  (search result cards): green pill "Halal-Friendly"
 * compact=false (hotel detail page):   expanded breakdown of individual amenities
 *
 * Renders null when isHalalFriendly is false.
 */

import { useTranslations } from 'next-intl';

export interface HalalAmenities {
  no_alcohol?:        boolean;
  halal_food?:        boolean;
  prayer_room?:       boolean;
  qibla_direction?:   boolean;
  zamzam_water?:      boolean;
  female_only_floor?: boolean;
  no_pork?:           boolean;
}

interface Props {
  isHalalFriendly: boolean;
  amenities?:      HalalAmenities | null;
  compact?:        boolean;
}

// Crescent + star SVG icon (inline — no external dependency)
function CrescentIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  );
}

const AMENITY_ICONS: Record<keyof HalalAmenities, string> = {
  no_alcohol:        '🚫',
  halal_food:        '🥩',
  prayer_room:       '🕌',
  qibla_direction:   '🧭',
  zamzam_water:      '💧',
  female_only_floor: '🏨',
  no_pork:           '🐷',
};

export default function HalalBadge({ isHalalFriendly, amenities, compact = true }: Props) {
  const t = useTranslations('halal');

  if (!isHalalFriendly) return null;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold"
        aria-label={t('badge')}
      >
        <CrescentIcon className="h-3 w-3" />
        {t('badge')}
      </span>
    );
  }

  // Expanded view for detail page
  const activeAmenities = amenities
    ? (Object.keys(amenities) as Array<keyof HalalAmenities>).filter((k) => amenities[k])
    : [];

  return (
    <div
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3"
      role="region"
      aria-label={t('badge')}
    >
      <div className="flex items-center gap-2">
        <CrescentIcon className="h-5 w-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-emerald-800">{t('badge')}</h3>
      </div>

      {activeAmenities.length > 0 && (
        <ul className="grid grid-cols-2 gap-2" role="list">
          {activeAmenities.map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 text-xs text-emerald-700"
              aria-label={t(key as keyof typeof t)}
            >
              <span aria-hidden="true">{AMENITY_ICONS[key]}</span>
              {/* @ts-expect-error dynamic key */}
              {t(key)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
