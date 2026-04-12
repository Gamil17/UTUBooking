'use client';

import { useState } from 'react';

interface Props {
  labels: {
    heading:          string;
    desc:             string;
    companyName:      string;
    contactName:      string;
    email:            string;
    phone:            string;
    travelers:        string;
    destinations:     string;
    travelDates:      string;
    message:          string;
    submit:           string;
    submitting:       string;
    success:          string;
    error:            string;
  };
}

export default function CorporateEnquiryForm({ labels: l }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fields, setFields] = useState({
    company_name:   '',
    contact_name:   '',
    email:          '',
    phone:          '',
    traveler_count: '1',
    destinations:   '',
    travel_dates:   '',
    message:        '',
  });

  function set(key: keyof typeof fields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/corporate/enquiry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name:   fields.company_name,
          contact_name:   fields.contact_name,
          email:          fields.email,
          phone:          fields.phone          || null,
          traveler_count: parseInt(fields.traveler_count, 10) || 1,
          destinations:   fields.destinations   || null,
          travel_dates:   fields.travel_dates   || null,
          message:        fields.message        || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message || l.error);
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMsg(l.error);
      setStatus('error');
    }
  }

  const inputCls = 'w-full rounded-xl border border-utu-border-default bg-white px-4 py-2.5 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue';

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-10 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-xl" aria-hidden="true">&#10003;</span>
        </div>
        <p className="font-semibold text-green-800">{l.success}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card shadow-sm p-6 md:p-8">
      <h3 className="text-lg font-bold text-utu-text-primary mb-1">{l.heading}</h3>
      <p className="text-sm text-utu-text-muted mb-6">{l.desc}</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.companyName} *</label>
            <input
              required
              value={fields.company_name}
              onChange={e => set('company_name', e.target.value)}
              className={inputCls}
              placeholder="ACME Corporation"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.contactName} *</label>
            <input
              required
              value={fields.contact_name}
              onChange={e => set('contact_name', e.target.value)}
              className={inputCls}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.email} *</label>
            <input
              required
              type="email"
              value={fields.email}
              onChange={e => set('email', e.target.value)}
              className={inputCls}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.phone}</label>
            <input
              type="tel"
              value={fields.phone}
              onChange={e => set('phone', e.target.value)}
              className={inputCls}
              placeholder="+966 5x xxx xxxx"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.travelers}</label>
            <select
              value={fields.traveler_count}
              onChange={e => set('traveler_count', e.target.value)}
              className={inputCls}
            >
              <option value="1">1–5 travelers</option>
              <option value="10">6–20 travelers</option>
              <option value="50">21–100 travelers</option>
              <option value="200">100+ travelers</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.travelDates}</label>
            <input
              value={fields.travel_dates}
              onChange={e => set('travel_dates', e.target.value)}
              className={inputCls}
              placeholder="e.g. Ramadan 2026, monthly"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.destinations}</label>
          <input
            value={fields.destinations}
            onChange={e => set('destinations', e.target.value)}
            className={inputCls}
            placeholder="Riyadh, Dubai, Cairo…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-utu-text-secondary mb-1">{l.message}</label>
          <textarea
            rows={3}
            value={fields.message}
            onChange={e => set('message', e.target.value)}
            className={inputCls}
            placeholder="Tell us about your travel needs…"
          />
        </div>

        {status === 'error' && (
          <p className="text-xs text-red-600">{errorMsg || l.error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full sm:w-auto bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {status === 'submitting' ? l.submitting : l.submit}
        </button>
      </form>
    </div>
  );
}
