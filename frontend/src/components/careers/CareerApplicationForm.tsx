'use client';

import React, { useState } from 'react';
import { SITE_CONFIG } from '@/lib/siteConfig';

interface Props {
  role: string;
}

const inputClass =
  'border border-utu-border-default rounded-xl px-3 py-2.5 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent';

export default function CareerApplicationForm({ role }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    coverLetter: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg(
        `Unable to submit your application. Please email us directly at ${SITE_CONFIG.careersEmail}`
      );
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-utu-text-primary mb-2">Application Received!</h3>
        <p className="text-sm text-utu-text-muted mb-1">
          Thank you for applying for the <span className="font-medium text-utu-text-primary">{role}</span> position.
        </p>
        <p className="text-sm text-utu-text-muted">
          Our team will review your application and get back to you within 5&ndash;7 business days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6 space-y-4"
    >
      {status === 'error' && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Role (read-only) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
          Applying For
        </label>
        <input
          type="text"
          readOnly
          value={role}
          className={`${inputClass} bg-utu-bg-subtle cursor-default`}
          aria-label="Position you are applying for"
        />
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Phone + LinkedIn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            Phone <span className="text-utu-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            type="tel"
            placeholder="+966 5x xxx xxxx"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            LinkedIn / Portfolio <span className="text-utu-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={form.linkedinUrl}
            onChange={(e) => set('linkedinUrl', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Cover Letter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
          Why do you want to join UTUBooking? <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={5}
          placeholder="Tell us about yourself, your experience, and why this role excites you..."
          value={form.coverLetter}
          onChange={(e) => set('coverLetter', e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-utu-navy hover:bg-utu-blue active:bg-utu-navy text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {status === 'loading' ? 'Submitting…' : 'Submit Application'}
      </button>

      <p className="text-center text-xs text-utu-text-muted">
        Questions? Email us at{' '}
        <a
          href={`mailto:${SITE_CONFIG.careersEmail}`}
          className="text-utu-blue underline"
        >
          {SITE_CONFIG.careersEmail}
        </a>
      </p>
    </form>
  );
}
