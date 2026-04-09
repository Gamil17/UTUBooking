'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminApplication,
  updateApplicationStatus,
  type ApplicationStatus,
} from '@/lib/api';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied',      label: 'Applied'      },
  { value: 'reviewing',    label: 'Reviewing'    },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered',      label: 'Offered'      },
  { value: 'rejected',     label: 'Rejected'     },
  { value: 'withdrawn',    label: 'Withdrawn'    },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied:      'bg-blue-50 text-blue-700',
  reviewing:    'bg-amber-50 text-amber-700',
  interviewing: 'bg-purple-50 text-purple-700',
  offered:      'bg-green-50 text-green-700',
  rejected:     'bg-red-50 text-red-600',
  withdrawn:    'bg-utu-bg-subtle text-utu-text-muted',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminApplicationDetailPage({ params }: Props) {
  const { id } = use(params);
  const qc     = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-career-application', id],
    queryFn:  () => getAdminApplication(id),
  });

  const app = data?.data;

  const [statusVal,  setStatusVal]  = useState<ApplicationStatus | ''>('');
  const [notes,      setNotes]      = useState('');
  const [reviewer,   setReviewer]   = useState('');
  const [saveMsg,    setSaveMsg]    = useState('');
  const [saveError,  setSaveError]  = useState('');

  // Pre-fill form once data arrives
  const [formInit, setFormInit] = useState(false);
  if (app && !formInit) {
    setStatusVal(app.status);
    setNotes(app.admin_notes ?? '');
    setReviewer(app.reviewed_by ?? '');
    setFormInit(true);
  }

  const mutation = useMutation({
    mutationFn: () => updateApplicationStatus(id, {
      status:      statusVal as ApplicationStatus,
      adminNotes:  notes,
      reviewedBy:  reviewer,
    }),
    onSuccess: () => {
      setSaveMsg('Status updated successfully.');
      setSaveError('');
      qc.invalidateQueries({ queryKey: ['admin-career-application', id] });
      qc.invalidateQueries({ queryKey: ['admin-career-applications'] });
      setTimeout(() => setSaveMsg(''), 4000);
    },
    onError: () => {
      setSaveError('Failed to update status. Please try again.');
      setSaveMsg('');
    },
  });

  const inputClass =
    'border border-utu-border-default rounded-lg px-3 py-2 text-sm text-utu-text-primary w-full ' +
    'focus:outline-none focus:ring-2 focus:ring-utu-blue';

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>;
  }
  if (isError || !app) {
    return <div className="p-10 text-center text-sm text-red-500">Application not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/admin/careers/applications"
        className="inline-flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-blue transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">{app.applicant_name}</h1>
          <p className="text-sm text-utu-text-muted mt-0.5">Applied for{' '}
            <span className="font-medium text-utu-text-secondary">{app.position}</span>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${STATUS_COLORS[app.status]}`}>
          {STATUS_OPTIONS.find((s) => s.value === app.status)?.label ?? app.status}
        </span>
      </div>

      {/* Contact Info */}
      <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
        <h2 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-4">
          Contact Information
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-utu-text-muted mb-0.5">Email</dt>
            <dd className="font-mono text-utu-text-primary">
              <a href={`mailto:${app.email}`} className="hover:text-utu-blue underline">{app.email}</a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-utu-text-muted mb-0.5">Phone</dt>
            <dd className="text-utu-text-secondary">{app.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-utu-text-muted mb-0.5">LinkedIn / Portfolio</dt>
            <dd>
              {app.linkedin_url
                ? <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-utu-blue underline truncate block max-w-xs">{app.linkedin_url}</a>
                : <span className="text-utu-text-muted">—</span>
              }
            </dd>
          </div>
          <div>
            <dt className="text-xs text-utu-text-muted mb-0.5">Applied On</dt>
            <dd className="text-utu-text-secondary">{formatDate(app.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* CV */}
      <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
        <h2 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-3">
          CV / Resume
        </h2>
        {app.cv_filename ? (
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-utu-text-primary">{app.cv_filename}</p>
              <p className="text-xs text-utu-text-muted">
                {formatBytes(app.cv_size_bytes)}{app.cv_mime_type ? ` · ${app.cv_mime_type.split('/').pop()?.toUpperCase()}` : ''}
              </p>
              {app.cv_s3_key ? (
                <a href={`/api/admin/careers/cv/${app.id}`} className="text-xs text-utu-blue underline mt-1 inline-block">
                  Download CV
                </a>
              ) : (
                <p className="text-xs text-amber-600 mt-1">File storage not yet configured (S3 pending)</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-utu-text-muted">No CV attached.</p>
        )}
      </div>

      {/* Cover Letter */}
      <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
        <h2 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-3">
          Cover Letter
        </h2>
        <p className="text-sm text-utu-text-secondary whitespace-pre-wrap leading-relaxed">
          {app.cover_letter || '—'}
        </p>
      </div>

      {/* Status Update */}
      <div className="bg-utu-bg-card rounded-xl border border-utu-border-default p-5">
        <h2 className="text-sm font-semibold text-utu-text-primary uppercase tracking-wide mb-4">
          Review &amp; Status
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide block mb-1.5">
              Status
            </label>
            <select
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value as ApplicationStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide block mb-1.5">
              Reviewer Name
            </label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="Your name (visible in audit)"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide block mb-1.5">
              Admin Notes <span className="text-utu-text-muted font-normal normal-case">(internal, not shown to applicant)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview feedback, skills assessment, next steps…"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          {saveMsg   && <p className="text-sm text-green-700">{saveMsg}</p>}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!statusVal || mutation.isPending}
            className="bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-6 py-2.5
                       rounded-xl transition-colors disabled:opacity-60 min-h-[44px]"
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Audit trail */}
        {(app.reviewed_by || app.reviewed_at) && (
          <div className="mt-5 pt-4 border-t border-utu-border-default text-xs text-utu-text-muted space-y-0.5">
            {app.reviewed_by  && <p>Last reviewed by: <span className="text-utu-text-secondary">{app.reviewed_by}</span></p>}
            {app.reviewed_at  && <p>Last reviewed on: <span className="text-utu-text-secondary">{formatDate(app.reviewed_at)}</span></p>}
          </div>
        )}
      </div>
    </div>
  );
}
