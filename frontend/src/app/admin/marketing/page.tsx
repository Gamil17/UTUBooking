'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCalendar, updateCalendarEntry, deleteCalendarEntry,
  getDraftFiles, getDraftContent,
  getConsentLog, getMarketingTimeline,
  getCampaigns, createCampaign, sendCampaignNow, deleteCampaign, duplicateCampaign, getCampaignStats,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getEmailLog,
  getSuppressions, liftSuppression,
  type CalendarEntry, type CalendarStatus, type DraftFile, type ConsentRow, type TimelineItem,
  type Campaign, type EmailTemplate, type EmailLogRow, type SuppressionRow,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: CalendarStatus[] = ['planned', 'draft', 'review', 'approved', 'published'];

const STATUS_COLORS: Record<CalendarStatus, string> = {
  planned:   'bg-gray-100 text-gray-600',
  draft:     'bg-blue-50 text-blue-700',
  review:    'bg-amber-50 text-amber-700',
  approved:  'bg-green-50 text-green-700',
  published: 'bg-emerald-100 text-emerald-800',
};

const LANG_COLORS: Record<string, string> = {
  EN: 'bg-indigo-50 text-indigo-700',
  AR: 'bg-rose-50 text-rose-700',
};

const MONTHS = ['All', 'Apr', 'May', 'Jun'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function nextStatus(current: CalendarStatus): CalendarStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

// ─── Draft Preview Modal ──────────────────────────────────────────────────────

function DraftPreviewModal({
  filename,
  onClose,
  onLinkToEntry,
}: {
  filename: string;
  onClose: () => void;
  onLinkToEntry: (filename: string, title: string, utmCampaign: string | null) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['draft-content', filename],
    queryFn:  () => getDraftContent(filename),
  });

  const meta = data?.data?.meta ?? {};
  const body = data?.data?.body ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="font-semibold text-utu-text-primary">{meta.title ?? filename}</h2>
            <p className="mt-0.5 text-xs text-utu-text-muted">{filename}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted"
          >
            Close
          </button>
        </div>

        {isLoading && <div className="flex-1 p-10 text-center text-sm text-utu-text-muted">Loading…</div>}

        {!isLoading && (
          <>
            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-[#E5E7EB] px-6 py-3 text-xs">
              {Object.entries(meta).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-utu-text-muted">{k}</span>
                  <span className="truncate text-utu-text-secondary">{v}</span>
                </div>
              ))}
            </div>

            {/* Body preview */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-utu-text-secondary">
                {body.slice(0, 3000)}{body.length > 3000 ? '\n\n[… truncated for preview]' : ''}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-6 py-3">
              <button
                onClick={() => onLinkToEntry(filename, meta.title ?? filename, meta.utm_campaign ?? null)}
                className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue transition-colors"
              >
                Link to Calendar Entry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Content Calendar ────────────────────────────────────────────────────

function CalendarTab() {
  const qc = useQueryClient();
  const [filterMonth,  setFilterMonth]  = useState('All');
  const [filterStatus, setFilterStatus] = useState('');
  const [msg,          setMsg]          = useState('');

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-calendar', filterMonth, filterStatus],
    queryFn:  () => getCalendar({
      month:  filterMonth !== 'All' ? filterMonth : undefined,
      status: filterStatus || undefined,
    }),
    staleTime: 30_000,
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CalendarStatus }) =>
      updateCalendarEntry(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-calendar'] });
      flash('Status updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalendarEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-calendar'] });
      flash('Entry removed.');
    },
  });

  const entries: CalendarEntry[] = data?.data ?? [];

  // Group by month
  const grouped: Record<string, CalendarEntry[]> = {};
  for (const e of entries) {
    const month = e.publish_week?.split(' ')[0] ?? 'Other';
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(e);
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-utu-border-default overflow-hidden text-sm">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setFilterMonth(m)}
              className={`px-3 py-1.5 transition-colors ${
                filterMonth === m
                  ? 'bg-utu-navy text-white'
                  : 'bg-white text-utu-text-secondary hover:bg-utu-bg-muted'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <span className="text-sm text-utu-text-muted">{data?.total ?? 0} entries</span>
      </div>

      {isLoading && <div className="py-10 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-10 text-center text-sm text-red-500">Failed to load calendar.</div>}

      {!isLoading && !isError && Object.entries(grouped).map(([month, monthEntries]) => (
        <div key={month}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-utu-text-muted">
            {month} 2026
          </h3>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Week', 'Title', 'Keyword', 'Lang', 'Status', 'File', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {monthEntries.map((entry) => {
                  const next = nextStatus(entry.status);
                  return (
                    <tr key={entry.id} className="hover:bg-utu-bg-muted">
                      <td className="px-4 py-3 text-xs font-medium text-utu-text-muted whitespace-nowrap">
                        {entry.publish_week}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="font-medium text-utu-text-primary truncate" title={entry.title}>
                          {entry.title}
                        </div>
                        {entry.notes && (
                          <div className="mt-0.5 text-xs text-amber-600 truncate">
                            {entry.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-xs text-utu-text-muted truncate block" title={entry.keyword ?? ''}>
                          {entry.keyword ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LANG_COLORS[entry.language] ?? 'bg-gray-100 text-gray-600'}`}>
                          {entry.language}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.file_path ? (
                          <span className="text-xs text-green-600 font-medium">Linked</span>
                        ) : (
                          <span className="text-xs text-utu-text-muted">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {next && (
                            <button
                              onClick={() => advanceMutation.mutate({ id: entry.id, status: next })}
                              disabled={advanceMutation.isPending}
                              className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-blue hover:bg-utu-bg-subtle transition-colors disabled:opacity-40"
                            >
                              Mark {next}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Remove "${entry.title}" from calendar?`)) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!isLoading && !isError && entries.length === 0 && (
        <div className="py-16 text-center text-sm text-utu-text-muted">
          No entries match the current filters.
        </div>
      )}
    </div>
  );
}

// ─── Tab: Draft Queue ─────────────────────────────────────────────────────────

function DraftQueueTab() {
  const qc = useQueryClient();
  const [msg,         setMsg]         = useState('');
  const [preview,     setPreview]     = useState<string | null>(null);
  const [linking,     setLinking]     = useState<{ filename: string; title: string; utmCampaign: string | null } | null>(null);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-drafts'],
    queryFn:  getDraftFiles,
    staleTime: 15_000,
  });

  // Mutation to link a draft file_path to its matching calendar entry
  const linkMutation = useMutation({
    mutationFn: async ({ filename, utmCampaign }: { filename: string; utmCampaign: string | null }) => {
      // Find calendar entry by utm_campaign
      const cal = await getCalendar({ status: 'planned' });
      const match = cal.data.find((e) => e.utm_campaign === utmCampaign);
      if (!match) throw new Error('No matching calendar entry found for this UTM campaign.');
      return updateCalendarEntry(match.id, {
        file_path: `marketing/blog-drafts/${filename}`,
        status:    'draft',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-calendar'] });
      qc.invalidateQueries({ queryKey: ['marketing-drafts'] });
      setLinking(null);
      flash('Draft linked to calendar entry and status set to Draft.');
    },
    onError: (err: Error) => flash(err.message),
  });

  const drafts: DraftFile[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      {preview && (
        <DraftPreviewModal
          filename={preview}
          onClose={() => setPreview(null)}
          onLinkToEntry={(filename, title, utmCampaign) => {
            setPreview(null);
            setLinking({ filename, title, utmCampaign });
          }}
        />
      )}

      {msg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      {linking && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-800">
            Link <span className="font-mono">{linking.filename}</span> to its calendar entry?
          </p>
          <p className="mt-1 text-amber-700 text-xs">
            UTM campaign: <span className="font-mono">{linking.utmCampaign ?? 'none'}</span> — will set status to Draft.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => linkMutation.mutate({ filename: linking.filename, utmCampaign: linking.utmCampaign })}
              disabled={linkMutation.isPending}
              className="rounded-lg bg-utu-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-utu-blue transition-colors disabled:opacity-50"
            >
              {linkMutation.isPending ? 'Linking…' : 'Confirm Link'}
            </button>
            <button
              onClick={() => setLinking(null)}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-utu-text-muted">
          {data?.total ?? 0} draft files in <span className="font-mono text-xs">marketing/blog-drafts/</span>
        </p>
      </div>

      {isLoading && <div className="py-10 text-center text-sm text-utu-text-muted">Reading drafts folder…</div>}
      {isError   && <div className="py-10 text-center text-sm text-red-500">Failed to read drafts folder.</div>}

      {!isLoading && !isError && drafts.length === 0 && (
        <div className="py-16 text-center text-sm text-utu-text-muted">
          No draft files yet. Run the sub-agents to produce April posts.
        </div>
      )}

      {!isLoading && !isError && drafts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['File', 'Title', 'Lang', 'Words', 'Size', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {drafts.map((draft) => (
                <tr key={draft.filename} className="hover:bg-utu-bg-muted">
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="block truncate font-mono text-xs text-utu-text-muted" title={draft.filename}>
                      {draft.filename}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <span className="block truncate text-sm font-medium text-utu-text-primary" title={draft.title}>
                      {draft.title}
                    </span>
                    {draft.utm_campaign && (
                      <span className="block truncate text-xs text-utu-text-muted font-mono mt-0.5">
                        {draft.utm_campaign}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LANG_COLORS[draft.language] ?? 'bg-gray-100 text-gray-600'}`}>
                      {draft.language}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">
                    {draft.word_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    {fmtBytes(draft.size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                    {draft.date ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreview(draft.filename)}
                        className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-blue hover:bg-utu-bg-subtle transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Consent Tab ─────────────────────────────────────────────────────────────

const ALL_MARKETS = ['SA','AE','KW','JO','BH','MA','TN','OM','QA','GB','DE','FR','NL','IT','ES','BE','PL','CH','AT','TR','US','CA','BR','ID','MY'];

function ConsentTab() {
  const [email, setEmail]     = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus]   = useState<'all'|'granted'|'revoked'>('all');
  const [page, setPage]       = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consent-log', email, country, status, page],
    queryFn:  () => getConsentLog({ email: email || undefined, country: country || undefined, status, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        Consent log is append-only per GDPR Art. 7 — read-only view. Withdrawal = new row with granted=false.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search by email..." value={email}
          onChange={e => { setEmail(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue w-56" />
        <select value={country} onChange={e => { setCountry(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Countries</option>
          {ALL_MARKETS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="all">All</option>
          <option value="granted">Granted</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-8 text-center text-sm text-utu-text-muted">Loading...</div>}
        {isError   && <div className="p-8 text-center text-sm text-red-500">Failed to load consent log.</div>}
        {data && (
          <>
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-utu-text-muted">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-utu-text-muted">Country</th>
                  <th className="px-4 py-3 text-left font-medium text-utu-text-muted">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-utu-text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-utu-text-muted">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {data.data.map((row: ConsentRow) => (
                  <tr key={row.user_id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-mono text-xs text-utu-text-primary">{row.email}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="rounded-full bg-utu-bg-muted px-2 py-0.5 text-utu-text-secondary">{row.country_code || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted">{row.consent_type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {row.granted ? 'granted' : 'revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted">
                      {new Date(row.timestamp).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-utu-text-muted">No consent records found.</td></tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-utu-border-default px-4 py-3">
              <span className="text-xs text-utu-text-muted">{data.total} total records</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Prev</button>
                <span className="flex items-center px-2 text-xs text-utu-text-muted">Page {page}</span>
                <button onClick={() => setPage(p => p+1)} disabled={data.data.length < 50}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

const TIMELINE_STATUS_COLORS: Record<string, string> = {
  planned:   'bg-gray-100 text-gray-600',
  draft:     'bg-blue-50 text-blue-700',
  review:    'bg-amber-50 text-amber-700',
  approved:  'bg-green-50 text-green-700',
  published: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-blue-100 text-blue-700',
  sending:   'bg-amber-100 text-amber-700',
  sent:      'bg-utu-bg-subtle text-utu-blue',
  cancelled: 'bg-red-100 text-red-600',
};

function TimelineTab({ onGoToCampaigns }: { onGoToCampaigns: () => void }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [page, setPage]   = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-timeline', month, page],
    queryFn:  () => getMarketingTimeline({ month, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });

  function prevMonth() {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    setPage(1);
  }
  function nextMonth() {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    setPage(1);
  }

  const monthLabel = new Date(month + '-02').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Group by week (for content items) or by week-of-month (for campaigns)
  const grouped = data?.data.reduce((acc: Record<string, TimelineItem[]>, item) => {
    const key = item.publish_week ?? (item.scheduled_for
      ? new Date(item.scheduled_for).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
      : new Date(item.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }));
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth}
          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
          ← Prev
        </button>
        <span className="text-sm font-semibold text-utu-text-primary min-w-[140px] text-center">{monthLabel}</span>
        <button onClick={nextMonth}
          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
          Next →
        </button>
        {data && <span className="ms-auto text-xs text-utu-text-muted">{data.total} items</span>}
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-utu-text-muted">Loading timeline...</div>}
      {isError   && <div className="py-8 text-center text-sm text-red-500">Failed to load timeline.</div>}

      {data && data.data.length === 0 && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-8 text-center text-utu-text-muted">
          Nothing scheduled for {monthLabel}.
        </div>
      )}

      {/* Grouped timeline */}
      {Object.entries(grouped).map(([week, items]) => (
        <div key={week} className="space-y-2">
          <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide">{week}</p>
          <div className="rounded-xl border border-utu-border-default bg-utu-bg-card overflow-hidden divide-y divide-[#E5E7EB]">
            {items.map((item: TimelineItem) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-utu-bg-muted">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.item_type === 'content' ? 'bg-indigo-50 text-indigo-700' : 'bg-utu-bg-subtle text-utu-blue'}`}>
                  {item.item_type === 'content' ? 'Content' : 'Campaign'}
                </span>
                <span className="flex-1 text-sm text-utu-text-primary font-medium truncate">{item.title}</span>
                {item.language && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{item.language}</span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIMELINE_STATUS_COLORS[item.status] ?? 'bg-utu-bg-muted text-utu-text-secondary'}`}>
                  {item.status}
                </span>
                {item.item_type === 'content' ? (
                  <a href="/admin/marketing" className="text-xs text-utu-blue hover:underline">View</a>
                ) : (
                  <button onClick={onGoToCampaigns} className="text-xs text-utu-blue hover:underline">View</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Campaigns tab ───────────────────────────────────────────────────────────

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft:     'bg-utu-bg-muted text-utu-text-secondary',
  scheduled: 'bg-blue-100 text-blue-700',
  sending:   'bg-amber-100 text-amber-700',
  sent:      'bg-utu-bg-subtle text-utu-blue',
  cancelled: 'bg-red-100 text-red-600',
};

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function CampaignStatsModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-stats', campaign.id],
    queryFn:  () => getCampaignStats(campaign.id),
  });
  const dupMutation = useMutation({
    mutationFn: () => duplicateCampaign(campaign.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }); onClose(); },
  });

  const c = data?.data ?? campaign;
  const fmt1 = (n?: number | null) => n != null ? `${n.toFixed(1)}%` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-utu-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">{c.name}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-utu-text-muted">Loading stats…</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Delivered', value: c.sent_count,      color: 'text-utu-blue' },
                { label: 'Opens',     value: c.opened_count,    color: 'text-green-600' },
                { label: 'Clicks',    value: c.click_count ?? 0, color: 'text-amber-600' },
                { label: 'Failed',    value: c.failed_count,    color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-utu-border-default p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-utu-text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Delivery Rate',    value: fmt1(c.delivery_rate_pct) },
                { label: 'Open Rate',        value: fmt1(c.open_rate_pct) },
                { label: 'Click Rate (CTR)', value: fmt1(c.click_rate_pct) },
                { label: 'Click-to-Open',    value: fmt1(c.click_to_open_rate_pct) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-utu-border-default p-3">
                  <p className="text-lg font-semibold text-utu-text-primary">{value}</p>
                  <p className="text-xs text-utu-text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-utu-border-default p-3 text-xs text-utu-text-secondary space-y-1">
              <p><span className="font-medium">Scheduled:</span> {fmtDateTime(c.scheduled_for)}</p>
              <p><span className="font-medium">Completed:</span> {fmtDateTime(c.completed_at ?? null)}</p>
              {c.send_duration_seconds != null && (
                <p><span className="font-medium">Duration:</span> {c.send_duration_seconds}s</p>
              )}
            </div>
          </div>
        )}
        <div className="border-t border-utu-border-default px-6 py-4">
          <button onClick={() => dupMutation.mutate()} disabled={dupMutation.isPending}
            className="w-full rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
            {dupMutation.isPending ? 'Duplicating…' : 'Duplicate Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignCreatePanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', subjectEn: '', subjectAr: '', scheduledFor: '' });

  const createMutation = useMutation({
    mutationFn: () => createCampaign({
      name:         form.name.trim(),
      subjectEn:    form.subjectEn.trim(),
      subjectAr:    form.subjectAr.trim() || undefined,
      scheduledFor: form.scheduledFor || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }); onClose(); },
  });

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">New Campaign</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>
        <div className="flex-1 space-y-4 px-6 py-5">
          {[
            { label: 'Campaign Name *', key: 'name',      placeholder: 'e.g. April Deals — SA',           dir: undefined },
            { label: 'Subject (EN) *',  key: 'subjectEn', placeholder: 'Exclusive Offers from UTUBooking', dir: undefined },
            { label: 'Subject (AR)',    key: 'subjectAr', placeholder: 'عروض حصرية من UTUBooking',         dir: 'rtl' as const },
          ].map(({ label, key, placeholder, dir }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{label}</label>
              <input type="text" dir={dir} placeholder={placeholder}
                value={form[key as keyof typeof form]} onChange={f(key as keyof typeof form)}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Schedule For (optional)</label>
            <input type="datetime-local" value={form.scheduledFor} onChange={f('scheduledFor')}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
          <p className="rounded-lg border border-utu-border-default bg-utu-bg-muted p-3 text-xs text-utu-text-secondary">
            To add deal items and audience targeting, use the{' '}
            <a href="/admin/notifications/campaigns" className="text-utu-blue hover:underline">full campaign builder</a>.
          </p>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4">
          {createMutation.isError && <p className="mb-3 text-xs text-red-500">Failed to create campaign.</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
              Cancel
            </button>
            <button onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.name.trim() || !form.subjectEn.trim()}
              className="flex-1 rounded-lg bg-utu-blue py-2.5 text-sm font-medium text-white disabled:opacity-40">
              {createMutation.isPending ? 'Creating…' : 'Create Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [createOpen, setCreateOpen]     = useState(false);
  const [statsFor, setStatsFor]         = useState<Campaign | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-campaigns', statusFilter, page],
    queryFn:  () => getCampaigns(page, statusFilter || undefined),
    staleTime: 30_000,
  });
  const campaigns: Campaign[] = data?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendCampaignNow(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['', 'draft', 'scheduled', 'sending', 'sent', 'cancelled'] as const).map(s => (
          <button key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-utu-blue text-white border-utu-blue'
                : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-muted'
            }`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="ms-auto flex gap-2">
          <a href="/admin/notifications/campaigns"
            className="rounded-lg border border-utu-border-default px-4 py-2 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
            Full Builder
          </a>
          <button onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white">
            New Campaign
          </button>
        </div>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-12 text-center text-sm text-red-500">Failed to load campaigns.</div>}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Campaign', 'Status', 'Scheduled', 'Delivered', 'Opens', 'Open %', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-utu-bg-muted">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{c.name}</p>
                    <p className="max-w-[220px] truncate text-xs text-utu-text-muted">{c.subject_en}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CAMPAIGN_STATUS_COLORS[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-utu-text-secondary">{fmtDateTime(c.scheduled_for)}</td>
                  <td className="px-4 py-3 text-sm text-utu-text-secondary">{c.sent_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-utu-text-secondary">{c.opened_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-utu-text-secondary">
                    {c.open_rate_pct != null ? `${c.open_rate_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setStatsFor(c)}
                        className="rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                        Stats
                      </button>
                      {c.status === 'draft' && (
                        <button
                          onClick={() => { if (confirm(`Send "${c.name}" now?`)) sendMutation.mutate(c.id); }}
                          disabled={sendMutation.isPending}
                          className="rounded border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50 disabled:opacity-40">
                          Send
                        </button>
                      )}
                      {(c.status === 'draft' || c.status === 'cancelled') && (
                        <button
                          onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id); }}
                          disabled={deleteMutation.isPending}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                          Del
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-utu-text-muted">No campaigns found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Prev</button>
          <span className="flex items-center px-2 text-xs text-utu-text-muted">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={campaigns.length < 20}
            className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
        </div>
      )}

      {createOpen && <CampaignCreatePanel onClose={() => setCreateOpen(false)} />}
      {statsFor   && <CampaignStatsModal campaign={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplatePreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-utu-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">Template Preview</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <iframe srcDoc={html} sandbox="allow-same-origin"
            className="h-full w-full rounded-lg border border-utu-border-default" title="Email preview" />
        </div>
      </div>
    </div>
  );
}

function TemplateEditPanel({ template, onClose }: { template: EmailTemplate | null; onClose: () => void }) {
  const qc     = useQueryClient();
  const isEdit = !!template;
  const [form, setForm] = useState({
    name:        template?.name        ?? '',
    description: template?.description ?? '',
    subject_en:  template?.subject_en  ?? '',
    subject_ar:  template?.subject_ar  ?? '',
    html_en:     template?.html_en     ?? '',
    html_ar:     template?.html_ar     ?? '',
  });
  const [preview, setPreview] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => isEdit
      ? updateTemplate(template!.id, form)
      : createTemplate({ ...form, variables: ['user.name', 'campaign.name', 'deals', 'unsubscribe_url'] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketing-templates'] }); onClose(); },
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
        <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-utu-bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
            <h2 className="text-lg font-semibold text-utu-text-primary">{isEdit ? 'Edit Template' : 'New Template'}</h2>
            <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
          </div>
          <div className="flex-1 space-y-4 px-6 py-5">
            {[
              { label: 'Template Name', key: 'name',        placeholder: 'e.g. monthly_deal_digest',            dir: undefined },
              { label: 'Description',  key: 'description',  placeholder: 'Internal description (optional)',      dir: undefined },
              { label: 'Subject (EN)', key: 'subject_en',   placeholder: 'Exclusive Deals — UTUBooking',         dir: undefined },
              { label: 'Subject (AR)', key: 'subject_ar',   placeholder: 'عروض حصرية — UTUBooking',              dir: 'rtl' as const },
            ].map(({ label, key, placeholder, dir }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{label}</label>
                <input type="text" dir={dir} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
              </div>
            ))}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-utu-text-secondary">HTML Body (EN) *</label>
                {form.html_en && (
                  <button onClick={() => setPreview(form.html_en)} className="text-xs font-medium text-utu-blue hover:underline">Preview</button>
                )}
              </div>
              <textarea value={form.html_en} rows={10}
                onChange={e => setForm(f => ({ ...f, html_en: e.target.value }))}
                placeholder="<!DOCTYPE html>..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-utu-text-secondary">HTML Body (AR) — optional</label>
                {form.html_ar && (
                  <button onClick={() => setPreview(form.html_ar)} className="text-xs font-medium text-utu-blue hover:underline">Preview</button>
                )}
              </div>
              <textarea value={form.html_ar} rows={6} dir="rtl"
                onChange={e => setForm(f => ({ ...f, html_ar: e.target.value }))}
                placeholder="<!DOCTYPE html dir='rtl'>..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <p className="text-xs text-utu-text-muted">
              Variables: {'{{'}user.name{'}}'}, {'{{'}campaign.name{'}}'}, {'{{'}deals{'}}'}, {'{{'}unsubscribe_url{'}}'}
            </p>
          </div>
          <div className="border-t border-utu-border-default px-6 py-4">
            {saveMutation.isError && <p className="mb-3 text-xs text-red-500">Failed to save template.</p>}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.name || !form.subject_en || !form.html_en}
                className="flex-1 rounded-lg bg-utu-blue py-2.5 text-sm font-medium text-white disabled:opacity-40">
                {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {preview && <TemplatePreviewModal html={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

function TemplatesTab() {
  const qc = useQueryClient();
  const [panel, setPanel]     = useState<EmailTemplate | 'new' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn:  getTemplates,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['marketing-templates'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-utu-text-muted">Reusable HTML email layouts — used by campaigns for bilingual sends.</p>
        <button onClick={() => setPanel('new')}
          className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white">
          New Template
        </button>
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-8 text-center text-sm text-red-500">Failed to load templates.</div>}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((t: EmailTemplate) => (
            <div key={t.id} className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-3">
              <div>
                <p className="font-semibold text-utu-text-primary">{t.name}</p>
                {t.description && <p className="mt-0.5 text-xs text-utu-text-muted">{t.description}</p>}
              </div>
              <div className="space-y-1">
                <p className="truncate text-xs text-utu-text-secondary"><span className="font-medium">EN:</span> {t.subject_en}</p>
                {t.subject_ar && (
                  <p className="truncate text-xs text-utu-text-secondary" dir="rtl"><span className="font-medium">AR:</span> {t.subject_ar}</p>
                )}
              </div>
              <p className="text-xs text-utu-text-muted">
                Updated {new Date(t.updated_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPreview(t.html_en)}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">Preview</button>
                <button onClick={() => setPanel(t)}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">Edit</button>
                <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                  disabled={deleteMutation.isPending}
                  className="ms-auto rounded border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">Delete</button>
              </div>
            </div>
          ))}
          {data.data.length === 0 && (
            <div className="col-span-3 rounded-xl border border-utu-border-default bg-utu-bg-card p-8 text-center text-utu-text-muted">
              No templates yet. Create one to get started.
            </div>
          )}
        </div>
      )}

      {panel !== null && <TemplateEditPanel template={panel === 'new' ? null : panel} onClose={() => setPanel(null)} />}
      {preview && <TemplatePreviewModal html={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ─── Email Log tab ────────────────────────────────────────────────────────────

const DELIVERY_COLORS: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  opened:    'bg-blue-100 text-blue-700',
  clicked:   'bg-indigo-100 text-indigo-700',
  failed:    'bg-red-100 text-red-600',
  bounced:   'bg-red-100 text-red-600',
  pending:   'bg-amber-100 text-amber-700',
};

function EmailLogTab() {
  const [emailType, setEmailType]   = useState('');
  const [deliveryStatus, setStatus] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [page, setPage]             = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketing-email-log', emailType, deliveryStatus, bookingRef, page],
    queryFn:  () => getEmailLog(
      { emailType: emailType || undefined, deliveryStatus: deliveryStatus || undefined, bookingRef: bookingRef || undefined },
      page,
    ),
    staleTime: 30_000,
  });
  const rows: EmailLogRow[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Filter by booking ref…" value={bookingRef}
          onChange={e => { setBookingRef(e.target.value); setPage(1); }}
          className="w-44 rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={emailType} onChange={e => { setEmailType(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Types</option>
          {['booking_confirmation','payment_receipt','cancellation','abandoned_booking','price_alert','campaign'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={deliveryStatus} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          {['delivered','opened','clicked','failed','bounced','pending'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-12 text-center text-sm text-red-500">Failed to load email log.</div>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Recipient', 'Type', 'Subject', 'Status', 'Booking Ref', 'Sent At'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 text-sm text-utu-text-primary">{r.recipient_email}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">{r.email_type.replace(/_/g, ' ')}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-utu-text-secondary">{r.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${DELIVERY_COLORS[r.delivery_status] ?? 'bg-utu-bg-muted text-utu-text-muted'}`}>
                        {r.delivery_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted">{r.booking_ref ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-utu-text-secondary">
                      {new Date(r.sent_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-utu-text-muted">No email records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Prev</button>
            <span className="flex items-center px-2 text-xs text-utu-text-muted">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={rows.length < 50}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Suppressions Tab ─────────────────────────────────────────────────────────

function SuppressionsTab() {
  const qc = useQueryClient();
  const [emailFilter, setEmailFilter]   = useState('');
  const [typeFilter,  setTypeFilter]    = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'lifted'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['suppressions', emailFilter, typeFilter, activeFilter, page],
    queryFn:  () => getSuppressions({
      page, limit: 50,
      email:          emailFilter.trim() || undefined,
      suppressionType: typeFilter || undefined,
      active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    }),
  });

  const liftMut = useMutation({
    mutationFn: (id: string) => liftSuppression(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['suppressions'] }),
  });

  function fmtDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions);
  }

  const rows  = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 50);

  const TYPE_COLORS: Record<string, string> = {
    manual:   'bg-slate-100 text-slate-600',
    bounced:  'bg-red-100 text-red-700',
    unsubscribed: 'bg-orange-100 text-orange-700',
    spam:     'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-utu-text-secondary">
        Email suppressions prevent marketing and recovery emails from being sent to specific users or bookings.
        Lifting a suppression re-enables future emails. The suppression log is read-only for audit purposes.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Filter by email…"
          value={emailFilter}
          onChange={e => { setEmailFilter(e.target.value); setPage(1); }}
          className="w-52 rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-1 focus:ring-utu-blue"
        />
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All types</option>
          {['manual','bounced','unsubscribed','spam'].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <div className="flex rounded border border-utu-border-default overflow-hidden text-sm">
          {(['all','active','lifted'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setActiveFilter(v); setPage(1); }}
              className={`px-3 py-2 capitalize ${activeFilter === v ? 'bg-utu-blue text-white' : 'bg-utu-bg-card text-utu-text-secondary hover:bg-utu-bg-muted'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="text-sm text-utu-text-muted">{total} record{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !rows.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No suppressions found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['User','Type','Reason','Booking','Created','Status',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map((row: SuppressionRow) => (
                <tr key={row.id} className="hover:bg-utu-bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-utu-text-primary">{row.user_email ?? '—'}</div>
                    {row.user_name && <div className="text-xs text-utu-text-muted">{row.user_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[row.suppression_type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {row.suppression_type}
                    </span>
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-utu-text-secondary">
                    <div className="truncate">{row.reason ?? '—'}</div>
                    <div className="text-xs text-utu-text-muted">{row.suppressed_by ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-utu-text-muted">
                    {row.booking_id ? row.booking_id.slice(0, 8) + '…' : 'global'}
                  </td>
                  <td className="px-4 py-3 text-utu-text-muted whitespace-nowrap">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    {row.lifted_at ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Lifted {fmtDate(row.lifted_at)}</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!row.lifted_at && (
                      <button
                        onClick={() => liftMut.mutate(row.id)}
                        disabled={liftMut.isPending}
                        className="rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-secondary hover:border-green-400 hover:text-green-700 disabled:opacity-40"
                      >
                        Lift
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Prev</button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Content Calendar', 'Draft Queue', 'Campaigns', 'Templates', 'Email Log', 'Consent', 'Suppressions', 'Timeline'] as const;
type Tab = typeof TABS[number];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Content Calendar');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Marketing</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Content calendar, campaigns, email templates, send log, consent management, and unified timeline.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-utu-border-default">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Content Calendar' && <CalendarTab />}
      {activeTab === 'Draft Queue'      && <DraftQueueTab />}
      {activeTab === 'Campaigns'        && <CampaignsTab />}
      {activeTab === 'Templates'        && <TemplatesTab />}
      {activeTab === 'Email Log'        && <EmailLogTab />}
      {activeTab === 'Consent'          && <ConsentTab />}
      {activeTab === 'Suppressions'     && <SuppressionsTab />}
      {activeTab === 'Timeline'         && <TimelineTab onGoToCampaigns={() => setActiveTab('Campaigns')} />}
    </div>
  );
}
