'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  // Initialize to 'error' immediately if no token is present — avoids setState-in-effect
  const [status, setStatus]           = useState<'idle' | 'submitting' | 'success' | 'error'>(() => (!token ? 'error' : 'idle'));
  const [errorMsg, setErrorMsg]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirm) {
      setErrorMsg(t('resetPasswordMismatch'));
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setErrorMsg(t('resetPasswordError'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(t('resetPasswordError'));
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow">
              <span className="text-emerald-900 font-black text-base">U</span>
            </div>
            <span className="font-black text-emerald-900 text-xl tracking-tight">UTUBooking</span>
          </Link>
        </div>

        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">

          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-emerald-700 text-xl" aria-hidden="true">&#10003;</span>
              </div>
              <p className="text-sm text-utu-text-secondary">{t('resetPasswordSuccess')}</p>
              <Link
                href="/login"
                className="block w-full text-center bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {t('signIn')}
              </Link>
            </div>
          ) : status === 'error' && !errorMsg ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-red-600">{t('resetPasswordError')}</p>
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-700 hover:underline block"
              >
                {t('requestNewLink')}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-utu-text-primary mb-2">{t('resetPasswordTitle')}</h1>
              <p className="text-sm text-utu-text-muted mb-6">{t('resetPasswordDesc')}</p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-utu-text-secondary mb-1">
                    {t('newPasswordLabel')}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('passwordPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-utu-text-secondary mb-1">
                    {t('confirmPasswordLabel')}
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('passwordPlaceholder')}
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {status === 'submitting' ? t('resetPasswordSubmitting') : t('resetPasswordSubmit')}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
