'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || t('invalidCredentials'));
      } else {
        const token = (await res.json().catch(() => ({}))).accessToken;
        if (token) sessionStorage.setItem('utu_access_token', token);
        window.location.href = '/account';
      }
    } catch {
      setError(t('connectError'));
    } finally {
      setLoading(false);
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
          <p className="mt-3 text-sm text-utu-text-muted">{t('signInToAccount')}</p>
        </div>

        {/* Card */}
        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
          <h1 className="text-xl font-bold text-utu-text-primary mb-6">{t('welcomeBack')}</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-utu-text-secondary mb-1">
                {t('emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-utu-text-secondary mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
                placeholder={t('passwordPlaceholder')}
              />
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs text-utu-blue hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-utu-text-muted">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-utu-blue font-medium hover:underline">
              {t('createOne')}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-utu-text-muted">
          {t('agreeSignIn')}{' '}
          <Link href="/terms" className="hover:underline">{t('terms')}</Link>
          {' '}{t('and')}{' '}
          <Link href="/privacy" className="hover:underline">{t('privacyPolicy')}</Link>.
        </p>
      </div>
    </div>
  );
}
