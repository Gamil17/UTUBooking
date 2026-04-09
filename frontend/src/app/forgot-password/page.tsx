'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to avoid email enumeration
      if (res.ok || res.status === 404) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-utu-bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow">
              <span className="text-utu-navy font-black text-base">U</span>
            </div>
            <span className="font-black text-utu-navy text-xl tracking-tight">UTUBooking</span>
          </Link>
        </div>

        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
          <h1 className="text-xl font-bold text-utu-text-primary mb-2">{t('forgotPasswordTitle')}</h1>
          <p className="text-sm text-utu-text-muted mb-6">{t('forgotPasswordDesc')}</p>

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-utu-bg-subtle border border-utu-border-default rounded-xl text-sm text-utu-navy">
                {t('resetSuccess')}
              </div>
              <Link
                href="/login"
                className="block text-center text-sm text-utu-blue hover:underline"
              >
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-utu-text-secondary mb-1">
                  {t('resetEmailLabel')}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
                  placeholder={t('emailPlaceholder')}
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-600">{t('resetError')}</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-2.5 rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {status === 'submitting' ? t('resetSubmitting') : t('resetSubmit')}
              </button>

              <Link
                href="/login"
                className="block text-center text-sm text-utu-text-muted hover:text-utu-blue transition-colors"
              >
                {t('backToLogin')}
              </Link>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
