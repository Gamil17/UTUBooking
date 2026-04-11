'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminContactEnquiries, updateEnquiry, type ContactEnquiry } from '@/lib/api';

type EnquiryStatus   = 'new' | 'read' | 'replied';
type EnquiryPriority = 'low' | 'normal' | 'high' | 'urgent';

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new:     'New',
  read:    'Read',
  replied: 'Replied',
};

const STATUS_COLORS: Record<EnquiryStatus, string> = {
  new:     'bg-blue-50 text-blue-700',
  read:    'bg-amber-50 text-amber-700',
  replied: 'bg-green-50 text-green-700',
};

const PRIORITY_LABELS: Record<EnquiryPriority, string> = {
  low:    'Low',
  normal: 'Normal',
  high:   'High',
  urgent: 'Urgent',
};

const PRIORITY_COLORS: Record<EnquiryPriority, string> = {
  low:    'bg-gray-100 text-gray-500',
  normal: 'bg-blue-50 text-blue-600',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-600',
};

const TOPIC_LABELS: Record<string, string> = {
  flights:  'Flights',
  hotels:   'Hotels',
  hajj:     'Hajj',
  cars:     'Cars',
  payments: 'Payments',
  tech:     'Technical',
  visa:     'Visa',
  privacy:  'Privacy',
  other:    'Other',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminContactPage() {
  const qc = useQueryClient();

  const [search,          setSearch]          = useState('');
  const [statusFilter,    setStatusFilter]    = useState('');
  const [priorityFilter,  setPriorityFilter]  = useState('');
  const [page,            setPage]            = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [msg,             setMsg]             = useState('');

  // Per-row editable state for inline assignment/priority
  const [editAssign,   setEditAssign]   = useState<Record<string, string>>({});
  const [editPriority, setEditPriority] = useState<Record<string, string>>({});

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
    queryKey: ['admin-contact-enquiries', debouncedSearch, statusFilter, priorityFilter, page],
    queryFn:  () => getAdminContactEnquiries({
      search:   debouncedSearch || undefined,
      status:   statusFilter    || undefined,
      priority: priorityFilter  || undefined,
      page,
    }),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateEnquiry>[1] }) =>
      updateEnquiry(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-contact-enquiries'] });
      setMsg('Updated.');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  function markStatus(id: string, status: EnquiryStatus) {
    updateMutation.mutate({ id, payload: { status } });
  }

  function saveInlineEdits(enq: ContactEnquiry) {
    const assignedTo = editAssign[enq.id]  ?? enq.assigned_to  ?? '';
    const priority   = editPriority[enq.id] ?? enq.priority ?? 'normal';
    updateMutation.mutate({
      id:      enq.id,
      payload: {
        assignedTo: assignedTo || undefined,
        priority:   priority as EnquiryPriority,
      },
    });
  }

  const enquiries: ContactEnquiry[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Contact Enquiries</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Messages submitted via the /contact page. Mark as read or replied after actioning.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, email or message…"
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
          {(Object.keys(STATUS_LABELS) as EnquiryStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm
                     text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All priorities</option>
          {(Object.keys(PRIORITY_LABELS) as EnquiryPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && (
          <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>
        )}
        {isError && (
          <div className="p-10 text-center text-sm text-red-500">Failed to load enquiries.</div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Name', 'Email', 'Topic', 'Ref', 'Priority', 'Status', 'Assigned', 'Received', 'Actions'].map((h) => (
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
                {enquiries.map((enq) => (
                  <>
                    <tr
                      key={enq.id}
                      className="hover:bg-utu-bg-muted cursor-pointer"
                      onClick={() => setExpandedId(expandedId === enq.id ? null : enq.id)}
                    >
                      <td className="px-4 py-3 font-medium text-utu-text-primary whitespace-nowrap">
                        {enq.name}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-utu-text-secondary">
                        {enq.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-utu-text-secondary">
                          {TOPIC_LABELS[enq.topic] ?? enq.topic}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-utu-text-muted font-mono">
                        {enq.booking_ref ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[(enq.priority ?? 'normal') as EnquiryPriority] ?? ''}`}>
                          {PRIORITY_LABELS[(enq.priority ?? 'normal') as EnquiryPriority] ?? enq.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[enq.status as EnquiryStatus] ?? ''}`}>
                          {STATUS_LABELS[enq.status as EnquiryStatus] ?? enq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                        {enq.assigned_to ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                        {formatDate(enq.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {enq.status !== 'read' && (
                            <button
                              onClick={() => markStatus(enq.id, 'read')}
                              disabled={updateMutation.isPending}
                              className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-text-secondary
                                         hover:bg-utu-bg-subtle disabled:opacity-40 transition-colors"
                            >
                              Mark read
                            </button>
                          )}
                          {enq.status !== 'replied' && (
                            <button
                              onClick={() => markStatus(enq.id, 'replied')}
                              disabled={updateMutation.isPending}
                              className="rounded border border-green-300 px-2.5 py-1 text-xs text-green-700
                                         hover:bg-green-50 disabled:opacity-40 transition-colors"
                            >
                              Replied
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedId === enq.id && (
                      <tr key={`${enq.id}-expand`} className="bg-utu-bg-subtle">
                        <td colSpan={9} className="px-6 py-4 space-y-4">
                          {/* Message */}
                          <p className="text-sm text-utu-text-primary whitespace-pre-wrap leading-relaxed">
                            {enq.message}
                          </p>

                          {enq.admin_notes && (
                            <p className="text-xs text-utu-text-muted italic border-t border-utu-border-default pt-2">
                              Admin notes: {enq.admin_notes}
                            </p>
                          )}

                          {/* Inline assign + priority */}
                          <div
                            className="flex flex-wrap items-end gap-4 border-t border-utu-border-default pt-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <label className="block text-xs font-medium text-utu-text-muted mb-1">
                                Assign to
                              </label>
                              <input
                                type="text"
                                placeholder="Agent email or name"
                                value={editAssign[enq.id] ?? enq.assigned_to ?? ''}
                                onChange={(e) => setEditAssign((prev) => ({ ...prev, [enq.id]: e.target.value }))}
                                className="rounded border border-utu-border-default px-2.5 py-1.5 text-xs
                                           text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue w-52"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-utu-text-muted mb-1">
                                Priority
                              </label>
                              <select
                                value={editPriority[enq.id] ?? enq.priority ?? 'normal'}
                                onChange={(e) => setEditPriority((prev) => ({ ...prev, [enq.id]: e.target.value }))}
                                className="rounded border border-utu-border-default px-2.5 py-1.5 text-xs
                                           text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                              >
                                {(Object.keys(PRIORITY_LABELS) as EnquiryPriority[]).map((p) => (
                                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => saveInlineEdits(enq)}
                              disabled={updateMutation.isPending}
                              className="rounded bg-utu-navy px-3 py-1.5 text-xs text-white
                                         hover:bg-utu-navy/90 disabled:opacity-40 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {enquiries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-utu-text-muted">
                      No enquiries found.
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
              disabled={enquiries.length < 25}
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
