'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCampaigns,
  createCampaign,
  sendCampaignNow,
  deleteCampaign,
  type Campaign,
  type DealItem,
} from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100   text-gray-600',
  scheduled: 'bg-blue-100   text-blue-700',
  sending:   'bg-amber-100  text-amber-700',
  sent:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100    text-red-600',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const emptyDeal = (): DealItem => ({
  title_en: '', title_ar: '', price: 0, currency: 'SAR', destination: '', cta_url: '',
});

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);

  // Create campaign form state
  const [form, setForm] = useState({
    name: '', subjectEn: '', subjectAr: '', scheduledFor: '',
  });
  const [deals, setDeals] = useState<DealItem[]>([emptyDeal()]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaigns', page],
    queryFn: () => getCampaigns(page),
  });

  const createMutation = useMutation({
    mutationFn: () => createCampaign({
      name:         form.name,
      subjectEn:    form.subjectEn,
      subjectAr:    form.subjectAr || undefined,
      scheduledFor: form.scheduledFor || undefined,
      dealItems:    deals.filter((d) => d.title_en),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setPanelOpen(false);
      setForm({ name: '', subjectEn: '', subjectAr: '', scheduledFor: '' });
      setDeals([emptyDeal()]);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendCampaignNow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  function updateDeal(i: number, field: keyof DealItem, value: string | number) {
    setDeals((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }

  function canSend(c: Campaign) {
    return c.status === 'draft' || c.status === 'scheduled';
  }

  function canDelete(c: Campaign) {
    return c.status === 'draft';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111827]">Campaigns</h1>
        <button
          onClick={() => setPanelOpen(true)}
          className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          + Create Campaign
        </button>
      </div>

      {/* Campaigns table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        {isLoading && <div className="p-8 text-center text-sm text-[#6B7280]">Loading…</div>}
        {isError && <div className="p-8 text-center text-sm text-red-500">Failed to load campaigns.</div>}
        {data && (
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Name</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Scheduled</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Recipients</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Sent / Failed</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Open rate</th>
                <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((c) => {
                const openRate = c.sent_count > 0
                  ? ((c.opened_count / c.sent_count) * 100).toFixed(1)
                  : '—';
                return (
                  <tr key={c.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111827]">{c.name}</p>
                      <p className="text-xs text-[#6B7280]">{c.subject_en}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{formatDate(c.scheduled_for)}</td>
                    <td className="px-4 py-3 text-[#374151]">{c.total_recipients ?? '—'}</td>
                    <td className="px-4 py-3 text-[#374151]">
                      <span className="text-emerald-600">{c.sent_count}</span>
                      {' / '}
                      <span className="text-red-500">{c.failed_count}</span>
                    </td>
                    <td className="px-4 py-3 text-[#374151]">
                      {typeof openRate === 'string' && openRate !== '—' ? `${openRate}%` : openRate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canSend(c) && (
                          <button
                            onClick={() => sendMutation.mutate(c.id)}
                            disabled={sendMutation.isPending}
                            className="rounded bg-[#10B981] px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                          >
                            Send Now
                          </button>
                        )}
                        {canDelete(c) && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete campaign "${c.name}"?`)) deleteMutation.mutate(c.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="rounded border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">
                    No campaigns yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="flex items-center px-3 text-sm text-[#6B7280]">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.data.length < 20}
            className="rounded border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#F3F4F6] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Create campaign slide-in panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#111827]">New Campaign</h2>
              <button onClick={() => setPanelOpen(false)} className="text-[#6B7280] hover:text-[#111827]">✕</button>
            </div>

            <div className="flex-1 space-y-5 px-6 py-5">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">Campaign name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="e.g. Ramadan 2026 Deals"
                />
              </div>

              {/* Subject EN */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">Subject (English)</label>
                <input
                  type="text"
                  value={form.subjectEn}
                  onChange={(e) => setForm((f) => ({ ...f, subjectEn: e.target.value }))}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Best travel deals this month"
                />
              </div>

              {/* Subject AR */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">Subject (Arabic — optional)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={form.subjectAr}
                  onChange={(e) => setForm((f) => ({ ...f, subjectAr: e.target.value }))}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="أفضل عروض السفر هذا الشهر"
                />
              </div>

              {/* Scheduled for */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">Schedule for (optional — leave blank to save as draft)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              {/* Deal items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[#374151]">Deal items</label>
                  <button
                    onClick={() => setDeals((d) => [...d, emptyDeal()])}
                    className="text-xs font-medium text-[#10B981] hover:underline"
                  >
                    + Add deal
                  </button>
                </div>
                <div className="space-y-3">
                  {deals.map((deal, i) => (
                    <div key={i} className="rounded-lg border border-[#E5E7EB] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6B7280]">Deal {i + 1}</span>
                        {deals.length > 1 && (
                          <button
                            onClick={() => setDeals((d) => d.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Title (English)"
                        value={deal.title_en}
                        onChange={(e) => updateDeal(i, 'title_en', e.target.value)}
                        className="w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      />
                      <input
                        type="text"
                        dir="rtl"
                        placeholder="العنوان (عربي)"
                        value={deal.title_ar ?? ''}
                        onChange={(e) => updateDeal(i, 'title_ar', e.target.value)}
                        className="w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Price"
                          value={deal.price || ''}
                          onChange={(e) => updateDeal(i, 'price', parseFloat(e.target.value) || 0)}
                          className="rounded border border-[#E5E7EB] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                        />
                        <input
                          type="text"
                          placeholder="Currency (SAR)"
                          value={deal.currency}
                          onChange={(e) => updateDeal(i, 'currency', e.target.value)}
                          className="rounded border border-[#E5E7EB] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Destination (e.g. Makkah)"
                        value={deal.destination}
                        onChange={(e) => updateDeal(i, 'destination', e.target.value)}
                        className="w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      />
                      <input
                        type="url"
                        placeholder="CTA URL"
                        value={deal.cta_url}
                        onChange={(e) => updateDeal(i, 'cta_url', e.target.value)}
                        className="w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="border-t border-[#E5E7EB] px-6 py-4">
              {createMutation.isError && (
                <p className="mb-3 text-xs text-red-500">Failed to create campaign. Check all required fields.</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="flex-1 rounded-lg border border-[#E5E7EB] py-2.5 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.subjectEn}
                  className="flex-1 rounded-lg bg-[#10B981] py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
