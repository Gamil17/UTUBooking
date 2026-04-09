'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminApplications,
  type CareerApplication,
  type ApplicationStatus,
} from '@/lib/api';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:      'Applied',
  reviewing:    'Reviewing',
  interviewing: 'Interviewing',
  offered:      'Offered',
  rejected:     'Rejected',
  withdrawn:    'Withdrawn',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied:      'bg-blue-50 text-blue-700',
  reviewing:    'bg-amber-50 text-amber-700',
  interviewing: 'bg-purple-50 text-purple-700',
  offered:      'bg-green-50 text-green-700',
  rejected:     'bg-red-50 text-red-600',
  withdrawn:    'bg-utu-bg-subtle text-utu-text-muted',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminCareersApplicationsPage() {
  const qc = useQueryClient();

  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [page,           setPage]           = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-career-applications', debouncedSearch, statusFilter, page],
    queryFn:  () => getAdminApplications({
      search:   debouncedSearch || undefined,
      status:   statusFilter    || undefined,
      page,
    }),
    staleTime: 30_000,
  });

  const apps: CareerApplication[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Career Applications</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Review and manage job applications from candidates.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, email or position…"
          className="w-72 rounded-lg border border-utu-border-default px-3 py-2 text-sm
                     text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm
                     text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && (
          <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>
        )}
        {isError && (
          <div className="p-10 text-center text-sm text-red-500">Failed to load applications.</div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Applicant', 'Email', 'Position', 'CV', 'Status', 'Applied On', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-sm font-medium text-utu-text-primary whitespace-nowrap">
                      {app.applicant_name}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-secondary">
                      {app.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary max-w-[200px] truncate">
                      {app.position}
                    </td>
                    <td className="px-4 py-3">
                      {app.cv_filename ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          CV
                        </span>
                      ) : (
                        <span className="text-xs text-utu-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/careers/applications/${app.id}`}
                        className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium
                                   text-utu-blue hover:bg-utu-bg-subtle transition-colors"
                        style={{ minHeight: 32, display: 'inline-block' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {apps.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-utu-text-muted">
                      No applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{data.total.toLocaleString()} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="flex items-center px-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={apps.length < 25}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
