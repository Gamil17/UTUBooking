'use client';

import { useState } from 'react';

const PROPERTY_TYPES = [
  { value: 'hotel',      label: 'Hotel' },
  { value: 'apartment',  label: 'Furnished Apartment' },
  { value: 'resort',     label: 'Resort' },
  { value: 'guesthouse', label: 'Guesthouse / Pilgrim House' },
  { value: 'other',      label: 'Other' },
];

const STARS = ['1', '2', '3', '4', '5'];

const GCC_COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'QA', name: 'Qatar' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' },
  { code: 'EG', name: 'Egypt' },
  { code: 'JO', name: 'Jordan' },
  { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'OTHER', name: 'Other' },
];

const OTA_OPTIONS = [
  'Booking.com', 'Agoda', 'Expedia', 'Hotels.com', 'Almosafer', 'Wego', 'Airbnb', 'None',
];

interface FormState {
  hotel_name:    string;
  contact_name:  string;
  contact_email: string;
  phone:         string;
  property_type: string;
  city:          string;
  country:       string;
  stars:         string;
  room_count:    string;
  otas:          string[];
  message:       string;
  consent:       boolean;
}

const EMPTY: FormState = {
  hotel_name:    '',
  contact_name:  '',
  contact_email: '',
  phone:         '',
  property_type: '',
  city:          '',
  country:       '',
  stars:         '',
  room_count:    '',
  otas:          [],
  message:       '',
  consent:       false,
};

export default function HotelPartnerForm() {
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<'idle' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg]   = useState('');

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleOta(ota: string) {
    setForm((prev) => ({
      ...prev,
      otas: prev.otas.includes(ota)
        ? prev.otas.filter((o) => o !== ota)
        : [...prev.otas, ota],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) { setErrMsg('Please confirm you agree to be contacted.'); return; }
    setLoading(true);
    setErrMsg('');

    try {
      const res = await fetch('/api/hotel-partners/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const json = await res.json().catch(() => ({}));
        setErrMsg(json.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-10 text-center">
        <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-utu-text-primary mb-2">Request Received</h2>
        <p className="text-utu-text-muted text-sm max-w-sm mx-auto">
          Thank you for your interest in listing on UTUBooking. Our partnerships team will review your property and be in touch within 2 business days.
        </p>
        <p className="text-utu-text-muted text-sm mt-4">
          Questions?{' '}
          <a href="mailto:partners@utubooking.com" className="text-utu-blue hover:underline">
            partners@utubooking.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 md:p-8 space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-utu-text-primary">Property Application</h2>
        <p className="text-utu-text-muted text-sm mt-1">
          Complete the form below to apply. We review every submission personally.
        </p>
      </div>

      {/* Property details */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-utu-text-primary mb-3 block">Property Information</legend>

        <div>
          <label htmlFor="hotel_name" className="block text-xs font-medium text-utu-text-primary mb-1">
            Hotel / Property Name <span className="text-red-500">*</span>
          </label>
          <input
            id="hotel_name"
            type="text"
            required
            placeholder="e.g. Al Safwah Royale Orchid"
            value={form.hotel_name}
            onChange={(e) => set('hotel_name', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="property_type" className="block text-xs font-medium text-utu-text-primary mb-1">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              id="property_type"
              required
              value={form.property_type}
              onChange={(e) => set('property_type', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              <option value="">Select type</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-utu-text-primary mb-1">Star Rating</label>
            <div className="flex gap-2 pt-1">
              {STARS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('stars', form.stars === s ? '' : s)}
                  className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${
                    form.stars === s
                      ? 'bg-utu-navy text-white border-utu-navy'
                      : 'bg-utu-bg-page border-utu-border-default text-utu-text-muted hover:border-utu-navy'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-xs font-medium text-utu-text-primary mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              required
              placeholder="e.g. Makkah"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-xs font-medium text-utu-text-primary mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
              required
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              <option value="">Select country</option>
              {GCC_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="room_count" className="block text-xs font-medium text-utu-text-primary mb-1">
            Number of Rooms
          </label>
          <input
            id="room_count"
            type="number"
            min="1"
            placeholder="e.g. 120"
            value={form.room_count}
            onChange={(e) => set('room_count', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-utu-text-primary mb-2">
            Current OTA Connections
          </label>
          <div className="flex flex-wrap gap-2">
            {OTA_OPTIONS.map((ota) => (
              <button
                key={ota}
                type="button"
                onClick={() => toggleOta(ota)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  form.otas.includes(ota)
                    ? 'bg-utu-navy text-white border-utu-navy'
                    : 'bg-utu-bg-page border-utu-border-default text-utu-text-muted hover:border-utu-navy'
                }`}
              >
                {ota}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Contact details */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-utu-text-primary mb-3 block">Contact Information</legend>

        <div>
          <label htmlFor="contact_name" className="block text-xs font-medium text-utu-text-primary mb-1">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            id="contact_name"
            type="text"
            required
            placeholder="Full name"
            value={form.contact_name}
            onChange={(e) => set('contact_name', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_email" className="block text-xs font-medium text-utu-text-primary mb-1">
              Work Email <span className="text-red-500">*</span>
            </label>
            <input
              id="contact_email"
              type="email"
              required
              placeholder="you@property.com"
              value={form.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-utu-text-primary mb-1">
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+966 5x xxx xxxx"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-xs font-medium text-utu-text-primary mb-1">
            Additional Information (optional)
          </label>
          <textarea
            id="message"
            rows={4}
            placeholder="Tell us about your property, special features, or any questions you have..."
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-2.5 text-sm text-utu-text-primary placeholder-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue resize-none"
          />
        </div>
      </fieldset>

      {/* Require more assistance? */}
      <div className="rounded-xl bg-utu-bg-page border border-utu-border-default p-4 flex items-start gap-3">
        <span className="text-lg shrink-0" aria-hidden="true">💬</span>
        <div>
          <p className="text-sm font-medium text-utu-text-primary">Require more assistance?</p>
          <p className="text-xs text-utu-text-muted mt-0.5">
            Our partnerships team is available at{' '}
            <a href="mailto:partners@utubooking.com" className="text-utu-blue hover:underline font-medium">
              partners@utubooking.com
            </a>{' '}
            or call{' '}
            <a href="tel:+966112345678" className="text-utu-blue hover:underline font-medium">
              +966 11 234 5678
            </a>
          </p>
        </div>
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => set('consent', e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-utu-border-default accent-utu-navy shrink-0"
        />
        <span className="text-xs text-utu-text-muted leading-relaxed">
          I agree to be contacted by the UTUBooking partnerships team regarding this application. My details will be handled in accordance with the{' '}
          <a href="/privacy" className="text-utu-blue hover:underline">Privacy Policy</a>.
        </span>
      </label>

      {errMsg && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {errMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
      >
        {loading ? 'Sending…' : 'Send Request'}
      </button>
    </form>
  );
}
