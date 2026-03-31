'use client';

import React, { useState } from 'react';

interface Props {
  labels: {
    fieldName: string; fieldNamePh: string;
    fieldEmail: string; fieldEmailPh: string;
    fieldRef: string; fieldRefPh: string;
    fieldTopic: string; fieldTopicDefault: string;
    topics: string[];
    fieldMessage: string; fieldMessagePh: string;
    submitBtn: string;
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
        setErrorMsg(data.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Unable to send message. Please email us at support@utubooking.com.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Message sent</h3>
        <p className="text-sm text-gray-500">We&apos;ll get back to you within 24 hours.</p>
      </div>
    );
  }

  const inputClass = 'border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      {status === 'error' && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{labels.fieldName}</label>
          <input type="text" required placeholder={labels.fieldNamePh} value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{labels.fieldEmail}</label>
          <input type="email" required placeholder={labels.fieldEmailPh} value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{labels.fieldRef}</label>
        <input type="text" placeholder={labels.fieldRefPh} value={form.ref} onChange={(e) => set('ref', e.target.value)} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{labels.fieldTopic}</label>
        <select required value={form.topic} onChange={(e) => set('topic', e.target.value)} className={`${inputClass} bg-white`}>
          <option value="">{labels.fieldTopicDefault}</option>
          {labels.topics.map((topic) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{labels.fieldMessage}</label>
        <textarea required rows={4} placeholder={labels.fieldMessagePh} value={form.message} onChange={(e) => set('message', e.target.value)} className={`${inputClass} resize-none`} />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending...' : labels.submitBtn}
      </button>
    </form>
  );
}
