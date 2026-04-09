'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    confirm:   '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError(t('passwordMismatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          email:     form.email,
          password:  form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || t('regFailed'));
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.accessToken) sessionStorage.setItem('utu_access_token', data.accessToken);
        window.location.href = '/account';
      }
    } catch {
      setError(t('connectError'));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!(
    form.firstName && form.lastName && form.email &&
    form.password && form.confirm && !loading
  );

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
          <p className="mt-3 text-sm text-utu-text-muted">{t('createFreeAccount')}</p>
        </div>

        {/* Card */}
        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
          <h1 className="text-xl font-bold text-utu-text-primary mb-6">{t('createAccount')}</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-utu-text-secondary mb-1">
                  {t('firstName')}
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-utu-text-secondary mb-1">
                  {t('lastName')}
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-utu-text-secondary mb-1">
                {t('emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-utu-text-secondary mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
              />
              <p className="mt-1 text-xs text-utu-text-muted">{t('minChars')}</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-utu-text-secondary mb-1">
                {t('confirmPassword')}
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirm}
                onChange={(e) => setField('confirm', e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition ${
                  form.confirm && form.confirm !== form.password
                    ? 'border-red-300 bg-red-50'
                    : 'border-utu-border-default'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? t('creatingAccount') : t('createAccount')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-utu-text-muted">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-utu-blue font-medium hover:underline">
              {t('signIn')}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-utu-text-muted">
          {t('agreeCreate')}{' '}
          <Link href="/terms" className="hover:underline">{t('terms')}</Link>
          {' '}{t('and')}{' '}
          <Link href="/privacy" className="hover:underline">{t('privacyPolicy')}</Link>.
        </p>
      </div>
    </div>
  );
}
