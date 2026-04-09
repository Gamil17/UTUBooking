'use client';

/**
 * USDepartureSelector
 *
 * Displays ordered departure airport suggestions for US Umrah/Hajj packages.
 * Fetches from GET /api/flights/departures?countryCode=US&tripType={tripType}
 *
 * Detroit/DTW is always listed first due to highest US Muslim community density.
 * Each airport pill is accessible: role="radio", aria-checked, minHeight 44px.
 */

import { useState, useEffect } from 'react';

interface DepartureAirport {
  iata:      string;
  city:      string;
  name:      string;
  state:     string;
  muslimPop: 'very_large' | 'large' | 'medium';
  note?:     string;
}

interface Props {
  tripType: 'umrah' | 'hajj';
  selected?: string;
  onSelect:  (iata: string) => void;
}

const POP_LABEL: Record<string, string> = {
  very_large: '★ Largest Muslim community',
  large:      'Large Muslim community',
  medium:     'Muslim community',
};

export default function USDepartureSelector({ tripType, selected, onSelect }: Props) {
  const [airports, setAirports] = useState<DepartureAirport[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`/api/flights/departures?countryCode=US&tripType=${tripType}`)
      .then((r) => r.json())
      .then((data) => { setAirports(data.departures ?? []); })
      .catch((err) => console.error('[USDepartureSelector] Failed to load departure airports:', err))
      .finally(() => setLoading(false));
  }, [tripType]);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 w-28 rounded-xl bg-utu-bg-muted animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (!airports.length) return null;

  return (
    <div
      className="space-y-2"
      role="radiogroup"
      aria-label={`US departure airports for ${tripType}`}
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {airports.map((ap) => {
          const isActive = selected === ap.iata;
          return (
            <button
              key={ap.iata}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(ap.iata)}
              className={[
                'flex-shrink-0 rounded-xl px-3 py-2 text-left min-h-[44px] min-w-[100px] transition-colors border',
                isActive
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-utu-border-default bg-utu-bg-card text-utu-text-secondary hover:border-emerald-300 hover:bg-emerald-50/50',
              ].join(' ')}
            >
              <p className="text-base font-bold leading-none">{ap.iata}</p>
              <p className="text-xs text-utu-text-muted mt-0.5 truncate max-w-[120px]">{ap.city}</p>
              {ap.muslimPop === 'very_large' && (
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5 truncate max-w-[120px]">
                  {POP_LABEL[ap.muslimPop]}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-xs text-utu-text-muted">
          {airports.find((a) => a.iata === selected)?.name}
          {' · '}{airports.find((a) => a.iata === selected)?.state}
        </p>
      )}
    </div>
  );
}
