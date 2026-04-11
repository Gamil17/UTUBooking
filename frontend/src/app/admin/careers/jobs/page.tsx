'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminJobs,
  createJob,
  updateJob,
  deleteJob,
  type JobListing,
} from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const BLANK_FORM = { title: '', team: '', location: '', type: '', description: '', sort_order: 0 };

export default function AdminJobsPage() {
  const qc = useQueryClient();

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page,            setPage]            = useState(1);
  const [msg,             setMsg]             = useState('');
  const [showForm,        setShowForm]        = useState(false);
  const [editingJob,      setEditingJob]      = useState<JobListing | null>(null);
  const [form,            setForm]            = useState(BLANK_FORM);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3500);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-jobs', debouncedSearch, page],
    queryFn:  () => getAdminJobs({ search: debouncedSearch || undefined, page }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
      setShowForm(false);
      setForm(BLANK_FORM);
      flash('Job listing created.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<JobListing> }) =>
      updateJob(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
      setEditingJob(null);
      flash('Job listing updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
      flash('Job listing deactivated.');
    },
  });

  const jobs: JobListing[] = data?.data ?? [];

  function openEdit(job: JobListing) {
    setEditingJob(job);
    setForm({
      title:       job.title,
      team:        job.team,
      location:    job.location,
      type:        job.type,
      description: job.description ?? '',
      sort_order:  job.sort_order,
    });
    setShowForm(false);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, payload: { ...form, sort_order: Number(form.sort_order) } });
    } else {
      createMutation.mutate({ ...form, sort_order: Number(form.sort_order) });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">Job Listings</h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Manage open positions shown on the /careers page.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingJob(null); setForm(BLANK_FORM); }}
          className="shrink-0 rounded-lg bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          + Add listing
        </button>
      </div>

      {msg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      {/* Create / Edit form */}
      {(showForm || editingJob) && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-utu-text-primary">
            {editingJob ? 'Edit listing' : 'New listing'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {([
              { key: 'title',    label: 'Job title',    placeholder: 'e.g. Senior Frontend Engineer' },
              { key: 'team',     label: 'Team',         placeholder: 'e.g. Engineering' },
              { key: 'location', label: 'Location',     placeholder: 'e.g. Remote — Riyadh, KSA' },
              { key: 'type',     label: 'Type',         placeholder: 'e.g. Full-time' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-utu-text-secondary mb-1">{label}</label>
                <input
                  required
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                             text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Sort order</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                           text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">
              Description (optional — shown on apply page)
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief role description…"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm
                         text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingJob(null); }}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : (editingJob ? 'Save changes' : 'Create')}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by title, team or location…"
          className="w-72 rounded-lg border border-utu-border-default px-3 py-2 text-sm
                     text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && (
          <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>
        )}
        {isError && (
          <div className="p-10 text-center text-sm text-red-500">Failed to load job listings.</div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Title', 'Team', 'Location', 'Type', 'Sort', 'Active', 'Created', 'Actions'].map((h) => (
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
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-medium text-utu-text-primary max-w-[200px] truncate">
                      {job.title}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">{job.team}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">{job.location}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">{job.type}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted text-center">{job.sort_order}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateMutation.mutate({ id: job.id, payload: { is_active: !job.is_active } })}
                        disabled={updateMutation.isPending}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          job.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-utu-bg-subtle text-utu-text-muted hover:bg-utu-bg-muted'
                        }`}
                      >
                        {job.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(job)}
                          className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-blue
                                     hover:bg-utu-bg-subtle transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate "${job.title}"?`)) deleteJob(job.id).then(() => {
                              qc.invalidateQueries({ queryKey: ['admin-jobs'] });
                              flash('Job listing deactivated.');
                            });
                          }}
                          disabled={deleteMutation.isPending || !job.is_active}
                          className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600
                                     hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-utu-text-muted">
                      No job listings yet. Click &quot;+ Add listing&quot; to create one.
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
              disabled={jobs.length < 50}
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
