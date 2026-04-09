'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AdminLoginPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      });
      if (res.ok) {
        router.replace('/admin');
      } else {
        setError(t('invalidToken'));
      }
    } catch {
      setError(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-utu-bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-utu-navy rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">U</span>
            </div>
            <span className="font-black text-utu-text-primary text-lg">UTUBooking</span>
          </div>
          <p className="mt-2 text-sm text-utu-text-muted">{t('revenueAdmin')}</p>
        </div>

        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
          <h1 className="text-lg font-bold text-utu-text-primary mb-6">{t('adminAccess')}</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-utu-text-secondary mb-1">
                {t('adminToken')}
              </label>
              <input
                id="token"
                type="password"
                autoComplete="current-password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-utu-border-default text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent transition"
                placeholder={t('enterSecret')}
              />
            </div>

            <button
              type="submit"
              disabled={!token || loading}
              className="w-full py-2.5 rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? t('authenticating') : t('accessDashboard')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
