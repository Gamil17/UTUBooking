'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  getCampaigns, createCampaign, sendCampaignNow, deleteCampaign,
  duplicateCampaign, getCampaignStats, getAudienceEstimate,
  type Campaign, type DealItem, type TargetSegment,
} from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-utu-bg-muted   text-utu-text-secondary',
  scheduled: 'bg-blue-100   text-blue-700',
  sending:   'bg-amber-100  text-amber-700',
  sent:      'bg-utu-bg-subtle text-utu-blue',
  cancelled: 'bg-red-100    text-red-600',
};

const ALL_COUNTRIES = ['SA','AE','KW','JO','BH','MA','TN','OM','QA','GB','DE','FR','NL','IT','ES','BE','PL','CH','AT','TR','US','CA','BR','ID','MY'];
const LOYALTY_TIERS = ['bronze','silver','gold','platinum'];

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

const emptySegment = (): TargetSegment => ({ countries: [], loyalty_tiers: [] });

function StatsModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-stats', campaign.id],
    queryFn:  () => getCampaignStats(campaign.id),
  });
  const qc = useQueryClient();
  const dupMutation = useMutation({
    mutationFn: () => duplicateCampaign(campaign.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onClose(); },
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
          <div className="p-8 text-center text-sm text-utu-text-muted">Loading stats...</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Headline metrics */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Delivered', value: c.sent_count, color: 'text-utu-blue' },
                { label: 'Opens',     value: c.opened_count, color: 'text-green-600' },
                { label: 'Clicks',    value: c.click_count ?? 0, color: 'text-amber-600' },
                { label: 'Failed',    value: c.failed_count, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-utu-border-default p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-utu-text-muted">{label}</p>
                </div>
              ))}
            </div>

            {/* Rate cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Delivery Rate',      value: fmt1(c.delivery_rate_pct) },
                { label: 'Open Rate',          value: fmt1(c.open_rate_pct) },
                { label: 'Click Rate (CTR)',   value: fmt1(c.click_rate_pct) },
                { label: 'Click-to-Open',      value: fmt1(c.click_to_open_rate_pct) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-utu-border-default p-3">
                  <p className="text-lg font-semibold text-utu-text-primary">{value}</p>
                  <p className="text-xs text-utu-text-muted">{label}</p>
                </div>
              ))}
            </div>

            {/* Audience segment */}
            {c.segment_summary && (Object.values(c.segment_summary).some(v => Array.isArray(v) ? v.length : v != null)) && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-utu-text-secondary">Audience Segment</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.segment_summary.countries?.map(co => (
                    <span key={co} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{co}</span>
                  ))}
                  {c.segment_summary.loyalty_tiers?.map(t => (
                    <span key={t} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{t}</span>
                  ))}
                  {c.segment_summary.min_days_since_booking != null && (
                    <span className="rounded-full bg-utu-bg-muted px-2 py-0.5 text-xs text-utu-text-secondary">
                      last booking {c.segment_summary.min_days_since_booking}–{c.segment_summary.max_days_since_booking ?? '∞'} days ago
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Send timeline */}
            <div className="rounded-xl border border-utu-border-default p-3 text-xs text-utu-text-secondary space-y-1">
              <p><span className="font-medium">Scheduled:</span> {formatDate(c.scheduled_for)}</p>
              <p><span className="font-medium">Started:</span> {formatDate(c.started_at ?? null)}</p>
              <p><span className="font-medium">Completed:</span> {formatDate(c.completed_at ?? null)}</p>
              {c.send_duration_seconds != null && (
                <p><span className="font-medium">Duration:</span> {c.send_duration_seconds}s</p>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-utu-border-default px-6 py-4">
          <button
            onClick={() => dupMutation.mutate()}
            disabled={dupMutation.isPending}
            className="w-full rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
          >
            {dupMutation.isPending ? 'Duplicating...' : 'Duplicate Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [statsFor, setStatsFor] = useState<Campaign | null>(null);

  const [form, setForm] = useState({ name: '', subjectEn: '', subjectAr: '', scheduledFor: '' });
  const [deals, setDeals] = useState<DealItem[]>([emptyDeal()]);
  const [segment, setSegment] = useState<TargetSegment>(emptySegment());
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaigns', page],
    queryFn:  () => getCampaigns(page),
  });

  // Debounced audience estimate
  const refreshEstimate = useCallback(async (seg: TargetSegment) => {
    const hasFilter = (seg.countries?.length ?? 0) > 0
      || (seg.loyalty_tiers?.length ?? 0) > 0
      || seg.min_days_since_booking != null
      || seg.max_days_since_booking != null;
    if (!hasFilter) { setEstimatedRecipients(null); return; }
    try {
      const r = await getAudienceEstimate(seg);
      setEstimatedRecipients(r.estimated_recipients);
    } catch { setEstimatedRecipients(null); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (segmentOpen) refreshEstimate(segment); }, 500);
    return () => clearTimeout(t);
  }, [segment, segmentOpen, refreshEstimate]);

  const createMutation = useMutation({
    mutationFn: () => createCampaign({
      name:          form.name,
      subjectEn:     form.subjectEn,
      subjectAr:     form.subjectAr || undefined,
      scheduledFor:  form.scheduledFor || undefined,
      dealItems:     deals.filter((d) => d.title_en),
      targetSegment: (segment.countries?.length || segment.loyalty_tiers?.length) ? segment : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setPanelOpen(false);
      setForm({ name: '', subjectEn: '', subjectAr: '', scheduledFor: '' });
      setDeals([emptyDeal()]);
      setSegment(emptySegment());
      setSegmentOpen(false);
      setEstimatedRecipients(null);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendCampaignNow(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const dupMutation = useMutation({
    mutationFn: (id: string) => duplicateCampaign(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  function updateDeal(i: number, field: keyof DealItem, value: string | number) {
    setDeals((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }

  function toggleCountry(code: string) {
    setSegment(s => ({
      ...s,
      countries: s.countries?.includes(code)
        ? s.countries.filter(c => c !== code)
        : [...(s.countries ?? []), code],
    }));
  }

  function toggleTier(tier: string) {
    setSegment(s => ({
      ...s,
      loyalty_tiers: s.loyalty_tiers?.includes(tier)
        ? s.loyalty_tiers.filter(t => t !== tier)
        : [...(s.loyalty_tiers ?? []), tier],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-utu-text-primary">{t('campaigns')}</h1>
        <button
          onClick={() => setPanelOpen(true)}
          className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue"
        >
          {t('createCampaign')}
        </button>
      </div>

      {/* Campaigns table */}
      <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-8 text-center text-sm text-utu-text-muted">{tCommon('loading')}</div>}
        {isError   && <div className="p-8 text-center text-sm text-red-500">{t('failLoadCampaigns')}</div>}
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
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">CTR %</th>
                <th className="px-4 py-3 text-left font-medium text-utu-text-muted">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.data.map((c) => {
                const openRate = c.sent_count > 0 ? ((c.opened_count / c.sent_count) * 100).toFixed(1) : null;
                const ctr      = c.sent_count > 0 && c.click_count != null ? ((c.click_count / c.sent_count) * 100).toFixed(1) : null;
                return (
                  <tr key={c.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3">
                      <p className="font-medium text-utu-text-primary">{c.name}</p>
                      <p className="text-xs text-utu-text-muted">{c.subject_en}</p>
                      {c.target_segment && (
                        <p className="text-xs text-utu-blue mt-0.5">
                          {[
                            c.target_segment.countries?.join(', '),
                            c.target_segment.loyalty_tiers?.join(', '),
                          ].filter(Boolean).join(' · ') || 'Segmented'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-utu-bg-muted text-utu-text-secondary'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted">{formatDate(c.scheduled_for)}</td>
                    <td className="px-4 py-3 text-utu-text-secondary">{c.total_recipients ?? '—'}</td>
                    <td className="px-4 py-3 text-utu-text-secondary">
                      <span className="text-utu-blue">{c.sent_count}</span>
                      {' / '}
                      <span className="text-red-500">{c.failed_count}</span>
                    </td>
                    <td className="px-4 py-3 text-utu-text-secondary">{openRate ? `${openRate}%` : '—'}</td>
                    <td className="px-4 py-3 text-utu-text-secondary">{ctr ? `${ctr}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(c.status === 'draft' || c.status === 'scheduled') && (
                          <button
                            onClick={() => sendMutation.mutate(c.id)}
                            disabled={sendMutation.isPending}
                            className="rounded bg-utu-blue px-3 py-1 text-xs font-medium text-white hover:bg-utu-blue disabled:opacity-40"
                          >
                            {t('sendNow')}
                          </button>
                        )}
                        {c.status === 'sent' && (
                          <button
                            onClick={() => setStatsFor(c)}
                            className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted"
                          >
                            Stats
                          </button>
                        )}
                        <button
                          onClick={() => dupMutation.mutate(c.id)}
                          disabled={dupMutation.isPending}
                          className="rounded border border-utu-border-default px-3 py-1 text-xs font-medium text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40"
                          title="Duplicate"
                        >
                          Copy
                        </button>
                        {c.status === 'draft' && (
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
                  <td colSpan={8} className="px-4 py-8 text-center text-utu-text-muted">{t('noCampaigns')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex justify-end gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
            {t('previous')}
          </button>
          <span className="flex items-center px-3 text-sm text-utu-text-muted">{t('page', { n: page })}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={data.data.length < 20}
            className="rounded border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
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
              {/* Campaign name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('campaignName')}</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  placeholder={t('campaignNamePlaceholder')} />
              </div>

              {/* Subject EN */}
              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('subjectEn')}</label>
                <input type="text" value={form.subjectEn}
                  onChange={(e) => setForm((f) => ({ ...f, subjectEn: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  placeholder={t('subjectEnPlaceholder')} />
              </div>

              {/* Subject AR */}
              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('subjectAr')}</label>
                <input type="text" dir="rtl" value={form.subjectAr}
                  onChange={(e) => setForm((f) => ({ ...f, subjectAr: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                  placeholder={t('subjectArPlaceholder')} />
              </div>

              {/* Schedule */}
              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{t('scheduleFor')}</label>
                <input type="datetime-local" value={form.scheduledFor}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
              </div>

              {/* Deal items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-utu-text-secondary">{t('dealItems')}</label>
                  <button onClick={() => setDeals((d) => [...d, emptyDeal()])}
                    className="text-xs font-medium text-utu-blue hover:underline">{t('addDeal')}</button>
                </div>
                <div className="space-y-3">
                  {deals.map((deal, i) => (
                    <div key={i} className="rounded-lg border border-utu-border-default p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-utu-text-muted">{t('deal')} {i + 1}</span>
                        {deals.length > 1 && (
                          <button onClick={() => setDeals((d) => d.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-400 hover:text-red-600">{t('remove')}</button>
                        )}
                      </div>
                      <input type="text" placeholder={t('dealTitleEnPlaceholder')} value={deal.title_en}
                        onChange={(e) => updateDeal(i, 'title_en', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                      <input type="text" dir="rtl" placeholder={t('dealTitleArPlaceholder')} value={deal.title_ar ?? ''}
                        onChange={(e) => updateDeal(i, 'title_ar', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder={t('dealPricePlaceholder')} value={deal.price || ''}
                          onChange={(e) => updateDeal(i, 'price', parseFloat(e.target.value) || 0)}
                          className="rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                        <input type="text" placeholder={t('dealCurrencyPlaceholder')} value={deal.currency}
                          onChange={(e) => updateDeal(i, 'currency', e.target.value)}
                          className="rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                      </div>
                      <input type="text" placeholder={t('dealDestinationPlaceholder')} value={deal.destination}
                        onChange={(e) => updateDeal(i, 'destination', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                      <input type="url" placeholder={t('dealCtaUrlPlaceholder')} value={deal.cta_url}
                        onChange={(e) => updateDeal(i, 'cta_url', e.target.value)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Audience Targeting */}
              <div className="rounded-xl border border-utu-border-default">
                <button
                  onClick={() => setSegmentOpen(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-utu-text-secondary"
                >
                  <span>Audience Targeting {segment.countries?.length || segment.loyalty_tiers?.length ? '(active)' : '(all users)'}</span>
                  <span className="text-utu-text-muted">{segmentOpen ? '▲' : '▼'}</span>
                </button>
                {segmentOpen && (
                  <div className="border-t border-utu-border-default px-4 pb-4 pt-3 space-y-4">
                    {/* Countries */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-utu-text-muted">Countries</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_COUNTRIES.map(c => (
                          <button key={c}
                            onClick={() => toggleCountry(c)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                              segment.countries?.includes(c)
                                ? 'bg-utu-blue text-white border-utu-blue'
                                : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-muted'
                            }`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Loyalty tiers */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-utu-text-muted">Loyalty Tier</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LOYALTY_TIERS.map(tier => (
                          <button key={tier}
                            onClick={() => toggleTier(tier)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium border capitalize transition-colors ${
                              segment.loyalty_tiers?.includes(tier)
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-muted'
                            }`}>
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Last booking range */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-utu-text-muted">Last booking (days ago)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="Min" min={0}
                          value={segment.min_days_since_booking ?? ''}
                          onChange={e => setSegment(s => ({ ...s, min_days_since_booking: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="w-20 rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                        <span className="text-xs text-utu-text-muted">to</span>
                        <input type="number" placeholder="Max" min={0}
                          value={segment.max_days_since_booking ?? ''}
                          onChange={e => setSegment(s => ({ ...s, max_days_since_booking: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="w-20 rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                      </div>
                    </div>
                    {/* Estimate */}
                    {estimatedRecipients !== null && (
                      <p className="text-xs text-utu-blue font-medium">
                        ~{estimatedRecipients.toLocaleString()} estimated recipients
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Panel footer */}
            <div className="border-t border-utu-border-default px-6 py-4">
              {createMutation.isError && <p className="mb-3 text-xs text-red-500">{t('failCreate')}</p>}
              <div className="flex gap-3">
                <button onClick={() => setPanelOpen(false)}
                  className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.subjectEn || deals.filter((d) => d.title_en).length === 0}
                  className="flex-1 rounded-lg bg-utu-blue py-2.5 text-sm font-medium text-white hover:bg-utu-blue disabled:opacity-40">
                  {createMutation.isPending ? t('saving') : t('saveCampaign')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats modal */}
      {statsFor && <StatsModal campaign={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}
