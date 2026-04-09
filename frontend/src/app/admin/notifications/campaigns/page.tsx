'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getCampaigns,
  createCampaign,
  sendCampaignNow,
  deleteCampaign,
  type Campaign,
  type DealItem,
} from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-utu-bg-muted   text-utu-text-secondary',
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
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);

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
        <h1 className="text-2xl font-bold text-utu-text-primary">{t('campaigns')}</h1>
        <button
          onClick={() => setPanelOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          {t('createCampaign')}
        </button>
      </div>

      {/* Campaigns table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>}
        {isError && <div className="p-8 text-center text-sm text-red-500">{t('failLoadCampaigns')}</div>}
        {data && (
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colName')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colStatus')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colScheduled')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colRecipients')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colSentFailed')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colOpenRate')}</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((c) => {
                const openRate = c.sent_count > 0
                  ? ((c.opened_count / c.sent_count) * 100).toFixed(1)
                  : '—';
                return (
                  <tr key={c.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3">
                      <p className="font-medium text-utu-text-primary">{c.name}</p>
                      <p className="text-xs text-utu-text-muted">{c.subject_en}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-utu-bg-muted text-utu-text-secondary'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted">{formatDate(c.scheduled_for)}</td>
                    <td className="px-4 py-3 text-utu-text-secondary">{c.total_recipients ?? '—'}</td>
                    <td className="px-4 py-3 text-utu-text-secondary">
                      <span className="text-emerald-600">{c.sent_count}</span>
                      {' / '}
                      <span className="text-red-500">{c.failed_count}</span>
                    </td>
                    <td className="px-4 py-3 text-utu-text-secondary">
                      {typeof openRate === 'string' && openRate !== '—' ? `${openRate}%` : openRate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canSend(c) && (
                          <button
                            onClick={() => sendMutation.mutate(c.id)}
                            disabled={sendMutation.isPending}
                            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                          >
                            {t('sendNow')}
                          </button>
                        )}
                        {canDelete(c) && (
                          <button
                            onClick={() => {
                              if (confirm(t('confirmDeleteCampaign', { name: c.name }))) deleteMutation.mutate(c.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-utu-text-muted">
                    {t('noCampaigns')}
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
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
          >
            {t('previous')}
          </button>
          <span className="flex items-center px-3 text-sm text-utu-text-muted">{t('page', { n: page })}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data.data.length < 20}
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Create campaign slide-in panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-utu-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
              <h2 className="text-lg font-semibold text-utu-text-primary">{t('newCampaign')}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
            </div>

            <div className="flex-1 space-y-5 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('campaignName')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder={t('campaignNamePlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('subjectEn')}</label>
                <input
                  type="text"
                  value={form.subjectEn}
                  onChange={(e) => setForm((f) => ({ ...f, subjectEn: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder={t('subjectEnPlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('subjectAr')}</label>
                <input
                  type="text"
                  dir="rtl"
                  value={form.subjectAr}
                  onChange={(e) => setForm((f) => ({ ...f, subjectAr: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder={t('subjectArPlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('scheduleFor')}</label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-utu-text-secondary">{t('dealItems')}</label>
                  <button
                    onClick={() => setDeals((d) => [...d, emptyDeal()])}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    {t('addDeal')}
                  </button>
                </div>
                <div className="space-y-3">
                  {deals.map((deal, i) => (
                    <div key={i} className="rounded-lg border border-utu-border-default p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-utu-text-muted">{t('deal')} {i + 1}</span>
                        {deals.length > 1 && (
                          <button
                            onClick={() => setDeals((d) => d.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            {t('remove')}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={t('dealTitleEnPlaceholder')}
                        value={deal.title_en}
                        onChange={(e) => updateDeal(i, 'title_en', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                      <input
                        type="text"
                        dir="rtl"
                        placeholder={t('dealTitleArPlaceholder')}
                        value={deal.title_ar ?? ''}
                        onChange={(e) => updateDeal(i, 'title_ar', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder={t('dealPricePlaceholder')}
                          value={deal.price || ''}
                          onChange={(e) => updateDeal(i, 'price', parseFloat(e.target.value) || 0)}
                          className="rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <input
                          type="text"
                          placeholder={t('dealCurrencyPlaceholder')}
                          value={deal.currency}
                          onChange={(e) => updateDeal(i, 'currency', e.target.value)}
                          className="rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder={t('dealDestinationPlaceholder')}
                        value={deal.destination}
                        onChange={(e) => updateDeal(i, 'destination', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                      <input
                        type="url"
                        placeholder={t('dealCtaUrlPlaceholder')}
                        value={deal.cta_url}
                        onChange={(e) => updateDeal(i, 'cta_url', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="border-t border-utu-border-default px-6 py-4">
              {createMutation.isError && (
                <p className="mb-3 text-xs text-red-500">{t('failCreate')}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.subjectEn || deals.filter((d) => d.title_en).length === 0}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  {createMutation.isPending ? t('saving') : t('saveCampaign')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
