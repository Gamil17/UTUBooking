'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminCountryAdmins,
  assignCountryAdmin,
  removeCountryAdmin,
  type CountryAdmin,
} from '@/lib/api';

const COUNTRY_OPTIONS = [
  'SA', 'AE', 'KW', 'JO', 'BH', 'OM', 'QA',
  'GB', 'DE', 'FR', 'NL', 'IT', 'ES', 'BE', 'PL', 'CH', 'AT', 'TR',
  'US', 'CA', 'BR', 'AR', 'CO', 'CL', 'MX',
  'ID', 'MY', 'SG', 'TH', 'PH',
  'IN', 'PK', 'BD',
  'MA', 'TN',
];

export default function CountryAdminsPage() {
  const qc = useQueryClient();
  const [userId,  setUserId]  = useState('');
  const [country, setCountry] = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-country-admins'],
    queryFn:  getAdminCountryAdmins,
    staleTime: 60_000,
  });

  const assignMutation = useMutation({
    mutationFn: () => assignCountryAdmin(userId.trim(), country),
    onSuccess: () => {
      setUserId('');
      setCountry('');
      setError('');
      setSuccess('Country admin assigned successfully.');
      qc.invalidateQueries({ queryKey: ['admin-country-admins'] });
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (err: Error) => {
      setError(err.message ?? 'Failed to assign country admin.');
      setSuccess('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeCountryAdmin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-country-admins'] });
    },
  });

  const rows: CountryAdmin[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Country Admins</h1>
        <p className="text-sm text-utu-text-muted mt-0.5">
          Super-admin only — assign users to manage specific country markets.
        </p>
      </div>

      {/* Assign form */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-utu-text-primary">Assign Country Admin</h2>

        {error   && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User UUID"
            className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-utu-blue w-80"
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
          >
            <option value="">Select country</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => assignMutation.mutate()}
            disabled={!userId.trim() || !country || assignMutation.isPending}
            className="rounded-xl bg-utu-blue px-5 py-2 text-sm font-medium text-white hover:bg-utu-navy disabled:opacity-40 transition-colors"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
        <p className="text-xs text-utu-text-muted">
          The user must already exist. Their role will be updated to <code className="font-mono">country_admin</code> for the selected market.
        </p>
      </div>

      {/* Country admins table */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-utu-border-default flex items-center justify-between">
          <h2 className="text-sm font-semibold text-utu-text-primary">Active Country Admins</h2>
          <span className="text-xs text-utu-text-muted">{rows.length} total</span>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-sm text-utu-text-muted">Loading…</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-red-500">
            Failed to load country admins. Check ADMIN_SECRET and admin service connectivity.
          </div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-utu-border-default text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Name', 'Email', 'Country', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-utu-border-default">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-utu-bg-muted/40">
                    <td className="px-4 py-3 text-sm text-utu-text-primary">{r.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-secondary">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-utu-bg-subtle border border-utu-border-default px-2 py-0.5 text-[11px] font-semibold text-utu-blue">
                        {r.admin_country ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm(`Remove country admin role from ${r.email}?`)) {
                            removeMutation.mutate(r.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-utu-text-muted">
                      No country admins assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
