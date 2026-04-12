'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminInventoryHotels,
  getAdminInventoryFlights,
  getAdminInventoryCars,
  toggleAdminInventoryHotel,
  type InventoryHotel,
  type InventoryFlight,
  type InventoryCar,
  getInventoryAdvice, analyzeInventory, type InventoryAdvice,
} from '@/lib/api';

const PAGE_SIZE = 50;

// ─── AI Inventory Advisor Panel ───────────────────────────────────────────────

const INV_HEALTH_BADGE: Record<string, string> = {
  excellent: 'border-green-300  bg-green-50  text-green-700',
  good:      'border-blue-200   bg-blue-50   text-blue-700',
  fair:      'border-amber-200  bg-amber-50  text-amber-700',
  poor:      'border-red-200    bg-red-50    text-red-700',
};
const INV_PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-red-200    bg-red-50    text-red-700',
  high:     'border-amber-200  bg-amber-50  text-amber-700',
  medium:   'border-blue-200   bg-blue-50   text-blue-700',
  low:      'border-gray-200   bg-gray-50   text-gray-600',
};

function AIInventoryAdvisorPanel() {
  const [advice,  setAdvice]  = useState<InventoryAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getInventoryAdvice()
      .then(r => { if (!cancelled) { setAdvice(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeInventory();
      if (res.data) setAdvice(res.data);
      else setError('Analysis failed. Please try again.');
    } catch { setError('Failed to run analysis.'); }
    finally { setRunning(false); }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 mb-4">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Inventory Advisor</span>
          {advice && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${INV_HEALTH_BADGE[advice.inventory_health] ?? ''}`}>
              {advice.inventory_health}
            </span>
          )}
          {advice && (
            <span className="text-xs text-violet-500">
              {advice.total_hotels} hotels · {advice.total_flights} flights · {advice.total_cars} cars
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading inventory analysis…</p>}

          {!loading && !advice && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                Run AI Inventory Advisor to surface Makkah/Madinah coverage gaps, flight route analysis, pricing flags, and Hajj/Umrah readiness assessment.
              </p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Inventory Analysis'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {advice && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{advice.executive_summary}</p>

              {advice.coverage_gaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Coverage Gaps</h3>
                  <div className="space-y-2">
                    {advice.coverage_gaps.map((g, i) => (
                      <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs font-semibold text-red-800">{g.gap} <span className="font-normal text-red-600">— {g.location_or_route}</span></p>
                        <p className="text-xs text-red-600 mt-0.5">Impact: {g.impact}</p>
                        <p className="text-xs text-red-500 mt-0.5 italic">Fix: {g.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {advice.hotel_insights.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">🏨 Hotels</h3>
                    <div className="space-y-1.5">
                      {advice.hotel_insights.map((h, i) => (
                        <div key={i} className={`rounded-lg border px-2.5 py-2 ${INV_PRIORITY_COLORS[h.priority] ?? ''}`}>
                          <p className="text-xs font-semibold capitalize">{h.priority}</p>
                          <p className="text-xs mt-0.5">{h.finding}</p>
                          <p className="text-xs mt-0.5 italic opacity-80">{h.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {advice.flight_insights.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">✈️ Flights</h3>
                    <div className="space-y-1.5">
                      {advice.flight_insights.map((f, i) => (
                        <div key={i} className={`rounded-lg border px-2.5 py-2 ${INV_PRIORITY_COLORS[f.priority] ?? ''}`}>
                          <p className="text-xs font-semibold capitalize">{f.priority}</p>
                          <p className="text-xs mt-0.5">{f.finding}</p>
                          <p className="text-xs mt-0.5 italic opacity-80">{f.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {advice.car_insights.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">🚗 Cars</h3>
                    <div className="space-y-1.5">
                      {advice.car_insights.map((c, i) => (
                        <div key={i} className={`rounded-lg border px-2.5 py-2 ${INV_PRIORITY_COLORS[c.priority] ?? ''}`}>
                          <p className="text-xs font-semibold capitalize">{c.priority}</p>
                          <p className="text-xs mt-0.5">{c.finding}</p>
                          <p className="text-xs mt-0.5 italic opacity-80">{c.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {advice.hajj_umrah_readiness && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <p className="text-xs font-semibold text-green-800 mb-1">Hajj & Umrah Readiness</p>
                  <p className="text-xs text-green-700">{advice.hajj_umrah_readiness}</p>
                </div>
              )}

              {advice.pricing_flags.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <p className="text-xs font-semibold text-orange-800 mb-1">Pricing Flags</p>
                  <ul className="space-y-0.5">
                    {advice.pricing_flags.map((f, i) => <li key={i} className="text-xs text-orange-700">• {f}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.quick_wins.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Quick Wins</h3>
                    <ul className="space-y-1">
                      {advice.quick_wins.map((w, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary before:content-['→'] before:mr-1.5 before:text-green-500">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {advice.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {advice.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary before:content-['✓'] before:mr-1.5 before:text-violet-500">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                <p className="text-xs text-violet-400">Last run: {new Date(advice.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <button onClick={handleAnalyze} disabled={running}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {running ? 'Refreshing…' : '↺ Refresh'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Hotels Tab ─────────────────────────────────────────────────────────────────
function HotelsTab() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [offset, setOffset]         = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebounced(val); setOffset(0); }, 350);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory-hotels', debouncedSearch, offset],
    queryFn:  () => getAdminInventoryHotels({ search: debouncedSearch || undefined, limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleAdminInventoryHotel(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-inventory-hotels'] }),
  });

  const hotels: InventoryHotel[] = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search hotels by name or location..."
          className="w-72 rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        {data && (
          <span className="text-sm text-utu-text-muted">{data.total.toLocaleString()} hotels</span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading...</div>}
        {isError  && <div className="p-10 text-center text-sm text-red-500">Failed to load hotels.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Name', 'Location', 'Stars', 'Distance (m)', 'Price/night', 'Flags', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {hotels.map((h) => (
                  <tr key={h.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-sm font-medium text-utu-text-primary">
                      {h.name}
                      {h.name_ar && <span className="ms-1 text-xs text-utu-text-muted font-arabic">({h.name_ar})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{h.location}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted">{h.stars ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted">
                      {h.distance_haram_m != null ? h.distance_haram_m.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">
                      {h.price_per_night.toLocaleString()} {h.currency}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {h.is_hajj_package   && <span className="rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">Hajj</span>}
                        {h.is_umrah_package  && <span className="rounded bg-teal-100  px-1 py-0.5 text-xs text-teal-700">Umrah</span>}
                        {h.is_halal_friendly && <span className="rounded bg-green-100 px-1 py-0.5 text-xs text-green-700">Halal</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={h.is_active} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate(h.id)}
                        disabled={toggleMutation.isPending}
                        className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium
                                   text-utu-text-secondary hover:bg-utu-bg-muted transition-colors disabled:opacity-40"
                      >
                        {h.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {hotels.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-utu-text-muted">No hotels found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >Previous</button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Flights Tab ────────────────────────────────────────────────────────────────
function FlightsTab() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory-flights', offset],
    queryFn:  () => getAdminInventoryFlights({ limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const flights: InventoryFlight[] = data?.rows ?? [];

  return (
    <div className="space-y-4">
      {data && <span className="text-sm text-utu-text-muted">{data.total.toLocaleString()} flights</span>}

      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading...</div>}
        {isError  && <div className="p-10 text-center text-sm text-red-500">Failed to load flights.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Flight', 'Airline', 'Route', 'Departure', 'Cabin', 'Seats', 'Price', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {flights.map((f) => (
                  <tr key={f.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-sm font-mono text-utu-text-primary">{f.flight_num}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{f.airline_code}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{f.origin} → {f.dest}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">{formatDate(f.departure)}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted capitalize">{f.cabin_class}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{f.seats_available}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{f.price.toLocaleString()} {f.currency}</td>
                    <td className="px-4 py-3"><StatusBadge active={f.is_active} /></td>
                  </tr>
                ))}
                {flights.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-utu-text-muted">No flights found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cars Tab ───────────────────────────────────────────────────────────────────
function CarsTab() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory-cars', offset],
    queryFn:  () => getAdminInventoryCars({ limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const cars: InventoryCar[] = data?.rows ?? [];

  return (
    <div className="space-y-4">
      {data && <span className="text-sm text-utu-text-muted">{data.total.toLocaleString()} cars</span>}

      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading...</div>}
        {isError  && <div className="p-10 text-center text-sm text-red-500">Failed to load cars.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Vendor', 'Model', 'Type', 'Seats', 'Pickup', 'Price/day', 'Available', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {cars.map((c) => (
                  <tr key={c.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-sm font-medium text-utu-text-primary">{c.vendor_name}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{c.model}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted capitalize">{c.vehicle_type}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-muted">{c.seats}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{c.pickup_location}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{c.price_per_day.toLocaleString()} {c.currency}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {formatDate(c.available_from)} — {formatDate(c.available_to)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={c.is_active} /></td>
                  </tr>
                ))}
                {cars.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-utu-text-muted">No cars found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of {data.total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Previous</button>
            <button onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const TABS = ['Hotels', 'Flights', 'Cars'] as const;
type Tab = typeof TABS[number];

export default function AdminInventoryPage() {
  const [tab, setTab] = useState<Tab>('Hotels');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Inventory</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          View and toggle active status for hotels, flights, and car offers.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-utu-border-default bg-utu-bg-muted p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-utu-bg-card text-utu-text-primary shadow-sm'
                : 'text-utu-text-muted hover:text-utu-text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AIInventoryAdvisorPanel />
      {tab === 'Hotels'  && <HotelsTab />}
      {tab === 'Flights' && <FlightsTab />}
      {tab === 'Cars'    && <CarsTab />}
    </div>
  );
}
