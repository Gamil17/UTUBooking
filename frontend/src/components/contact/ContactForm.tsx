'use client';

import React, { useState } from 'react';
import { SITE_CONFIG } from '@/lib/siteConfig';

interface Props {
  labels: {
    fieldName: string; fieldNamePh: string;
    fieldEmail: string; fieldEmailPh: string;
    fieldRef: string; fieldRefPh: string;
    fieldTopic: string; fieldTopicDefault: string;
    topics: Array<{ value: string; label: string }>;
    fieldMessage: string; fieldMessagePh: string;
    submitBtn: string;
    sendingLabel: string;
    successTitle: string;
    successDesc: string;
    errorGeneric: string;
    errorNetwork: string;
  };
}

export default function ContactForm({ labels }: Props) {
  const [form, setForm] = useState({ name: '', email: '', ref: '', topic: '', message: '' });
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
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', ref: '', topic: '', message: '' });
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || labels.errorGeneric);
        setStatus('error');
      }
    } catch {
      setErrorMsg(labels.errorNetwork.replace('{email}', SITE_CONFIG.supportEmail));
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-utu-bg-subtle rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-utu-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-utu-text-primary mb-2">{labels.successTitle}</h3>
        <p className="text-sm text-utu-text-muted">{labels.successDesc}</p>
      </div>
    );
  }

  const inputClass = 'border border-utu-border-default rounded-xl px-3 py-2.5 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6 space-y-4">
      {status === 'error' && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">{labels.fieldName}</label>
          <input type="text" required placeholder={labels.fieldNamePh} value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">{labels.fieldEmail}</label>
          <input type="email" required placeholder={labels.fieldEmailPh} value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">{labels.fieldRef}</label>
        <input type="text" placeholder={labels.fieldRefPh} value={form.ref} onChange={(e) => set('ref', e.target.value)} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">{labels.fieldTopic}</label>
        <select required value={form.topic} onChange={(e) => set('topic', e.target.value)} className={`${inputClass} bg-utu-bg-card`}>
          <option value="">{labels.fieldTopicDefault}</option>
          {labels.topics.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">{labels.fieldMessage}</label>
        <textarea required rows={4} placeholder={labels.fieldMessagePh} value={form.message} onChange={(e) => set('message', e.target.value)} className={`${inputClass} resize-none`} />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-utu-navy hover:bg-utu-blue active:bg-utu-navy text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? labels.sendingLabel : labels.submitBtn}
      </button>
    </form>
  );
}
