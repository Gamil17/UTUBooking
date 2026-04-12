'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getEmployees, createBooking,
  type CorporateEmployee, type BookingType, type FlightClass,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FLIGHT_CLASS_LABELS: Record<FlightClass, string> = {
  economy:         'Economy',
  premium_economy: 'Premium Economy',
  business:        'Business Class',
  first:           'First Class',
};

const POLICY_FLAG_MESSAGES: Record<string, string> = {
  FLIGHT_CLASS_EXCEEDED: 'Requested cabin class exceeds your company policy.',
  HOTEL_STARS_EXCEEDED:  'Requested hotel rating exceeds your company policy.',
  ADVANCE_BOOKING:       'Booking is within the required advance notice period.',
};

function policyFlagLabel(flag: string): string {
  const code = flag.split(':')[0];
  return POLICY_FLAG_MESSAGES[code] ?? flag;
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Step = 'form' | 'confirm' | 'done';

export default function ProBookPage() {
  const router  = useRouter();
  const [step, setStep] = useState<Step>('form');

  // Form state
  const [bookingType, setBookingType] = useState<BookingType>('flight');
  const [employeeId, setEmployeeId]   = useState('');
  const [origin, setOrigin]           = useState('');
  const [destination, setDestination] = useState('');
  const [departDate, setDepartDate]   = useState('');
  const [returnDate, setReturnDate]   = useState('');
  const [flightClass, setFlightClass] = useState<FlightClass>('economy');
  const [hotelStars, setHotelStars]   = useState('4');
  const [estCost, setEstCost]         = useState('');
  const [purpose, setPurpose]         = useState('');
  const [notes, setNotes]             = useState('');
  const [poRef, setPoRef]             = useState('');
  const [costCenter, setCostCenter]   = useState('');

  // Result state
  const [result, setResult]           = useState<{ id: string; policy_flags: string[]; discount: number } | null>(null);
  const [formError, setFormError]     = useState('');

  // Load employees for the selector
  const { data: empData } = useQuery({
    queryKey: ['portal-employees-all'],
    queryFn: () => getEmployees({ status: 'active', limit: 200 }),
    staleTime: 60_000,
  });
  const employees: CorporateEmployee[] = (empData as any)?.data ?? [];
  const selectedEmployee = employees.find(e => e.id === employeeId) ?? null;

  const bookMut = useMutation({
    mutationFn: createBooking,
    onSuccess: (res: any) => {
      setResult({
        id:          res.data.id,
        policy_flags: res.policy_flags ?? [],
        discount:    res.discount_applied_pct ?? 0,
      });
      setStep('done');
    },
    onError: (e: any) => {
      setFormError(e?.message || 'Booking failed. Please try again.');
    },
  });

  function validate(): string {
    if (!employeeId)      return 'Please select an employee.';
    if (!destination)     return 'Please enter a destination.';
    if (!departDate)      return 'Please select a departure / check-in date.';
    if (bookingType === 'flight' && !origin) return 'Please enter an origin city.';
    return '';
  }

  function handleSubmit() {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError('');
    setStep('confirm');
  }

  function handleConfirm() {
    bookMut.mutate({
      employee_id:        employeeId,
      booking_type:       bookingType,
      origin:             bookingType === 'flight' ? origin : undefined,
      destination,
      depart_date:        departDate,
      return_date:        returnDate || undefined,
      flight_class:       bookingType === 'flight' ? flightClass : undefined,
      hotel_stars:        bookingType === 'hotel' ? parseInt(hotelStars) : undefined,
      estimated_cost_sar: estCost ? parseFloat(estCost) : undefined,
      currency:           'SAR',
      purpose:            purpose || undefined,
      notes:              notes || undefined,
      po_reference:       poRef || undefined,
      cost_center:        costCenter || undefined,
    });
  }

  // ── Done / confirmation ──────────────────────────────────────────────────────

  if (step === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl" aria-hidden="true">&#10003;</span>
          </div>
          <h2 className="text-lg font-bold text-utu-text-primary mb-1">Booking Request Submitted</h2>
          <p className="text-sm text-utu-text-muted mb-2">
            Reference: <span className="font-mono font-medium text-utu-text-primary">{result.id.slice(0, 8).toUpperCase()}</span>
          </p>
          {result.discount > 0 && (
            <p className="text-xs text-green-700 bg-green-50 rounded-full px-3 py-1 inline-block mb-3">
              {result.discount}% corporate discount applied
            </p>
          )}
        </div>

        {result.policy_flags.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800 mb-2">Policy Flags</p>
            <ul className="space-y-1">
              {result.policy_flags.map(f => (
                <li key={f} className="text-xs text-amber-700 flex items-start gap-1.5">
                  <span aria-hidden="true">&#9888;</span>
                  {policyFlagLabel(f)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 mt-2">
              This booking requires approval from your travel manager before it is confirmed.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/pro/bookings')}
            className="flex-1 rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold py-3 text-sm transition-colors"
          >
            View All Bookings
          </button>
          <button
            onClick={() => { setStep('form'); setResult(null); setFormError(''); setEmployeeId(''); setDestination(''); setDepartDate(''); setReturnDate(''); setEstCost(''); setPurpose(''); setNotes(''); setPoRef(''); setCostCenter(''); }}
            className="flex-1 rounded-xl border border-utu-border-default text-utu-text-secondary font-medium py-3 text-sm hover:bg-utu-bg-subtle transition-colors"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  // ── Confirm step ─────────────────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-utu-text-primary">Confirm Booking</h1>
          <p className="text-sm text-utu-text-muted mt-1">Review the details before submitting.</p>
        </div>

        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 space-y-4 shadow-sm">
          <Row label="Employee">
            <span className="font-medium">{selectedEmployee?.name}</span>
            <span className="text-xs text-utu-text-muted ms-2">{selectedEmployee?.email}</span>
          </Row>
          <Row label="Type"><span className="capitalize">{bookingType}</span></Row>
          {bookingType === 'flight' && <Row label="Route">{origin} → {destination}</Row>}
          {bookingType === 'hotel'  && <Row label="Hotel">{destination} · {hotelStars}★</Row>}
          <Row label={bookingType === 'hotel' ? 'Check-in' : 'Depart'}>{departDate}</Row>
          {returnDate && <Row label={bookingType === 'hotel' ? 'Check-out' : 'Return'}>{returnDate}</Row>}
          {bookingType === 'flight' && <Row label="Cabin">{FLIGHT_CLASS_LABELS[flightClass]}</Row>}
          {estCost && <Row label="Est. Cost">SAR {parseFloat(estCost).toLocaleString()}</Row>}
          {purpose     && <Row label="Purpose">{purpose}</Row>}
          {poRef       && <Row label="PO Reference">{poRef}</Row>}
          {costCenter  && <Row label="Cost Center">{costCenter}</Row>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex gap-3">
          <button onClick={() => setStep('form')}
            className="flex-1 rounded-xl border border-utu-border-default text-utu-text-secondary font-medium py-3 text-sm hover:bg-utu-bg-subtle transition-colors">
            Back
          </button>
          <button
            disabled={bookMut.isPending}
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-semibold py-3 text-sm transition-colors"
          >
            {bookMut.isPending ? 'Submitting…' : 'Submit Booking Request'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Book Travel</h1>
        <p className="text-sm text-utu-text-muted mt-1">
          Book a flight or hotel on behalf of an employee.
        </p>
      </div>

      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 space-y-5 shadow-sm">

        {/* Booking type toggle */}
        <div className="flex rounded-xl overflow-hidden border border-utu-border-default">
          {(['flight', 'hotel'] as BookingType[]).map(t => (
            <button
              key={t}
              onClick={() => setBookingType(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                bookingType === t
                  ? 'bg-utu-navy text-white'
                  : 'text-utu-text-secondary hover:bg-utu-bg-subtle'
              }`}
            >
              {t === 'flight' ? '✈ Flight' : '🏨 Hotel'}
            </button>
          ))}
        </div>

        {/* Employee picker */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">Travelling Employee *</label>
          <select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-utu-border-default px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue bg-white"
          >
            <option value="">Select employee…</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}{e.department ? ` — ${e.department}` : ''}
              </option>
            ))}
          </select>
          {selectedEmployee && (
            <p className="text-xs text-utu-text-muted mt-1">
              {selectedEmployee.nationality && `${selectedEmployee.nationality} · `}
              {selectedEmployee.passport_number ? `Passport ${selectedEmployee.passport_number}` : 'No passport on file'}
              {selectedEmployee.meal_preference !== 'standard' && ` · ${selectedEmployee.meal_preference} meal`}
            </p>
          )}
        </div>

        {/* Route / Destination */}
        {bookingType === 'flight' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">From *</label>
              <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="RUH, JED…"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-muted mb-1">To *</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="MKK, DXB…"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Destination City *</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Makkah, Dubai, Riyadh…"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">
              {bookingType === 'hotel' ? 'Check-in *' : 'Departure *'}
            </label>
            <input type="date" value={departDate} onChange={e => setDepartDate(e.target.value)}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">
              {bookingType === 'hotel' ? 'Check-out' : 'Return'}
            </label>
            <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
        </div>

        {/* Type-specific options */}
        {bookingType === 'flight' ? (
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Cabin Class</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FLIGHT_CLASS_LABELS) as [FlightClass, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFlightClass(v)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    flightClass === v
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
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Hotel Stars</label>
            <div className="flex gap-2">
              {[3, 4, 5].map(s => (
                <button key={s} onClick={() => setHotelStars(String(s))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    hotelStars === String(s)
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

        {/* Cost estimate */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">Estimated Cost (SAR)</label>
          <input type="number" value={estCost} onChange={e => setEstCost(e.target.value)} placeholder="Optional"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">Business Purpose</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Conference, client visit, Hajj…"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        </div>

        {/* PO Reference + Cost Center */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">PO Reference</label>
            <input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="PO-2026-001"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Cost Center</label>
            <input value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="OPS-001"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          onClick={handleSubmit}
          className="w-full rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold py-3 text-sm transition-colors"
        >
          Review Booking
        </button>
      </div>
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-utu-text-muted shrink-0 w-24">{label}</span>
      <span className="text-utu-text-primary text-end">{children}</span>
    </div>
  );
}
