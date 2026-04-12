'use client';

import { useState } from 'react';
import Link from 'next/link';

// Work email domains that should be rejected (free providers)
const FREE_DOMAINS = new Set([
  'gmail.com','yahoo.com','hotmail.com','outlook.com','live.com',
  'icloud.com','me.com','mac.com','aol.com','ymail.com',
  'protonmail.com','proton.me','tutanota.com','zohomail.com',
]);

function isWorkEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && !FREE_DOMAINS.has(domain);
}

type Step = 1 | 2 | 3;

interface Fields {
  // Step 1 — Company
  company_name:   string;
  company_size:   string;
  industry:       string;
  country:        string;
  // Step 2 — Travel profile
  traveler_count: string;
  estimated_monthly_budget_sar: string;
  destinations:   string;
  travel_dates:   string;
  // Step 3 — Contact
  contact_name:   string;
  job_title:      string;
  email:          string;
  phone:          string;
  hear_about_us:  string;
  message:        string;
}

const EMPTY: Fields = {
  company_name: '', company_size: '', industry: '', country: '',
  traveler_count: '', estimated_monthly_budget_sar: '',
  destinations: '', travel_dates: '',
  contact_name: '', job_title: '', email: '', phone: '',
  hear_about_us: '', message: '',
};

const COUNTRIES = [
  'Saudi Arabia','United Arab Emirates','Egypt','Kuwait','Qatar',
  'Bahrain','Oman','Jordan','Lebanon','Iraq','Morocco','Tunisia',
  'Pakistan','Bangladesh','Turkey','Malaysia','Indonesia',
  'United Kingdom','United States','Other',
];

const inputCls = 'w-full rounded-xl border border-utu-border-default bg-white px-4 py-2.5 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue';
const labelCls = 'block text-xs font-medium text-utu-text-secondary mb-1';

export default function CorporateApplyForm() {
  const [step, setStep]     = useState<Step>(1);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(key: keyof Fields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const e: typeof errors = {};
    if (!fields.company_name.trim()) e.company_name = 'Company name is required.';
    if (!fields.company_size)        e.company_size = 'Please select company size.';
    if (!fields.country)             e.country      = 'Please select your country.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof errors = {};
    if (!fields.traveler_count) e.traveler_count = 'Please select number of travelers.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    const e: typeof errors = {};
    if (!fields.contact_name.trim()) e.contact_name = 'Your name is required.';
    if (!fields.job_title.trim())    e.job_title    = 'Job title is required.';
    if (!fields.email.trim()) {
      e.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      e.email = 'Please enter a valid email address.';
    } else if (!isWorkEmail(fields.email)) {
      e.email = 'Please use your company email address (not Gmail, Yahoo, etc.).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(prev => (prev + 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep() {
    setStep(prev => (prev - 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep3()) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/corporate/enquiry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name:                 fields.company_name.trim(),
          company_size:                 fields.company_size,
          industry:                     fields.industry || null,
          country:                      fields.country,
          traveler_count:               parseInt(fields.traveler_count || '1'),
          estimated_monthly_budget_sar: parseFloat(fields.estimated_monthly_budget_sar || '0') || null,
          destinations:                 fields.destinations.trim() || null,
          travel_dates:                 fields.travel_dates.trim() || null,
          contact_name:                 fields.contact_name.trim(),
          job_title:                    fields.job_title.trim(),
          email:                        fields.email.trim().toLowerCase(),
          phone:                        fields.phone.trim() || null,
          hear_about_us:                fields.hear_about_us || null,
          message:                      fields.message.trim() || null,
          source:                       'website',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message || 'Unable to submit your application. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMsg('Unable to submit your application. Please email corporate@utubooking.com directly.');
      setStatus('error');
    }
  }

  // ── Success state ───────────────────────────────────────────────────────────

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-8 py-14 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Application received!</h2>
        <p className="text-green-700 text-sm mb-1">
          Thank you, <strong>{fields.contact_name}</strong>. We have received your application for{' '}
          <strong>{fields.company_name}</strong>.
        </p>
        <p className="text-green-600 text-sm mb-6">
          Our corporate team will review and respond to <strong>{fields.email}</strong> within 1–2 business days.
        </p>
        <Link href="/" className="inline-block text-sm text-utu-blue hover:underline">
          Return to home
        </Link>
      </div>
    );
  }

  // ── Step progress indicator ─────────────────────────────────────────────────

  const stepLabels = ['Company', 'Travel Profile', 'Contact'];

  return (
    <div className="max-w-xl mx-auto">

      {/* Progress */}
      <div className="flex items-center gap-0 mb-8">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as Step;
          const done    = step > n;
          const current = step === n;
          return (
            <div key={label} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done    ? 'bg-green-500 text-white' :
                    current ? 'bg-utu-navy text-white'  : 'bg-utu-border-default text-utu-text-muted'}`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </div>
                <span className={`mt-1 text-xs ${current ? 'text-utu-navy font-semibold' : 'text-utu-text-muted'}`}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 transition-colors ${step > n ? 'bg-green-400' : 'bg-utu-border-default'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6 md:p-8">

        {/* ── Step 1: Company ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-utu-text-primary mb-0.5">Tell us about your company</h2>
              <p className="text-sm text-utu-text-muted">Step 1 of 3 — Company details</p>
            </div>
            <div>
              <label className={labelCls}>Company Name *</label>
              <input value={fields.company_name} onChange={e => set('company_name', e.target.value)}
                className={inputCls} placeholder="Saudi Aramco, SABIC, Almarai…" />
              {errors.company_name && <p className="text-xs text-red-600 mt-1">{errors.company_name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company Size *</label>
                <select value={fields.company_size} onChange={e => set('company_size', e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201-500">201–500 employees</option>
                  <option value="501-1000">501–1,000 employees</option>
                  <option value="1000+">1,000+ employees</option>
                </select>
                {errors.company_size && <p className="text-xs text-red-600 mt-1">{errors.company_size}</p>}
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <select value={fields.industry} onChange={e => set('industry', e.target.value)} className={inputCls}>
                  <option value="">Select (optional)…</option>
                  <option value="government">Government &amp; Public Sector</option>
                  <option value="oil_gas">Oil, Gas &amp; Energy</option>
                  <option value="finance">Finance &amp; Banking</option>
                  <option value="healthcare">Healthcare &amp; Pharma</option>
                  <option value="tech">Technology &amp; IT</option>
                  <option value="education">Education &amp; Research</option>
                  <option value="ngo">NGO &amp; Charity</option>
                  <option value="retail">Retail &amp; FMCG</option>
                  <option value="hospitality">Hospitality &amp; Tourism</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Country / HQ Location *</label>
              <select value={fields.country} onChange={e => set('country', e.target.value)} className={inputCls}>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country}</p>}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={nextStep}
                className="bg-utu-navy hover:bg-utu-blue text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Travel Profile ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-utu-text-primary mb-0.5">Your travel profile</h2>
              <p className="text-sm text-utu-text-muted">Step 2 of 3 — Travel needs</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Travelers per Month *</label>
                <select value={fields.traveler_count} onChange={e => set('traveler_count', e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="5">1–5 travelers</option>
                  <option value="15">6–20 travelers</option>
                  <option value="50">21–100 travelers</option>
                  <option value="200">100–500 travelers</option>
                  <option value="500">500+ travelers</option>
                </select>
                {errors.traveler_count && <p className="text-xs text-red-600 mt-1">{errors.traveler_count}</p>}
              </div>
              <div>
                <label className={labelCls}>Estimated Monthly Travel Spend (SAR)</label>
                <select value={fields.estimated_monthly_budget_sar}
                  onChange={e => set('estimated_monthly_budget_sar', e.target.value)} className={inputCls}>
                  <option value="">Select (optional)…</option>
                  <option value="10000">Under SAR 10,000</option>
                  <option value="25000">SAR 10,000–25,000</option>
                  <option value="75000">SAR 25,000–100,000</option>
                  <option value="250000">SAR 100,000–500,000</option>
                  <option value="1000000">SAR 500,000+</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Key Destinations</label>
              <input value={fields.destinations} onChange={e => set('destinations', e.target.value)}
                className={inputCls} placeholder="Makkah, Riyadh, Dubai, London…" />
            </div>
            <div>
              <label className={labelCls}>Travel Frequency / Dates</label>
              <input value={fields.travel_dates} onChange={e => set('travel_dates', e.target.value)}
                className={inputCls} placeholder="e.g. Monthly domestic, Ramadan & Hajj season, year-round" />
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={prevStep}
                className="border border-utu-border-default hover:border-utu-text-muted text-utu-text-secondary font-medium px-6 py-3 rounded-xl transition-colors text-sm">
                Back
              </button>
              <button onClick={nextStep}
                className="bg-utu-navy hover:bg-utu-blue text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-utu-text-primary mb-0.5">Your contact details</h2>
              <p className="text-sm text-utu-text-muted">Step 3 of 3 — Almost there</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input value={fields.contact_name} onChange={e => set('contact_name', e.target.value)}
                  className={inputCls} placeholder="Your full name" />
                {errors.contact_name && <p className="text-xs text-red-600 mt-1">{errors.contact_name}</p>}
              </div>
              <div>
                <label className={labelCls}>Job Title *</label>
                <input value={fields.job_title} onChange={e => set('job_title', e.target.value)}
                  className={inputCls} placeholder="Travel Manager, CFO, HR Director…" />
                {errors.job_title && <p className="text-xs text-red-600 mt-1">{errors.job_title}</p>}
              </div>
              <div>
                <label className={labelCls}>Work Email *</label>
                <input type="email" value={fields.email} onChange={e => set('email', e.target.value)}
                  className={inputCls} placeholder="you@company.com" />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone (optional)</label>
                <input type="tel" value={fields.phone} onChange={e => set('phone', e.target.value)}
                  className={inputCls} placeholder="+966 5x xxx xxxx" />
              </div>
            </div>
            <div>
              <label className={labelCls}>How did you hear about us?</label>
              <select value={fields.hear_about_us} onChange={e => set('hear_about_us', e.target.value)} className={inputCls}>
                <option value="">Select (optional)…</option>
                <option value="google">Google Search</option>
                <option value="linkedin">LinkedIn</option>
                <option value="referral">Colleague / Referral</option>
                <option value="event">Conference / Event</option>
                <option value="social_media">Social Media</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Additional Notes (optional)</label>
              <textarea rows={3} value={fields.message} onChange={e => set('message', e.target.value)}
                className={inputCls}
                placeholder="Any specific requirements, questions, or context about your travel programme…" />
            </div>
            {status === 'error' && (
              <p className="text-xs text-red-600 rounded-lg bg-red-50 border border-red-200 px-4 py-3">{errorMsg}</p>
            )}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={prevStep}
                className="border border-utu-border-default hover:border-utu-text-muted text-utu-text-secondary font-medium px-6 py-3 rounded-xl transition-colors text-sm">
                Back
              </button>
              <button type="submit" disabled={status === 'submitting'}
                className="bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm">
                {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
            <p className="text-xs text-utu-text-muted text-center">
              By submitting you agree to our{' '}
              <Link href="/privacy" className="text-utu-blue hover:underline">Privacy Policy</Link>.
              We will never share your data.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
