'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
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
        setError('Invalid admin token.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">U</span>
            </div>
            <span className="font-black text-gray-900 text-lg">UTUBooking</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Revenue Admin</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-lg font-bold text-gray-900 mb-6">Admin Access</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Token
              </label>
              <input
                id="token"
                type="password"
                autoComplete="current-password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Enter ADMIN_SECRET"
              />
            </div>

            <button
              type="submit"
              disabled={!token || loading}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Authenticating…' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
