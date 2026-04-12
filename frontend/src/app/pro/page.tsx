'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_CONFIG } from '@/lib/siteConfig';
import { decodePortalToken } from '@/lib/portal-auth';

/**
 * UTUBooking for Business — Portal Entry (Phase 1)
 *
 * Route: /pro
 * Corporate users land here to sign in. On success they are redirected
 * to /pro/dashboard (built in Phase 6). Regular and guest users should
 * use the main /signin page.
 */

export default function ProPortalPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ email: '', password: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(key: keyof typeof fields, val: string) {
    setFields(f => ({ ...f, [key]: val }));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: fields.email, password: fields.password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(body.message || 'Invalid email or password.');
        setStatus('error');
        return;
      }

      // Auth service returns camelCase: { accessToken, refreshToken, tokenType, expiresIn }
      const token = body.accessToken ?? body.access_token;
      if (!token) {
        setErrorMsg('Login failed. Please try again.');
        setStatus('error');
        return;
      }

      // Decode the JWT payload to verify this is a corporate portal account
      const claims = decodePortalToken(token);
      if (!claims || claims.role !== 'corporate' || !claims.corporate_account_id) {
        setErrorMsg('This portal is for UTUBooking for Business accounts only. Please use the main sign-in page.');
        setStatus('error');
        return;
      }

      // Store token and redirect to the corporate dashboard
      sessionStorage.setItem('utu_access_token', token);
      router.replace('/pro/dashboard');
    } catch {
      setErrorMsg('Unable to reach the sign-in service. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-utu-bg-page flex flex-col">

      {/* Top bar */}
      <header className="bg-utu-navy px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-white font-black text-lg tracking-tight">UTUBooking</span>
          <span className="text-amber-300 text-xs font-bold uppercase tracking-widest">for Business</span>
        </Link>
        <Link href="/contact" className="text-white/70 hover:text-white text-xs transition-colors">
          Contact Support
        </Link>
      </header>

      {/* Hero + login card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">

          {/* Brand block */}
          <div className="text-center">
            <p className="text-amber-500 text-xs font-semibold uppercase tracking-widest mb-2">
              UTUBooking Pro
            </p>
            <h1 className="text-2xl font-bold text-utu-text-primary mb-2">
              Corporate Travel Portal
            </h1>
            <p className="text-sm text-utu-text-muted">
              Sign in to manage your company&apos;s travel programme, bookings, and employee itineraries.
            </p>
          </div>

          {/* Login card */}
          <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8">
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-utu-text-secondary mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={fields.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-utu-text-secondary mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={fields.password}
                  onChange={e => set('password', e.target.value)}
                  className="w-full rounded-xl border border-utu-border-default px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                />
                <div className="mt-1.5 text-end">
                  <Link href="/forgot-password" className="text-xs text-utu-blue hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {status === 'submitting' ? 'Signing in…' : 'Sign In to Portal'}
              </button>
            </form>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '✈️', label: 'Flight & Hotel Booking' },
              { icon: '👥', label: 'Team Travel Management' },
              { icon: '📊', label: 'Spend Reporting' },
            ].map(f => (
              <div key={f.label} className="bg-utu-bg-card rounded-xl border border-utu-border-default px-3 py-4">
                <span className="text-xl block mb-1" aria-hidden="true">{f.icon}</span>
                <p className="text-xs text-utu-text-muted leading-snug">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Footer links */}
          <p className="text-center text-xs text-utu-text-muted">
            Not a business account?{' '}
            <Link href="/login" className="text-utu-blue hover:underline">Sign in here</Link>
            {' '}· Enquire about UTUBooking for Business:{' '}
            <a href={`mailto:${SITE_CONFIG.partnersEmail}`} className="text-utu-blue hover:underline">
              {SITE_CONFIG.partnersEmail}
            </a>
          </p>
        </div>
      </main>

    </div>
  );
}
