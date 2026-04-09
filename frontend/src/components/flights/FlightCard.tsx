'use client';

import { useTranslations } from 'next-intl';
import type { FlightOffer } from '@/lib/api';

// ─── Airline colour palette (deterministic hash) ──────────────────────────────
const AIRLINE_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-amber-500',
  'bg-indigo-600',  'bg-teal-600', 'bg-rose-500',
  'bg-violet-600',  'bg-orange-500',
];
function airlineColor(code: string) {
  return AIRLINE_COLORS[code.charCodeAt(0) % AIRLINE_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtPrice(price: number, currency: string) {
  return price.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 });
}

// ─── Stop dot-line SVG ────────────────────────────────────────────────────────
function StopLine({ stops }: { stops: number }) {
  return (
    <svg viewBox="0 0 120 16" className="w-24 h-3" aria-hidden="true">
      <line x1="0" y1="8" x2="120" y2="8" stroke="#d1d5db" strokeWidth="2" />
      {stops === 1 && <circle cx="60" cy="8" r="4" fill="#6b7280" />}
      {stops >= 2 && (
        <>
          <circle cx="40" cy="8" r="4" fill="#6b7280" />
          <circle cx="80" cy="8" r="4" fill="#6b7280" />
        </>
      )}
      <circle cx="0"   cy="8" r="4" fill="#059669" />
      <circle cx="120" cy="8" r="4" fill="#059669" />
    </svg>
  );
}

// ─── Single leg row ───────────────────────────────────────────────────────────
function LegRow({ offer, label }: { offer: FlightOffer; label?: string }) {
  const tc = useTranslations('common');
  const nextDay = new Date(offer.arrivalAt).getDate() !== new Date(offer.departureAt).getDate();
  const stopLabel = offer.stops === 0
    ? tc('direct')
    : offer.stops === 1
    ? tc('oneStop')
    : tc('nStops', { n: offer.stops });
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-[10px] text-utu-text-muted w-10 shrink-0">{label}</span>}
      {/* Depart */}
      <div className="text-center shrink-0 w-12">
        <p className="text-base font-bold text-utu-text-primary leading-none">{fmtTime(offer.departureAt)}</p>
        <p className="text-[11px] text-utu-text-muted mt-0.5">{offer.originIata}</p>
      </div>
      {/* Line */}
      <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
        <p className="text-[11px] text-utu-text-muted">{fmtDuration(offer.durationMinutes)}</p>
        <StopLine stops={offer.stops} />
        <p className="text-[10px] text-utu-text-muted">{stopLabel}</p>
      </div>
      {/* Arrive */}
      <div className="text-center shrink-0 w-12">
        <p className="text-base font-bold text-utu-text-primary leading-none">
          {fmtTime(offer.arrivalAt)}
          {nextDay && <sup className="text-[9px] text-amber-500 ms-0.5">+1</sup>}
        </p>
        <p className="text-[11px] text-utu-text-muted mt-0.5">{offer.destinationIata}</p>
      </div>
    </div>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────
const TAG_STYLES: Record<string, string> = {
  cheapest:   'bg-amber-100 text-amber-700',
  best_value: 'bg-emerald-100 text-emerald-700',
  direct:     'bg-blue-100 text-blue-700',
};

// ─── FlightCard ───────────────────────────────────────────────────────────────
export interface FlightCardProps {
  offer:    FlightOffer;
  isReturn: boolean;
  tags:     string[];
  onSelect: (id: string) => void;
}

export default function FlightCard({ offer, isReturn, tags, onSelect }: FlightCardProps) {
  const t = useTranslations('flightResults');

  const tagLabels: Record<string, string> = {
    cheapest:   t('cheapestTag'),
    best_value: t('bestValueTag'),
    direct:     t('directTag'),
  };

  return (
    <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm hover:shadow-md transition-shadow p-4 mb-3">
      {/* Tags row */}
      {tags.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {tags.map((tag) => (
            <span key={tag} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TAG_STYLES[tag] ?? 'bg-utu-bg-muted text-utu-text-secondary'}`}>
              {tagLabels[tag] ?? tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Airline logo */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${airlineColor(offer.airlineCode)}`}>
          <span className="text-white font-bold text-sm">{offer.airlineCode.slice(0, 2)}</span>
        </div>

        {/* Flight legs */}
        <div className="flex-1 min-w-0 space-y-3">
          <LegRow offer={offer} label={isReturn ? t('outbound') : undefined} />
          {isReturn && (
            <div className="border-t border-dashed border-utu-border-default pt-3">
              {/* Return leg uses swapped airports — backend provides separate offer for return */}
              <LegRow
                offer={{ ...offer, originIata: offer.destinationIata, destinationIata: offer.originIata }}
                label={t('return')}
              />
            </div>
          )}
        </div>

        {/* Price + CTA */}
        <div className="shrink-0 text-right flex flex-col items-end gap-2 ms-2">
          <div>
            <p className="text-lg font-bold text-emerald-700 leading-none">{fmtPrice(offer.price, offer.currency)}</p>
            <p className="text-[11px] text-utu-text-muted mt-0.5">{t('perPerson')}</p>
          </div>

          <button
            onClick={() => onSelect(offer.id)}
            className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {t('select')}
          </button>

          <div className="flex flex-col gap-1 items-end">
            {offer.isRefundable && (
              <span className="text-[10px] text-emerald-600 font-medium">{t('refundable')}</span>
            )}
            {offer.baggageIncluded && (
              <span className="flex items-center gap-0.5 text-[10px] text-utu-text-muted">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2zM9 6h6v2H9V6zm11 13H4v-9h16v9z"/>
                </svg>
                {t('baggageIncluded')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
