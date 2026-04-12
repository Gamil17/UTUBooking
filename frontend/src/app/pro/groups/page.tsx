'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployees, getTripGroups, getGroupBookings, createBulkBooking, updateTripGroup, cancelTripGroup,
  type CorporateEmployee, type CorporateTripGroup, type BookingType, type FlightClass,
  type BulkBookingResult,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sarFmt(n?: number | null) {
  if (!n) return '—';
  return `SAR ${Math.round(n).toLocaleString()}`;
}

function passportExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const diff = new Date(expiry).getTime() - Date.now();
  return diff < 6 * 30 * 24 * 60 * 60 * 1000; // < 6 months
}

const STATUS_COLORS: Record<CorporateTripGroup['status'], string> = {
  draft:     'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const FLIGHT_CLASS_LABELS: Record<FlightClass, string> = {
  economy:         'Economy',
  premium_economy: 'Premium Economy',
  business:        'Business Class',
  first:           'First Class',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardStep = 'details' | 'employees' | 'review' | 'done';

interface TripForm {
  name:                        string;
  description:                 string;
  booking_type:                BookingType;
  origin:                      string;
  destination:                 string;
  depart_date:                 string;
  return_date:                 string;
  flight_class:                FlightClass;
  hotel_stars:                 string;
  estimated_cost_sar_per_person: string;
  purpose:                     string;
}

const EMPTY_FORM: TripForm = {
  name:                        '',
  description:                 '',
  booking_type:                'flight',
  origin:                      '',
  destination:                 '',
  depart_date:                 '',
  return_date:                 '',
  flight_class:                'economy',
  hotel_stars:                 '4',
  estimated_cost_sar_per_person: '',
  purpose:                     '',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProGroupsPage() {
  const qc = useQueryClient();

  // List state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailGroup, setDetailGroup]   = useState<CorporateTripGroup | null>(null);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep]             = useState<WizardStep>('details');
  const [form, setForm]             = useState<TripForm>(EMPTY_FORM);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [empSearch, setEmpSearch]   = useState('');
  const [formError, setFormError]   = useState('');
  const [result, setResult]         = useState<BulkBookingResult | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: groupData, isLoading } = useQuery({
    queryKey: ['portal-groups', statusFilter],
    queryFn:  () => getTripGroups({ status: statusFilter || undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const groups: CorporateTripGroup[] = (groupData as any)?.data ?? [];
  const total: number = (groupData as any)?.total ?? 0;

  const { data: empData } = useQuery({
    queryKey: ['portal-employees-all'],
    queryFn:  () => getEmployees({ status: 'active', limit: 500 }),
    staleTime: 60_000,
    enabled: showWizard,
  });
  const allEmployees: CorporateEmployee[] = (empData as any)?.data ?? [];

  const { data: detailData } = useQuery({
    queryKey: ['portal-group-bookings', detailGroup?.id],
    queryFn:  () => getGroupBookings(detailGroup!.id),
    enabled:  !!detailGroup,
    staleTime: 30_000,
  });
  const groupBookings = (detailData as any)?.data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const bulkMut = useMutation({
    mutationFn: createBulkBooking,
    onSuccess: (res: any) => {
      setResult(res.data ?? res);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['portal-groups'] });
      qc.invalidateQueries({ queryKey: ['portal-bookings'] });
    },
    onError: (e: any) => setFormError(e?.message || 'Booking failed. Please try again.'),
  });

  const cancelMut = useMutation({
    mutationFn: cancelTripGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-groups'] });
      setDetailGroup(null);
    },
  });

  const confirmMut = useMutation({
    mutationFn: ({ id }: { id: string }) => updateTripGroup(id, { status: 'confirmed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-groups'] });
      setDetailGroup(null);
    },
  });

  // ── Wizard helpers ────────────────────────────────────────────────────────

  function openWizard() {
    setForm(EMPTY_FORM);
    setSelectedIds(new Set());
    setEmpSearch('');
    setFormError('');
    setResult(null);
    setStep('details');
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    setStep('details');
    setForm(EMPTY_FORM);
    setSelectedIds(new Set());
    setFormError('');
    setResult(null);
  }

  function validateDetails(): string {
    if (!form.name.trim())        return 'Please enter a trip name.';
    if (!form.destination.trim()) return 'Please enter a destination.';
    if (!form.depart_date)        return 'Please select a departure / check-in date.';
    if (form.booking_type === 'flight' && !form.origin.trim()) return 'Please enter an origin city or airport.';
    return '';
  }

  function goToEmployees() {
    const err = validateDetails();
    if (err) { setFormError(err); return; }
    setFormError('');
    setStep('employees');
  }

  function goToReview() {
    if (selectedIds.size < 2) { setFormError('Please select at least 2 employees.'); return; }
    setFormError('');
    setStep('review');
  }

  function submitBooking() {
    bulkMut.mutate({
      name:                         form.name,
      description:                  form.description || undefined,
      booking_type:                 form.booking_type,
      origin:                       form.booking_type === 'flight' ? form.origin : undefined,
      destination:                  form.destination,
      depart_date:                  form.depart_date,
      return_date:                  form.return_date || undefined,
      flight_class:                 form.booking_type === 'flight' ? form.flight_class : undefined,
      hotel_stars:                  form.booking_type === 'hotel' ? parseInt(form.hotel_stars) : undefined,
      estimated_cost_sar_per_person: form.estimated_cost_sar_per_person
                                      ? parseFloat(form.estimated_cost_sar_per_person) : undefined,
      purpose:                      form.purpose || undefined,
      employee_ids:                 Array.from(selectedIds),
    });
  }

  // Filtered employees for step 2
  const filteredEmployees = empSearch.trim()
    ? allEmployees.filter(e =>
        e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.email.toLowerCase().includes(empSearch.toLowerCase()) ||
        (e.department ?? '').toLowerCase().includes(empSearch.toLowerCase())
      )
    : allEmployees;

  // Passport warnings for selected employees (review step)
  const selectedEmployees = allEmployees.filter(e => selectedIds.has(e.id));
  const passportWarnings  = selectedEmployees.filter(e => !e.passport_number || passportExpiringSoon(e.passport_expiry));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-utu-text-primary">Group Travel</h1>
          <p className="text-sm text-utu-text-muted mt-1">
            Book flights or hotels for multiple employees in a single transaction.
          </p>
        </div>
        <button
          onClick={openWizard}
          className="rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          + New Group Trip
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'draft', 'confirmed', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors capitalize ${
              statusFilter === s
                ? 'bg-utu-navy border-utu-navy text-white'
                : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
            }`}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>}

      {/* Empty */}
      {!isLoading && groups.length === 0 && (
        <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card p-12 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-utu-blue text-2xl" aria-hidden="true">&#128101;</span>
          </div>
          <p className="font-semibold text-utu-text-primary">No group trips yet</p>
          <p className="text-sm text-utu-text-muted mt-1">
            Create your first group booking to send multiple employees on the same trip.
          </p>
          <button
            onClick={openWizard}
            className="mt-5 rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold px-5 py-2.5 text-sm transition-colors"
          >
            + New Group Trip
          </button>
        </div>
      )}

      {/* Trip group list */}
      {groups.length > 0 && (
        <>
          <p className="text-xs text-utu-text-muted">{total} trip group{total !== 1 ? 's' : ''}</p>
          <div className="space-y-3">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setDetailGroup(g)}
                className="w-full text-start bg-utu-bg-card rounded-xl border border-utu-border-default shadow-sm p-5 hover:border-utu-blue transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-utu-text-primary truncate">{g.name}</p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[g.status]}`}>
                        {g.status}
                      </span>
                    </div>
                    <p className="text-sm text-utu-text-secondary">
                      {g.booking_type === 'flight' && g.origin
                        ? `${g.origin} → ${g.destination}`
                        : g.destination}
                      {g.flight_class ? ` · ${FLIGHT_CLASS_LABELS[g.flight_class]}` : ''}
                    </p>
                    <p className="text-xs text-utu-text-muted mt-1">
                      {fmtDate(g.depart_date)}
                      {g.return_date ? ` — ${fmtDate(g.return_date)}` : ''}
                      {g.purpose ? ` · ${g.purpose}` : ''}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-semibold text-utu-text-primary">{sarFmt(g.total_spend_sar)}</p>
                    <p className="text-xs text-utu-text-muted mt-0.5">{g.traveler_count} traveller{g.traveler_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Wizard ──────────────────────────────────────────────────────────── */}

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={step !== 'done' ? undefined : closeWizard} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

            {/* Wizard header */}
            {step !== 'done' && (
              <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-utu-text-primary">New Group Trip</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    {(['details', 'employees', 'review'] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                          step === s
                            ? 'bg-utu-navy border-utu-navy text-white'
                            : ['employees', 'review'].indexOf(step) > i
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-utu-border-default text-utu-text-muted'
                        }`}>{i + 1}</span>
                        <span className={`text-xs ${step === s ? 'font-medium text-utu-text-primary' : 'text-utu-text-muted'} capitalize`}>{s}</span>
                        {i < 2 && <span className="text-utu-border-default text-xs">›</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={closeWizard} className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
              </div>
            )}

            {/* ── Step 1: Trip Details ──── */}
            {step === 'details' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Booking type toggle */}
                <div>
                  <p className="text-xs font-medium text-utu-text-muted mb-1.5">Booking Type</p>
                  <div className="flex rounded-xl overflow-hidden border border-utu-border-default">
                    {(['flight', 'hotel'] as BookingType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, booking_type: t }))}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                          form.booking_type === t
                            ? 'bg-utu-navy text-white'
                            : 'text-utu-text-secondary hover:bg-utu-bg-subtle'
                        }`}
                      >
                        {t === 'flight' ? '✈ Flight' : '🏨 Hotel'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trip name */}
                <div>
                  <label className="block text-xs font-medium text-utu-text-muted mb-1">Trip Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Riyadh Sales Summit Q3, Hajj Group 2026"
                    className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  />
                </div>

                {/* Route / destination */}
                {form.booking_type === 'flight' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-utu-text-muted mb-1">From *</label>
                      <input
                        value={form.origin}
                        onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                        placeholder="RUH, JED, DXB…"
                        className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-utu-text-muted mb-1">To *</label>
                      <input
                        value={form.destination}
                        onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                        placeholder="MKK, CAI, LON…"
                        className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1">Destination City *</label>
                    <input
                      value={form.destination}
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                      placeholder="Makkah, Dubai, Riyadh…"
                      className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                    />
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1">
                      {form.booking_type === 'hotel' ? 'Check-in *' : 'Departure *'}
                    </label>
                    <input
                      type="date"
                      value={form.depart_date}
                      onChange={e => setForm(f => ({ ...f, depart_date: e.target.value }))}
                      className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1">
                      {form.booking_type === 'hotel' ? 'Check-out' : 'Return'}
                    </label>
                    <input
                      type="date"
                      value={form.return_date}
                      onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))}
                      className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                    />
                  </div>
                </div>

                {/* Cabin class / hotel stars */}
                {form.booking_type === 'flight' ? (
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1.5">Cabin Class</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(FLIGHT_CLASS_LABELS) as [FlightClass, string][]).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setForm(f => ({ ...f, flight_class: v }))}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                            form.flight_class === v
                              ? 'border-utu-blue bg-blue-50 text-utu-blue'
                              : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1.5">Hotel Stars</label>
                    <div className="flex gap-2">
                      {[3, 4, 5].map(s => (
                        <button
                          key={s}
                          onClick={() => setForm(f => ({ ...f, hotel_stars: String(s) }))}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            form.hotel_stars === String(s)
                              ? 'border-utu-blue bg-blue-50 text-utu-blue'
                              : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
                          }`}
                        >
                          {'★'.repeat(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost + purpose */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1">Est. Cost / Person (SAR)</label>
                    <input
                      type="number"
                      value={form.estimated_cost_sar_per_person}
                      onChange={e => setForm(f => ({ ...f, estimated_cost_sar_per_person: e.target.value }))}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-utu-text-muted mb-1">Business Purpose</label>
                    <input
                      value={form.purpose}
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                      placeholder="Hajj, conference…"
                      className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                    />
                  </div>
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <button
                  onClick={goToEmployees}
                  className="w-full rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold py-3 text-sm transition-colors"
                >
                  Next: Select Travellers
                </button>
              </div>
            )}

            {/* ── Step 2: Employee Multi-Select ──── */}
            {step === 'employees' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4 pb-3 border-b border-utu-border-default shrink-0">
                  <p className="text-sm text-utu-text-secondary mb-2">
                    Select travellers for <span className="font-medium text-utu-text-primary">{form.name}</span>.
                    Choose at least 2.
                  </p>
                  <input
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Search by name, email, or department…"
                    className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  />
                  <p className="text-xs text-utu-text-muted mt-2">
                    {selectedIds.size} selected · {allEmployees.length} employees
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
                  {filteredEmployees.length === 0 && (
                    <p className="text-sm text-utu-text-muted py-8 text-center">No employees match your search.</p>
                  )}
                  {filteredEmployees.map(e => {
                    const checked     = selectedIds.has(e.id);
                    const noPassport  = !e.passport_number;
                    const expiring    = passportExpiringSoon(e.passport_expiry);
                    return (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                            return next;
                          });
                        }}
                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border text-start transition-colors ${
                          checked
                            ? 'border-utu-blue bg-blue-50'
                            : 'border-utu-border-default hover:bg-utu-bg-subtle'
                        }`}
                      >
                        {/* Checkbox */}
                        <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          checked ? 'bg-utu-blue border-utu-blue' : 'border-utu-border-default'
                        }`}>
                          {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                        </span>

                        {/* Employee info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-utu-text-primary truncate">{e.name}</p>
                          <p className="text-xs text-utu-text-muted truncate">
                            {e.email}
                            {e.department ? ` · ${e.department}` : ''}
                            {e.job_title ? ` · ${e.job_title}` : ''}
                          </p>
                        </div>

                        {/* Warnings */}
                        {(noPassport || expiring) && (
                          <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${
                            noPassport
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {noPassport ? 'No passport' : 'Passport expiring'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="px-6 py-4 border-t border-utu-border-default shrink-0 space-y-2">
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setFormError(''); setStep('details'); }}
                      className="flex-1 rounded-xl border border-utu-border-default text-utu-text-secondary font-medium py-3 text-sm hover:bg-utu-bg-subtle transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={goToReview}
                      className="flex-1 rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold py-3 text-sm transition-colors"
                    >
                      Review Trip ({selectedIds.size} travellers)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Review ──── */}
            {step === 'review' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Trip summary */}
                <div className="rounded-xl bg-utu-bg-card border border-utu-border-default p-5 space-y-3">
                  <p className="text-sm font-semibold text-utu-text-primary">{form.name}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <RRow label="Type"><span className="capitalize">{form.booking_type}</span></RRow>
                    {form.booking_type === 'flight'
                      ? <RRow label="Route">{form.origin} → {form.destination}</RRow>
                      : <RRow label="Destination">{form.destination}</RRow>}
                    <RRow label={form.booking_type === 'hotel' ? 'Check-in' : 'Depart'}>{fmtDate(form.depart_date)}</RRow>
                    {form.return_date && <RRow label={form.booking_type === 'hotel' ? 'Check-out' : 'Return'}>{fmtDate(form.return_date)}</RRow>}
                    {form.booking_type === 'flight' && <RRow label="Cabin">{FLIGHT_CLASS_LABELS[form.flight_class]}</RRow>}
                    {form.booking_type === 'hotel' && <RRow label="Stars">{'★'.repeat(parseInt(form.hotel_stars))}</RRow>}
                    <RRow label="Travellers">{selectedIds.size} employees</RRow>
                    {form.estimated_cost_sar_per_person && (
                      <RRow label="Est. Total">
                        SAR {(parseFloat(form.estimated_cost_sar_per_person) * selectedIds.size).toLocaleString()}
                      </RRow>
                    )}
                    {form.purpose && <RRow label="Purpose">{form.purpose}</RRow>}
                  </div>
                </div>

                {/* Passport warnings */}
                {passportWarnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold text-amber-800 mb-2">
                      Passport Warnings — {passportWarnings.length} employee{passportWarnings.length !== 1 ? 's' : ''}
                    </p>
                    <ul className="space-y-1">
                      {passportWarnings.map(e => (
                        <li key={e.id} className="text-xs text-amber-700 flex items-center gap-1.5">
                          <span aria-hidden="true">⚠</span>
                          <span className="font-medium">{e.name}</span>
                          {!e.passport_number
                            ? ' — no passport on file'
                            : ` — expires ${fmtDate(e.passport_expiry)}`}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-700 mt-2">
                      You can still proceed. Ensure passports are updated before travel.
                    </p>
                  </div>
                )}

                {/* Traveller list */}
                <div>
                  <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">
                    Travellers ({selectedIds.size})
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedEmployees.map(e => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg bg-utu-bg-card border border-utu-border-default px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-utu-text-primary">{e.name}</span>
                          {e.department && <span className="text-utu-text-muted ms-2">{e.department}</span>}
                        </div>
                        {!e.passport_number
                          ? <span className="text-red-600 font-medium">No passport</span>
                          : passportExpiringSoon(e.passport_expiry)
                            ? <span className="text-amber-600">Expiring {fmtDate(e.passport_expiry)}</span>
                            : <span className="text-green-600">Passport OK</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {bulkMut.isError && (
                  <p className="text-sm text-red-600">{(bulkMut.error as any)?.message || 'Booking failed. Please try again.'}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('employees')}
                    className="flex-1 rounded-xl border border-utu-border-default text-utu-text-secondary font-medium py-3 text-sm hover:bg-utu-bg-subtle transition-colors"
                  >
                    Back
                  </button>
                  <button
                    disabled={bulkMut.isPending}
                    onClick={submitBooking}
                    className="flex-1 rounded-xl bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-semibold py-3 text-sm transition-colors"
                  >
                    {bulkMut.isPending ? 'Booking…' : `Confirm ${selectedIds.size} Bookings`}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Done ──── */}
            {step === 'done' && result && (
              <div className="px-6 py-8 space-y-5 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-green-600 text-2xl" aria-hidden="true">&#10003;</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-utu-text-primary">Group Trip Created</h2>
                  <p className="text-sm text-utu-text-muted mt-1">
                    {result.group.traveler_count} bookings submitted for{' '}
                    <span className="font-medium text-utu-text-primary">{result.group.name}</span>.
                  </p>
                </div>

                {result.discount_applied_pct > 0 && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-full px-4 py-1.5 inline-block">
                    {result.discount_applied_pct}% corporate discount applied
                  </p>
                )}

                {result.approval_required && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-start">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Approval Required</p>
                    <p className="text-xs text-amber-700">
                      One or more bookings are out of policy and require approval before they are confirmed.
                      Your travel manager will be notified.
                    </p>
                  </div>
                )}

                {result.passport_warnings && result.passport_warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-start">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Passport Action Required</p>
                    <ul className="space-y-1">
                      {result.passport_warnings.map(w => (
                        <li key={w.employee_id} className="text-xs text-amber-700 flex items-center gap-1.5">
                          <span>⚠</span>
                          <span className="font-medium">{w.name}</span>
                          {' — passport expires '}{fmtDate(w.passport_expiry)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={closeWizard}
                  className="w-full rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold py-3 text-sm transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Group Detail Slide Panel ──────────────────────────────────────── */}

      {detailGroup && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailGroup(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-utu-text-primary truncate">{detailGroup.name}</h2>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize mt-1 ${STATUS_COLORS[detailGroup.status]}`}>
                  {detailGroup.status}
                </span>
              </div>
              <button onClick={() => setDetailGroup(null)} className="text-utu-text-muted hover:text-utu-text-primary text-lg shrink-0 ms-4">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Trip summary */}
              <div className="rounded-xl bg-utu-bg-card border border-utu-border-default p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <RRow label="Destination">
                    {detailGroup.booking_type === 'flight' && detailGroup.origin
                      ? `${detailGroup.origin} → ${detailGroup.destination}`
                      : detailGroup.destination}
                  </RRow>
                  <RRow label="Depart">{fmtDate(detailGroup.depart_date)}</RRow>
                  {detailGroup.return_date && <RRow label="Return">{fmtDate(detailGroup.return_date)}</RRow>}
                  {detailGroup.flight_class && <RRow label="Cabin">{FLIGHT_CLASS_LABELS[detailGroup.flight_class]}</RRow>}
                  <RRow label="Travellers">{detailGroup.traveler_count}</RRow>
                  <RRow label="Total Spend">{sarFmt(detailGroup.total_spend_sar)}</RRow>
                  {detailGroup.purpose && <RRow label="Purpose">{detailGroup.purpose}</RRow>}
                </div>
              </div>

              {/* Individual bookings */}
              <div>
                <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">
                  Travellers
                </p>
                {groupBookings.length === 0 ? (
                  <p className="text-xs text-utu-text-muted py-4 text-center">Loading bookings…</p>
                ) : (
                  <div className="space-y-2">
                    {groupBookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between rounded-xl bg-utu-bg-card border border-utu-border-default px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-utu-text-primary">{b.employee_name}</p>
                          <p className="text-xs text-utu-text-muted mt-0.5">
                            {b.employee_dept ?? '—'}
                            {b.passport_expiry ? ` · passport ${fmtDate(b.passport_expiry)}` : ' · no passport'}
                          </p>
                        </div>
                        <div className="text-end shrink-0 ms-3">
                          <p className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full border ${
                            b.status === 'confirmed'     ? 'bg-green-50 text-green-700 border-green-200'
                            : b.status === 'pending'    ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : b.status === 'cancelled'  ? 'bg-gray-100 text-gray-500 border-gray-200'
                                                        : 'bg-blue-50 text-utu-blue border-blue-200'
                          }`}>
                            {b.status}
                          </p>
                          {b.estimated_cost_sar && (
                            <p className="text-xs text-utu-text-muted mt-1">{sarFmt(b.estimated_cost_sar)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {detailGroup.status === 'draft' && (
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={confirmMut.isPending}
                    onClick={() => confirmMut.mutate({ id: detailGroup.id })}
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition-colors"
                  >
                    {confirmMut.isPending ? 'Confirming…' : 'Confirm Trip'}
                  </button>
                  <button
                    disabled={cancelMut.isPending}
                    onClick={() => cancelMut.mutate(detailGroup.id)}
                    className="flex-1 rounded-xl border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 font-medium py-2.5 text-sm transition-colors"
                  >
                    {cancelMut.isPending ? 'Cancelling…' : 'Cancel Trip'}
                  </button>
                </div>
              )}
              {detailGroup.status === 'confirmed' && (
                <button
                  disabled={cancelMut.isPending}
                  onClick={() => cancelMut.mutate(detailGroup.id)}
                  className="w-full rounded-xl border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 font-medium py-2.5 text-sm transition-colors"
                >
                  {cancelMut.isPending ? 'Cancelling…' : 'Cancel Trip'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────────

function RRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="font-medium text-utu-text-primary mt-0.5 text-sm">{children}</p>
    </div>
  );
}
