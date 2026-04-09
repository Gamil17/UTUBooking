'use client';

/**
 * DirectPartnerBadge
 *
 * Displays a "Direct Partner" badge on hotel cards and detail pages.
 * Only renders when isDirectPartner is true.
 *
 * compact=true  (search cards):   gold pill with tier label
 * compact=false (detail page):    expanded panel with tier, perks list, and brand note
 */

import { useTranslations } from 'next-intl';

export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface PartnerPerks {
  earlyCheckIn?:        boolean;
  lateCheckOut?:        boolean;
  dedicatedConcierge?:  boolean;
  zamzamWaterDelivery?: boolean;
  haramViewPriority?:   boolean;
  haramShuttleService?: boolean;
  groupBookingDiscount?:boolean;
  pilgrimLoungeAccess?: boolean;
  privatePrayerRoom?:   boolean;
  hajjGroupCoordinator?:boolean;
}

interface Props {
  isDirectPartner: boolean;
  tier?:           PartnerTier;
  perks?:          PartnerPerks | null;
  compact?:        boolean;
}

// Tier → Tailwind colour tokens
const TIER_STYLES: Record<PartnerTier, { pill: string; icon: string; panel: string; heading: string }> = {
  platinum: {
    pill:    'bg-violet-100 text-violet-800 border border-violet-300',
    icon:    'text-violet-600',
    panel:   'border-violet-200 bg-violet-50',
    heading: 'text-violet-800',
  },
  gold: {
    pill:    'bg-amber-100 text-amber-800 border border-amber-300',
    icon:    'text-amber-500',
    panel:   'border-amber-200 bg-amber-50',
    heading: 'text-amber-800',
  },
  silver: {
    pill:    'bg-slate-100 text-slate-700 border border-slate-300',
    icon:    'text-slate-500',
    panel:   'border-slate-200 bg-slate-50',
    heading: 'text-slate-700',
  },
  bronze: {
    pill:    'bg-orange-100 text-orange-800 border border-orange-300',
    icon:    'text-orange-500',
    panel:   'border-orange-200 bg-orange-50',
    heading: 'text-orange-800',
  },
};

// Perk key → icon
const PERK_ICONS: Record<keyof PartnerPerks, string> = {
  earlyCheckIn:         '🕐',
  lateCheckOut:         '🕔',
  dedicatedConcierge:   '🛎️',
  zamzamWaterDelivery:  '💧',
  haramViewPriority:    '🕌',
  haramShuttleService:  '🚌',
  groupBookingDiscount: '👥',
  pilgrimLoungeAccess:  '🛋️',
  privatePrayerRoom:    '🤲',
  hajjGroupCoordinator: '📋',
};

// Star icon (used in compact pill)
function StarIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function DirectPartnerBadge({
  isDirectPartner,
  tier = 'bronze',
  perks,
  compact = true,
}: Props) {
  const t = useTranslations('partner');

  if (!isDirectPartner) return null;

  const styles = TIER_STYLES[tier] ?? TIER_STYLES.bronze;

  // ── Compact pill (search result card) ──────────────────────────────────────
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles.pill}`}
        aria-label={t('badge')}
      >
        <StarIcon className={`h-3 w-3 ${styles.icon}`} />
        {t(`tier.${tier}`)}
      </span>
    );
  }

  // ── Expanded panel (hotel detail page) ─────────────────────────────────────
  const activePerks = perks
    ? (Object.keys(perks) as Array<keyof PartnerPerks>).filter((k) => perks[k])
    : [];

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${styles.panel}`}
      role="region"
      aria-label={t('badgeTitle')}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <StarIcon className={`h-5 w-5 ${styles.icon}`} />
        <div>

          <p className={`text-sm font-semibold ${styles.heading}`}>{t(`tier.${tier}`)}</p>
          <p className="text-xs text-utu-text-muted">{t('badgeDesc')}</p>
        </div>
      </div>

      {/* Perks grid */}
      {activePerks.length > 0 && (
        <ul className="grid grid-cols-2 gap-2" role="list">
          {activePerks.map((key) => (
            <li
              key={key}
              className="flex items-center gap-1.5 text-xs text-utu-text-secondary"
            >
              <span aria-hidden="true">{PERK_ICONS[key]}</span>
    
              {t(`perks.${key}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
