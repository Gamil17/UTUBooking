'use client';

import { useState } from 'react';

interface FormState {
  full_name:    string;
  company_name: string;
  work_email:   string;
  phone:        string;
  company_type: string;
  region:       string;
  goal:         string;
  budget_range: string;
  message:      string;
  consent:      boolean;
}

const INITIAL: FormState = {
  full_name:    '',
  company_name: '',
  work_email:   '',
  phone:        '',
  company_type: '',
  region:       '',
  goal:         '',
  budget_range: '',
  message:      '',
  consent:      false,
};

const COMPANY_TYPES = [
  { value: 'tourism_board',      label: 'Tourism Board / DMO' },
  { value: 'airline',            label: 'Airline' },
  { value: 'hotel',              label: 'Hotel / Hospitality' },
  { value: 'ota',                label: 'OTA / Travel Platform' },
  { value: 'attractions',        label: 'Attractions / Experiences' },
  { value: 'car_rental',         label: 'Car Rental' },
  { value: 'travel_tech',        label: 'Travel Tech' },
  { value: 'consumer_brands',    label: 'Consumer Brands' },
  { value: 'financial_payments', label: 'Financial / Payments' },
  { value: 'halal_brands',       label: 'Halal Brands' },
  { value: 'other',              label: 'Other' },
];

const REGIONS = [
  { value: 'saudi_arabia', label: 'Saudi Arabia' },
  { value: 'uae',          label: 'UAE' },
  { value: 'gulf_gcc',     label: 'Gulf / GCC' },
  { value: 'mena',         label: 'MENA' },
  { value: 'muslim_world', label: 'Muslim World' },
  { value: 'se_asia',      label: 'SE Asia' },
  { value: 's_asia',       label: 'South Asia' },
  { value: 'global',       label: 'Global' },
];

const GOALS = [
  { value: 'performance_marketing', label: 'Performance Marketing' },
  { value: 'brand_awareness',       label: 'Brand Awareness' },
  { value: 'lead_generation',       label: 'Lead Generation' },
  { value: 'app_growth',            label: 'App Growth' },
  { value: 'retargeting',           label: 'Retargeting' },
  { value: 'product_launch',        label: 'Product Launch' },
  { value: 'market_entry',          label: 'Market Entry' },
];

const BUDGETS = [
  { value: 'under_10k',    label: 'Under SAR 10,000' },
  { value: '10k_50k',      label: 'SAR 10,000 – 50,000' },
  { value: '50k_200k',     label: 'SAR 50,000 – 200,000' },
  { value: 'over_200k',    label: 'SAR 200,000+' },
  { value: 'lets_discuss', label: "Let's discuss" },
];

const inputCls = 'w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-4 py-3 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:border-utu-blue focus:outline-none focus:ring-2 focus:ring-utu-blue/20 transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

export default function AdvertisingPartnerForm() {
  const [form, setForm]       = useState<FormState>(INITIAL);
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrMsg] = useState('');

  function set(field: keyof FormState, val: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrMsg('');

    try {
      const res = await fetch('/api/advertise/enquiry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });

      if (res.ok) {
        setStatus('success');
        setForm(INITIAL);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrMsg(data.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-utu-border-default p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7 text-green-600" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-utu-text-primary mb-2">Enquiry Received!</h3>
        <p className="text-utu-text-muted text-sm">
          Our partnerships team will review your submission and reach out within 2 business days.
          You should receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-utu-border-default p-6 sm:p-8 space-y-5">

      {/* Contact */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="full_name">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            required
            value={form.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            placeholder="Sara Al-Rashidi"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="company_name">
            Company / Brand <span className="text-red-500">*</span>
          </label>
          <input
            id="company_name"
            type="text"
            required
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
            placeholder="Acme Travel Co."
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="work_email">
            Work Email <span className="text-red-500">*</span>
          </label>
          <input
            id="work_email"
            type="email"
            required
            value={form.work_email}
            onChange={(e) => set('work_email', e.target.value)}
            placeholder="sara@company.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="phone">
            Phone <span className="text-utu-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+966 5x xxx xxxx"
            className={inputCls}
          />
        </div>
      </div>

      {/* Company type */}
      <div>
        <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="company_type">
          Company Type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            id="company_type"
            required
            value={form.company_type}
            onChange={(e) => set('company_type', e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>Select your company type</option>
            {COMPANY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-utu-text-muted" aria-hidden="true">▾</span>
        </div>
      </div>

      {/* Region + Goal */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="region">
            Target Region <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="region"
              required
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              className={selectCls}
            >
              <option value="" disabled>Select region</option>
              {REGIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-utu-text-muted" aria-hidden="true">▾</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="goal">
            Your Goal <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="goal"
              required
              value={form.goal}
              onChange={(e) => set('goal', e.target.value)}
              className={selectCls}
            >
              <option value="" disabled>Select primary goal</option>
              {GOALS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-utu-text-muted" aria-hidden="true">▾</span>
          </div>
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="budget_range">
          Monthly Budget Range <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => set('budget_range', b.value)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold text-center transition-colors ${
                form.budget_range === b.value
                  ? 'border-utu-blue bg-blue-50 text-utu-blue'
                  : 'border-utu-border-default bg-utu-bg-page text-utu-text-secondary hover:border-utu-blue/50'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-1.5" htmlFor="message">
          Tell us about your campaign
          <span className="text-utu-text-muted font-normal normal-case ms-1">(optional)</span>
        </label>
        <textarea
          id="message"
          rows={4}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          placeholder="Describe your product, target audience, campaign timeline, or any specific requirements..."
          className={inputCls}
        />
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => set('consent', e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-utu-border-strong accent-utu-blue"
        />
        <span className="text-xs text-utu-text-muted leading-relaxed">
          I agree to be contacted by UTUBooking regarding advertising and partnership opportunities.
          My information will be handled in accordance with the{' '}
          <a href="/privacy" className="text-utu-blue hover:underline">Privacy Policy</a>.
        </span>
      </label>

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading' || !form.consent || !form.budget_range}
        className="w-full bg-utu-navy hover:bg-utu-blue text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {status === 'loading' ? 'Sending…' : 'Submit Advertising Enquiry'}
      </button>
    </form>
  );
}
