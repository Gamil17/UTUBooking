'use client';

import { useState } from 'react';
import { SITE_CONFIG } from '@/lib/siteConfig';

interface Props {
  labels: {
    applyHeading: string;
    applyDesc: string;
    formName: string;
    formEmail: string;
    formWebsite: string;
    formPlatform: string;
    formPlatformBlog: string;
    formPlatformYoutube: string;
    formPlatformInstagram: string;
    formPlatformTwitter: string;
    formPlatformTelegram: string;
    formPlatformOther: string;
    formAudience: string;
    formAudience1k: string;
    formAudience10k: string;
    formAudience100k: string;
    formAudience100kplus: string;
    formMessage: string;
    formSubmit: string;
    formSubmitting: string;
    formSuccess: string;
    formError: string;
  };
}

export default function AffiliateApplyForm({ labels: l }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [fields, setFields] = useState({
    name: '',
    email: '',
    website: '',
    platform: '',
    audience: '',
    message: '',
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.name,
          email: fields.email,
          topic: 'affiliate',
          ref: fields.website,
          message: `Platform: ${fields.platform}\nAudience: ${fields.audience}\n\n${fields.message}`,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-700 text-xl" aria-hidden="true">&#10003;</span>
        </div>
        <p className="text-emerald-800 font-semibold">{l.formSuccess}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
      <h2 className="text-xl font-bold text-utu-text-primary mb-2">{l.applyHeading}</h2>
      <p className="text-sm text-utu-text-muted mb-6">{l.applyDesc}</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-utu-text-secondary mb-1">{l.formName} *</label>
          <input
            type="text"
            required
            value={fields.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-utu-text-secondary mb-1">{l.formEmail} *</label>
          <input
            type="email"
            required
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-utu-text-secondary mb-1">{l.formWebsite} *</label>
          <input
            type="url"
            required
            value={fields.website}
            onChange={(e) => set('website', e.target.value)}
            placeholder="https://"
            className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-utu-text-secondary mb-1">{l.formPlatform} *</label>
            <select
              required
              value={fields.platform}
              onChange={(e) => set('platform', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-utu-bg-card"
            >
              <option value="" disabled />
              <option value="blog">{l.formPlatformBlog}</option>
              <option value="youtube">{l.formPlatformYoutube}</option>
              <option value="instagram">{l.formPlatformInstagram}</option>
              <option value="twitter">{l.formPlatformTwitter}</option>
              <option value="telegram">{l.formPlatformTelegram}</option>
              <option value="other">{l.formPlatformOther}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-utu-text-secondary mb-1">{l.formAudience} *</label>
            <select
              required
              value={fields.audience}
              onChange={(e) => set('audience', e.target.value)}
              className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-utu-bg-card"
            >
              <option value="" disabled />
              <option value="<1k">{l.formAudience1k}</option>
              <option value="1k-10k">{l.formAudience10k}</option>
              <option value="10k-100k">{l.formAudience100k}</option>
              <option value="100k+">{l.formAudience100kplus}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-utu-text-secondary mb-1">{l.formMessage}</label>
          <textarea
            rows={3}
            value={fields.message}
            onChange={(e) => set('message', e.target.value)}
            className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600">
            {l.formError}{' '}
            <a href={`mailto:${SITE_CONFIG.partnersEmail}`} className="underline">{SITE_CONFIG.partnersEmail}</a>
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          {status === 'submitting' ? l.formSubmitting : l.formSubmit}
        </button>
      </form>
    </div>
  );
}
