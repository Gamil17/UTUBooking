'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCrmDeals, createCrmDeal, updateCrmDeal, deleteCrmDeal,
  addCrmContact, deleteCrmContact,
  getCrmActivities, logCrmActivity,
  getHotelPartners, createHotelPartner, updateHotelPartner, deleteHotelPartner,
  getCrmStats, getCrmOverdue,
  getProposalContent,
  getHpActivities, logHpActivity,
  getCrmFunnel,
  getContacts,
  getSalesReps, createSalesRep, updateSalesRep, deleteSalesRep, assignRepQuota,
  getDealAnalysis, analyzeDeal,
  getDealCoaching, coachDeal,
  type CrmDeal, type CrmContact, type CrmActivity,
  type HotelPartner, type DealStage, type ActivityType, type HotelPartnerStatus,
  type CrmStats, type OverdueDeal, type ProposalContent,
  type HpActivity, type HpActivityType,
  type SalesRep, type CrmContactWithDeal,
  type DealAnalysis, type DealRiskLevel,
  type DealCoaching,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_ORDER: DealStage[] = ['lead','qualified','demo','proposal','negotiation','won','lost'];

const STAGE_COLORS: Record<DealStage, string> = {
  lead:        'bg-gray-100 text-gray-600',
  qualified:   'bg-blue-50 text-blue-700',
  demo:        'bg-indigo-50 text-indigo-700',
  proposal:    'bg-amber-50 text-amber-700',
  negotiation: 'bg-orange-50 text-orange-700',
  won:         'bg-green-100 text-green-800',
  lost:        'bg-red-50 text-red-500',
};

const TYPE_LABELS: Record<string, string> = {
  b2b_whitelabel: 'B2B White-Label',
  hotel_partner:  'Hotel Partner',
  airline:        'Airline',
  investor:       'Investor',
  other:          'Other',
};

const ACT_COLORS: Record<ActivityType, string> = {
  call:           'bg-blue-50 text-blue-700',
  email:          'bg-indigo-50 text-indigo-700',
  demo:           'bg-purple-50 text-purple-700',
  meeting:        'bg-amber-50 text-amber-700',
  proposal_sent:  'bg-orange-50 text-orange-700',
  follow_up:      'bg-teal-50 text-teal-700',
  note:           'bg-gray-100 text-gray-600',
  won:            'bg-green-100 text-green-800',
  lost:           'bg-red-50 text-red-500',
};

const HP_STATUS_COLORS: Record<HotelPartnerStatus, string> = {
  not_contacted:      'bg-gray-100 text-gray-500',
  emailed:            'bg-blue-50 text-blue-600',
  replied:            'bg-indigo-50 text-indigo-700',
  meeting_scheduled:  'bg-amber-50 text-amber-700',
  signed:             'bg-green-50 text-green-700',
  live:               'bg-emerald-100 text-emerald-800',
  rejected:           'bg-red-50 text-red-500',
};

const HP_NEXT: Record<HotelPartnerStatus, HotelPartnerStatus | null> = {
  not_contacted:     'emailed',
  emailed:           'replied',
  replied:           'meeting_scheduled',
  meeting_scheduled: 'signed',
  signed:            'live',
  live:              null,
  rejected:          null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtValue(amount: number | null, currency: string) {
  if (!amount) return '—';
  return `${currency} ${amount.toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function nextStage(s: DealStage): DealStage | null {
  if (s === 'won' || s === 'lost') return null;
  const idx = STAGE_ORDER.indexOf(s);
  return idx < STAGE_ORDER.indexOf('negotiation') ? STAGE_ORDER[idx + 1] : null;
}

// ─── Log Activity Modal ───────────────────────────────────────────────────────

function LogActivityModal({ dealId, dealTitle, onClose }: { dealId: string; dealTitle: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: 'note' as ActivityType, summary: '', performed_by: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => logCrmActivity(dealId, { ...form, performed_by: form.performed_by || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-activities', dealId] });
      onClose();
    },
    onError: () => setErr('Failed to log activity.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="font-semibold text-utu-text-primary">Log Activity</h2>
          <p className="mt-0.5 text-xs text-utu-text-muted truncate">{dealTitle}</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as ActivityType }))}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            >
              {(['call','email','demo','meeting','proposal_sent','follow_up','note','won','lost'] as ActivityType[]).map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">Summary *</label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="What happened? Key points discussed, outcome..."
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">Performed by</label>
            <input
              value={form.performed_by}
              onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))}
              placeholder="e.g. CEO, Sales Team"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.summary.trim() || mutation.isPending}
            className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Log Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Proposal Drawer ─────────────────────────────────────────────────────────

function ProposalDrawer({ filePath, onClose }: { filePath: string; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['proposal-content', filePath],
    queryFn:  () => getProposalContent(filePath),
    staleTime: 300_000,
  });

  const doc: ProposalContent | undefined = data?.data;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="font-semibold text-utu-text-primary text-sm truncate max-w-md">{filePath}</h2>
            {doc && (
              <p className="mt-0.5 text-xs text-utu-text-muted">{doc.words.toLocaleString()} words · {Math.round(doc.size / 1024)}KB</p>
            )}
          </div>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && <p className="text-sm text-utu-text-muted">Loading…</p>}
          {isError   && <p className="text-sm text-red-500">Failed to load proposal file.</p>}
          {doc && (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-utu-text-secondary">
              {doc.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Deal Modal ───────────────────────────────────────────────────────────

function AddDealModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', partner_name: '', partner_country: '', deal_type: 'b2b_whitelabel',
    stage: 'lead' as DealStage, value_amount: '', value_currency: 'SAR',
    deal_owner: '', ceo_review_required: false, notes: '', next_action: '',
    next_action_date: '', expected_close_date: '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => createCrmDeal({
      ...form,
      value_amount:        form.value_amount        ? parseFloat(form.value_amount)        : undefined,
      next_action_date:    form.next_action_date    || undefined,
      expected_close_date: form.expected_close_date || undefined,
      ceo_review_required: form.ceo_review_required,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-deals'] }); onClose(); },
    onError: () => setErr('Failed to create deal.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="font-semibold text-utu-text-primary">New Deal</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Deal title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Saudia — Embedded Widget API" required
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Partner name *</label>
              <input value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))}
                placeholder="Company name"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Country (ISO)</label>
              <input value={form.partner_country} onChange={e => setForm(f => ({ ...f, partner_country: e.target.value.toUpperCase().slice(0,2) }))}
                placeholder="SA, AE, KW..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Deal type</label>
              <select value={form.deal_type} onChange={e => setForm(f => ({ ...f, deal_type: e.target.value }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
                {STAGE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Value</label>
              <input type="number" value={form.value_amount} onChange={e => setForm(f => ({ ...f, value_amount: e.target.value }))}
                placeholder="0"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Currency</label>
              <input value={form.value_currency} onChange={e => setForm(f => ({ ...f, value_currency: e.target.value.toUpperCase().slice(0,3) }))}
                placeholder="SAR"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Deal owner</label>
              <input value={form.deal_owner} onChange={e => setForm(f => ({ ...f, deal_owner: e.target.value }))}
                placeholder="e.g. CEO, Sales Team"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Next action</label>
              <input value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))}
                placeholder="e.g. Send proposal, Schedule demo..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Action due date</label>
              <input type="date" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Expected close date</label>
              <input type="date" value={form.expected_close_date} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key context, background, constraints..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-utu-text-secondary">
                <input type="checkbox" checked={form.ceo_review_required}
                  onChange={e => setForm(f => ({ ...f, ceo_review_required: e.target.checked }))}
                  className="rounded border-utu-border-default" />
                CEO review required
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.title || !form.partner_name || mutation.isPending}
            className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creating…' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Deal Panel ────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<DealRiskLevel, { label: string; bg: string; text: string; dot: string }> = {
  low:      { label: 'Low Risk',      bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  medium:   { label: 'Medium Risk',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  high:     { label: 'High Risk',     bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { label: 'Critical Risk', bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
};

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-700';
  if (score >= 50) return 'text-amber-700';
  if (score >= 30) return 'text-orange-700';
  return 'text-red-600';
}

function scoreBg(score: number) {
  if (score >= 70) return 'bg-green-100 border-green-200';
  if (score >= 50) return 'bg-amber-100 border-amber-200';
  if (score >= 30) return 'bg-orange-100 border-orange-200';
  return 'bg-red-100 border-red-200';
}

function AIDealPanel({ dealId }: { dealId: string }) {
  const [analysis, setAnalysis]   = useState<DealAnalysis | null>(null);
  const [loading,  setLoading]    = useState(false);
  const [running,  setRunning]    = useState(false);
  const [error,    setError]      = useState('');
  const [open,     setOpen]       = useState(false);

  // Auto-load existing analysis when panel first opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getDealAnalysis(dealId)
      .then(r => { if (!cancelled) { setAnalysis(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealId, open]);

  async function handleAnalyze() {
    setRunning(true);
    setError('');
    try {
      const res = await analyzeDeal(dealId);
      if (res.data) setAnalysis(res.data);
      else setError('Analysis failed. Please try again.');
    } catch {
      setError('Failed to run analysis. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  const risk = analysis ? RISK_CONFIG[analysis.risk_level] : null;

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40">
      {/* Header toggle */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Deal Intelligence</span>
          {analysis && (
            <span className="text-xs text-violet-500 font-normal">
              · Updated {new Date(analysis.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-4 pt-3 space-y-4">
          {loading && (
            <p className="text-xs text-utu-text-muted italic">Loading analysis…</p>
          )}

          {!loading && !analysis && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                No analysis yet. Run AI Deal Intelligence to get health score, win probability, risk assessment, and recommended actions.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Analysing deal…' : 'Analyse with AI'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Score row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Health score */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${scoreBg(analysis.health_score)}`}>
                  <div className={`text-xl font-bold leading-none ${scoreColor(analysis.health_score)}`}>
                    {analysis.health_score}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${scoreColor(analysis.health_score)}`}>Deal Health</p>
                    <p className="text-xs text-utu-text-muted">out of 100</p>
                  </div>
                </div>

                {/* Win probability */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${scoreBg(analysis.win_probability)}`}>
                  <div className={`text-xl font-bold leading-none ${scoreColor(analysis.win_probability)}`}>
                    {analysis.win_probability}%
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${scoreColor(analysis.win_probability)}`}>Win Probability</p>
                    <p className="text-xs text-utu-text-muted">AI estimate</p>
                  </div>
                </div>

                {/* Risk level */}
                {risk && (
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${risk.bg} ${risk.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />
                    {risk.label}
                  </span>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={running}
                  className="ms-auto rounded-lg border border-violet-300 px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Re-analysing…' : 'Re-analyse'}
                </button>
              </div>

              {/* Summary */}
              {analysis.summary && (
                <p className="text-xs text-utu-text-secondary leading-relaxed">{analysis.summary}</p>
              )}

              {/* Strengths + Risks grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {analysis.strengths.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50/60 p-3">
                    <p className="mb-2 text-xs font-semibold text-green-800">Strengths</p>
                    <ul className="space-y-1">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                          <span className="text-xs text-green-800 leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.key_risks.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                    <p className="mb-2 text-xs font-semibold text-red-800">Key Risks</p>
                    <ul className="space-y-1">
                      {analysis.key_risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          <span className="text-xs text-red-800 leading-relaxed">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Stall factors */}
              {analysis.stall_factors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-800">Stall Factors</p>
                  <ul className="flex flex-wrap gap-2">
                    {analysis.stall_factors.map((f, i) => (
                      <li key={i} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800">{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended actions */}
              {analysis.recommended_actions.length > 0 && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-violet-800">Recommended Actions</p>
                  <ol className="space-y-1.5 list-none">
                    {analysis.recommended_actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[10px] font-bold text-violet-700">
                          {i + 1}
                        </span>
                        <span className="text-xs text-violet-900 leading-relaxed">{a}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Competitive notes + time sensitivity */}
              {(analysis.competitive_notes || analysis.time_sensitivity) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {analysis.competitive_notes && (
                    <div className="rounded-lg bg-utu-bg-muted px-3 py-2.5">
                      <p className="mb-1 text-xs font-semibold text-utu-text-secondary">Competitive Context</p>
                      <p className="text-xs text-utu-text-secondary leading-relaxed">{analysis.competitive_notes}</p>
                    </div>
                  )}
                  {analysis.time_sensitivity && (
                    <div className="rounded-lg bg-utu-bg-muted px-3 py-2.5">
                      <p className="mb-1 text-xs font-semibold text-utu-text-secondary">Time Sensitivity</p>
                      <p className="text-xs text-utu-text-secondary leading-relaxed">{analysis.time_sensitivity}</p>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Deal Coach Panel ──────────────────────────────────────────────────────

const MOMENTUM_COLORS: Record<string, string> = {
  accelerating: 'bg-green-100 text-green-700 border-green-200',
  steady:       'bg-blue-50  text-blue-700  border-blue-200',
  stalled:      'bg-amber-100 text-amber-700 border-amber-200',
  declining:    'bg-red-100  text-red-600   border-red-200',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  strong:  'bg-green-100 text-green-700',
  warm:    'bg-amber-50  text-amber-700',
  cold:    'bg-blue-50   text-blue-600',
  at_risk: 'bg-red-100   text-red-600',
};

function AIDealCoachPanel({ dealId }: { dealId: string }) {
  const [coaching, setCoaching] = useState<DealCoaching | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState('');
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getDealCoaching(dealId)
      .then(r => { if (!cancelled) { setCoaching(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealId, open]);

  async function handleCoach() {
    setRunning(true);
    setError('');
    try {
      const res = await coachDeal(dealId);
      if (res.data) setCoaching(res.data);
      else setError('Coaching failed. Please try again.');
    } catch {
      setError('Failed to run coaching. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/40">
      {/* Header toggle */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 text-base">✦</span>
          <span className="text-xs font-semibold text-emerald-800">AI Deal Coach</span>
          {coaching && (
            <span className="text-xs text-emerald-500 font-normal">
              · Updated {new Date(coaching.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <span className="text-xs text-emerald-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-emerald-200 px-4 pb-4 pt-3 space-y-4">
          {loading && (
            <p className="text-xs text-utu-text-muted italic">Loading coaching…</p>
          )}

          {!loading && !coaching && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                No coaching yet. Run AI Deal Coach to get momentum score, win probability, relationship health, next-best actions, and red flags.
              </p>
              <button
                onClick={handleCoach}
                disabled={running}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Coaching…' : '✦ Coach this Deal'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {coaching && !loading && (
            <>
              {/* Momentum + win prob + relationship */}
              <div className="flex flex-wrap items-center gap-3">
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${MOMENTUM_COLORS[coaching.momentum] ?? ''}`}>
                  <div>
                    <p className="text-xs font-semibold capitalize">{coaching.momentum}</p>
                    <p className="text-xs opacity-70">Momentum</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                  <div>
                    <p className="text-sm font-bold text-utu-text-primary">{coaching.win_probability_pct}%</p>
                    <p className="text-xs text-utu-text-muted">Win Probability</p>
                  </div>
                </div>
                <div className={`rounded-lg px-3 py-2 ${RELATIONSHIP_COLORS[coaching.relationship_health] ?? ''}`}>
                  <p className="text-xs font-semibold capitalize">{coaching.relationship_health.replace(/_/g, ' ')}</p>
                  <p className="text-xs opacity-70">Relationship</p>
                </div>
              </div>

              {/* Stage assessment */}
              <div>
                <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-1">Stage Assessment</p>
                <p className="text-xs text-utu-text-secondary leading-relaxed">{coaching.stage_assessment}</p>
              </div>

              {/* Coaching summary */}
              <div>
                <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-1">Coaching Summary</p>
                <p className="text-xs text-utu-text-secondary leading-relaxed">{coaching.coaching_summary}</p>
              </div>

              {/* Next best actions */}
              {coaching.next_best_actions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-2">Next Best Actions</p>
                  <div className="space-y-2">
                    {coaching.next_best_actions.map((a, i) => (
                      <div key={i} className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                        <p className="text-xs font-semibold text-emerald-800">{a.action}</p>
                        <p className="text-xs text-utu-text-muted mt-0.5">{a.owner} · {a.timeline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks + opportunities */}
              <div className="grid grid-cols-2 gap-3">
                {coaching.risks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1">Risks</p>
                    <ul className="space-y-1">
                      {coaching.risks.map((r, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {coaching.opportunities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 mb-1">Opportunities</p>
                    <ul className="space-y-1">
                      {coaching.opportunities.map((o, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary">• {o}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Red flags */}
              {coaching.red_flags.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Red Flags</p>
                  <ul className="space-y-1">
                    {coaching.red_flags.map((f, i) => (
                      <li key={i} className="text-xs text-red-600">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {coaching.competitive_intel_gap && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Competitive Intel Gap</p>
                  <p className="text-xs text-amber-600">{coaching.competitive_intel_gap}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                <p className="text-xs text-utu-text-muted">
                  Generated {new Date(coaching.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <button
                  onClick={handleCoach}
                  disabled={running}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Re-coaching…' : 'Re-coach'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Deal Row (expandable) ────────────────────────────────────────────────────

function DealRow({ deal }: { deal: CrmDeal }) {
  const qc = useQueryClient();
  const [expanded,      setExpanded]      = useState(false);
  const [logActivity,   setLogActivity]   = useState(false);
  const [showProposal,  setShowProposal]  = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', title: '', email: '', phone: '', linkedin_url: '' });

  const { data: actData } = useQuery({
    queryKey: ['crm-activities', deal.id],
    queryFn:  () => getCrmActivities(deal.id),
    enabled:  expanded,
    staleTime: 30_000,
  });

  const advanceMutation = useMutation({
    mutationFn: (stage: DealStage) => updateCrmDeal(deal.id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals'] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => updateCrmDeal(deal.id, { ceo_approved_at: new Date().toISOString(), ceo_approved_by: 'Admin' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCrmDeal(deal.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals'] }),
  });

  const addContactMutation = useMutation({
    mutationFn: () => addCrmContact(deal.id, contactForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      setAddingContact(false);
      setContactForm({ name: '', title: '', email: '', phone: '', linkedin_url: '' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => deleteCrmContact(contactId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals'] }),
  });

  const next = nextStage(deal.stage);
  const activities: CrmActivity[] = actData?.data ?? [];

  return (
    <>
      {logActivity && (
        <LogActivityModal dealId={deal.id} dealTitle={deal.title} onClose={() => setLogActivity(false)} />
      )}
      {showProposal && deal.proposal_file_path && (
        <ProposalDrawer filePath={deal.proposal_file_path} onClose={() => setShowProposal(false)} />
      )}

      {/* Main row */}
      <tr
        className={`cursor-pointer hover:bg-utu-bg-muted ${expanded ? 'bg-utu-bg-muted' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-utu-text-muted">{expanded ? '▼' : '▶'}</span>
            <div>
              <div className="font-medium text-utu-text-primary text-sm">{deal.title}</div>
              <div className="text-xs text-utu-text-muted">{deal.partner_name} {deal.partner_country ? `· ${deal.partner_country}` : ''}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-utu-text-muted">{TYPE_LABELS[deal.deal_type] ?? deal.deal_type}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[deal.stage]}`}>
            {deal.stage}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-utu-text-primary whitespace-nowrap">
          {fmtValue(deal.value_amount, deal.value_currency)}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {deal.ceo_review_required && !deal.ceo_approved_at && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">CEO Review</span>
            )}
            {deal.ceo_approved_at && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">CEO Approved</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-utu-text-muted">{deal.activity_count} acts</td>
        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex gap-1.5">
            {next && (
              <button onClick={() => advanceMutation.mutate(next)} disabled={advanceMutation.isPending}
                className="rounded border border-utu-border-default px-2 py-1 text-xs text-utu-blue hover:bg-utu-bg-subtle disabled:opacity-40">
                → {next}
              </button>
            )}
            <button onClick={() => { setExpanded(true); setLogActivity(true); }}
              className="rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
              Log
            </button>
            <button onClick={() => { if (confirm(`Delete "${deal.title}"?`)) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
              Del
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-utu-bg-muted">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* Notes + next action */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Deal Info</h4>
                {deal.notes && (
                  <p className="text-xs text-utu-text-secondary leading-relaxed">{deal.notes}</p>
                )}
                {deal.next_action && (() => {
                  const isOverdue = deal.next_action_date && new Date(deal.next_action_date) < new Date();
                  return (
                    <div className={`rounded-lg border px-3 py-2 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                      <p className={`text-xs font-medium ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                        Next action{isOverdue ? ' — OVERDUE' : ''}
                      </p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>{deal.next_action}</p>
                      {deal.next_action_date && (
                        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`}>
                          Due: {deal.next_action_date}
                        </p>
                      )}
                    </div>
                  );
                })()}
                {(deal as CrmDeal & { expected_close_date?: string }).expected_close_date && (
                  <p className="text-xs text-utu-text-muted">
                    Close by: <span className="font-medium text-utu-text-secondary">
                      {(deal as CrmDeal & { expected_close_date?: string }).expected_close_date}
                    </span>
                  </p>
                )}
                {deal.ceo_review_required && !deal.ceo_approved_at && (
                  <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
                    className="w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                    {approveMutation.isPending ? 'Approving…' : 'Mark CEO Approved'}
                  </button>
                )}
                {deal.proposal_file_path && (
                  <div>
                    <p className="text-xs text-utu-text-muted font-mono truncate max-w-[220px]">{deal.proposal_file_path}</p>
                    <button
                      onClick={() => setShowProposal(true)}
                      className="mt-1 rounded border border-utu-blue px-2.5 py-1 text-xs text-utu-blue hover:bg-blue-50 transition-colors"
                    >
                      View Proposal
                    </button>
                  </div>
                )}
              </div>

              {/* Contacts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Contacts</h4>
                  <button onClick={() => setAddingContact(a => !a)}
                    className="text-xs text-utu-blue hover:underline">+ Add</button>
                </div>
                {addingContact && (
                  <div className="rounded-lg border border-utu-border-default bg-white p-3 space-y-2">
                    {(['name','title','email','phone'] as const).map(f => (
                      <input key={f} value={contactForm[f]}
                        onChange={e => setContactForm(c => ({ ...c, [f]: e.target.value }))}
                        placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                        className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                    ))}
                    <input value={contactForm.linkedin_url}
                      onChange={e => setContactForm(c => ({ ...c, linkedin_url: e.target.value }))}
                      placeholder="LinkedIn URL"
                      className="w-full rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue" />
                    <div className="flex gap-2">
                      <button onClick={() => addContactMutation.mutate()} disabled={!contactForm.name || addContactMutation.isPending}
                        className="rounded bg-utu-navy px-3 py-1 text-xs font-medium text-white hover:bg-utu-blue disabled:opacity-50">Save</button>
                      <button onClick={() => setAddingContact(false)}
                        className="text-xs text-utu-text-muted hover:underline">Cancel</button>
                    </div>
                  </div>
                )}
                {(deal as CrmDeal & { contacts?: CrmContact[] }).contacts?.map((c) => (
                  <div key={c.id} className="flex items-start justify-between rounded-lg border border-utu-border-default bg-white px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-utu-text-primary">{c.name}</p>
                      {c.title && <p className="text-xs text-utu-text-muted">{c.title}</p>}
                      {c.email && <p className="text-xs text-utu-blue">{c.email}</p>}
                      {c.phone && <p className="text-xs text-utu-text-muted">{c.phone}</p>}
                      {(c as CrmContact & { linkedin_url?: string }).linkedin_url && (
                        <a href={(c as CrmContact & { linkedin_url?: string }).linkedin_url!}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-utu-blue hover:underline">LinkedIn</a>
                      )}
                    </div>
                    <button onClick={() => deleteContactMutation.mutate(c.id)}
                      className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                ))}
                {!(deal as CrmDeal & { contacts?: CrmContact[] }).contacts?.length && !addingContact && (
                  <p className="text-xs text-utu-text-muted italic">No contacts yet.</p>
                )}
              </div>

              {/* Activity feed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Activity</h4>
                  <button onClick={() => setLogActivity(true)}
                    className="text-xs text-utu-blue hover:underline">+ Log</button>
                </div>
                {activities.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex gap-2">
                    <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${ACT_COLORS[a.type]}`}>
                      {a.type.replace(/_/g, ' ')}
                    </span>
                    <div>
                      <p className="text-xs text-utu-text-secondary">{a.summary}</p>
                      <p className="text-xs text-utu-text-muted">{fmtDateTime(a.performed_at)}{a.performed_by ? ` · ${a.performed_by}` : ''}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-xs text-utu-text-muted italic">No activity logged yet.</p>
                )}
              </div>
            </div>

            {/* AI Deal Intelligence — full width below the 3-column grid */}
            <AIDealPanel dealId={deal.id} />
            <AIDealCoachPanel dealId={deal.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Tab: Pipeline ────────────────────────────────────────────────────────────

function PipelineTab() {
  const [stageFilter,   setStageFilter]   = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [ownerFilter,   setOwnerFilter]   = useState('');
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [showAdd,       setShowAdd]       = useState(false);
  const [showOverdue,   setShowOverdue]   = useState(false);

  const { data: statsData } = useQuery({
    queryKey: ['crm-stats'],
    queryFn:  getCrmStats,
    staleTime: 60_000,
  });
  const stats: CrmStats | undefined = statsData?.data;

  const { data: overdueData } = useQuery({
    queryKey: ['crm-overdue'],
    queryFn:  getCrmOverdue,
    enabled:  showOverdue,
    staleTime: 30_000,
  });
  const overdueDeals: OverdueDeal[] = overdueData?.data ?? [];

  const LIMIT = 25;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm-deals', stageFilter, typeFilter, ownerFilter, search, page],
    queryFn:  () => getCrmDeals({
      stage: stageFilter || undefined,
      type:  typeFilter  || undefined,
      deal_owner: ownerFilter || undefined,
      search: search || undefined,
      page,
      limit: LIMIT,
    }),
    staleTime: 30_000,
  });

  const deals: CrmDeal[] = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-5">
      {showAdd && <AddDealModal onClose={() => setShowAdd(false)} />}

      {/* Header + stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-2.5 text-center">
            <p className="text-xs text-utu-text-muted">Active deals</p>
            <p className="text-lg font-bold text-utu-text-primary">{stats?.active_deals ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-2.5 text-center">
            <p className="text-xs text-utu-text-muted">Pipeline (SAR equiv.)</p>
            <p className="text-lg font-bold text-utu-text-primary">
              SAR {stats ? stats.pipeline_sar.toLocaleString() : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
            <p className="text-xs text-amber-600">CEO review pending</p>
            <p className="text-lg font-bold text-amber-700">{stats?.ceo_pending ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-center">
            <p className="text-xs text-green-600">Won this month</p>
            <p className="text-lg font-bold text-green-700">{stats?.won_this_month_count ?? 0}</p>
            {(stats?.won_this_month_sar ?? 0) > 0 && (
              <p className="text-xs text-green-600">SAR {stats!.won_this_month_sar.toLocaleString()}</p>
            )}
          </div>
          {(stats?.overdue_actions ?? 0) > 0 && (
            <button
              onClick={() => setShowOverdue(o => !o)}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-center hover:bg-red-100 transition-colors"
            >
              <p className="text-xs text-red-600">Overdue actions</p>
              <p className="text-lg font-bold text-red-700">{stats!.overdue_actions}</p>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/crm/deals/export.csv" download
            className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted transition-colors">
            Export CSV
          </a>
          <button onClick={() => setShowAdd(true)}
            className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue transition-colors">
            + New Deal
          </button>
        </div>
      </div>

      {/* Overdue panel */}
      {showOverdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-red-700">Overdue Actions</h3>
          {overdueDeals.length === 0 && <p className="text-xs text-red-500">Loading…</p>}
          {overdueDeals.map(od => (
            <div key={od.id} className="rounded-lg border border-red-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-utu-text-primary">{od.title}</p>
                  <p className="text-xs text-utu-text-muted">{od.partner_name} · {od.stage}</p>
                  {od.next_action && <p className="text-xs text-utu-text-secondary mt-1">{od.next_action}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {od.days_overdue}d overdue
                  </span>
                  <p className="text-xs text-utu-text-muted mt-1">Due {od.next_action_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search deals…"
          className="w-44 rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All stages</option>
          {STAGE_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={ownerFilter} onChange={e => { setOwnerFilter(e.target.value); setPage(1); }} placeholder="Owner…"
          className="w-32 rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <span className="self-center text-sm text-utu-text-muted">{data?.total ?? 0} deals</span>
      </div>

      {isLoading && <div className="py-10 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-10 text-center text-sm text-red-500">Failed to load deals.</div>}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Deal / Partner', 'Type', 'Stage', 'Value', 'Flags', 'Activity', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {deals.map(deal => <DealRow key={deal.id} deal={deal} />)}
              {deals.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-utu-text-muted">No deals found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-utu-text-muted">
            Page {page} of {totalPages} · {data?.total ?? 0} deals
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HP Activity Log Panel ────────────────────────────────────────────────────

const HP_ACT_COLORS: Record<HpActivityType, string> = {
  call:       'bg-blue-50 text-blue-700',
  email:      'bg-indigo-50 text-indigo-700',
  meeting:    'bg-amber-50 text-amber-700',
  follow_up:  'bg-teal-50 text-teal-700',
  note:       'bg-gray-100 text-gray-600',
  signed:     'bg-green-100 text-green-800',
  rejected:   'bg-red-50 text-red-500',
};

function HpActivityPanel({ partner }: { partner: HotelPartner }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: 'note' as HpActivityType, summary: '', performed_by: '' });
  const [err, setErr]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hp-activities', partner.id],
    queryFn:  () => getHpActivities(partner.id),
    staleTime: 30_000,
  });
  const activities: HpActivity[] = data?.data ?? [];

  const logMutation = useMutation({
    mutationFn: () => logHpActivity(partner.id, {
      type: form.type, summary: form.summary,
      performed_by: form.performed_by || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hp-activities', partner.id] });
      qc.invalidateQueries({ queryKey: ['crm-hotel-partners'] });
      setForm({ type: 'note', summary: '', performed_by: '' });
      setErr('');
    },
    onError: () => setErr('Failed to log activity.'),
  });

  return (
    <div className="mt-3 border-t border-[#E5E7EB] pt-3 space-y-3">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Activity Log</h5>

      {/* Log form */}
      <div className="rounded-lg border border-utu-border-default bg-utu-bg-muted p-3 space-y-2">
        <div className="flex gap-2">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as HpActivityType }))}
            className="rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue"
          >
            {(['call','email','meeting','follow_up','note','signed','rejected'] as HpActivityType[]).map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            value={form.performed_by}
            onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))}
            placeholder="By (optional)"
            className="w-28 rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue"
          />
        </div>
        <div className="flex gap-2">
          <input
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            placeholder="What happened? (required)"
            className="flex-1 rounded border border-utu-border-default px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue"
          />
          <button
            onClick={() => { if (!form.summary.trim()) { setErr('Summary required'); return; } logMutation.mutate(); }}
            disabled={logMutation.isPending}
            className="rounded bg-utu-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-utu-blue disabled:opacity-50"
          >
            {logMutation.isPending ? '…' : 'Log'}
          </button>
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>

      {/* History */}
      {isLoading && <p className="text-xs text-utu-text-muted">Loading…</p>}
      {activities.length === 0 && !isLoading && (
        <p className="text-xs text-utu-text-muted italic">No activity logged yet.</p>
      )}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {activities.map(a => (
          <div key={a.id} className="flex gap-2">
            <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${HP_ACT_COLORS[a.type]}`}>
              {a.type.replace(/_/g, ' ')}
            </span>
            <div>
              <p className="text-xs text-utu-text-secondary">{a.summary}</p>
              <p className="text-xs text-utu-text-muted">
                {fmtDateTime(a.performed_at)}{a.performed_by ? ` · ${a.performed_by}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hotel Partner Row (expandable) ──────────────────────────────────────────

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-red-50 text-red-700',
  2: 'bg-orange-50 text-orange-700',
  3: 'bg-gray-100 text-gray-500',
};

function HotelPartnerRow({
  p, onAdvance, onDelete, advancing, deleting,
}: {
  p: HotelPartner & { priority?: number; last_contacted_at?: string | null };
  onAdvance: (id: string, status: HotelPartnerStatus) => void;
  onDelete:  (id: string) => void;
  advancing: boolean;
  deleting:  boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextStatus = HP_NEXT[p.outreach_status];
  const priority   = p.priority ?? 3;

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-utu-bg-muted ${expanded ? 'bg-utu-bg-muted' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-utu-text-muted">{expanded ? '▼' : '▶'}</span>
            <div>
              <div className="font-medium text-utu-text-primary text-sm">{p.hotel_name}</div>
              {p.notes && <div className="text-xs text-utu-text-muted truncate max-w-[180px]">{p.notes}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-utu-text-secondary">{p.city ?? '—'} {p.country ? `· ${p.country}` : ''}</td>
        <td className="px-4 py-3 text-xs text-utu-text-secondary">
          {p.distance_haram_m != null ? `${p.distance_haram_m}m` : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-utu-text-muted">{p.stars ? '★'.repeat(p.stars) : '—'}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[3]}`}>
            P{priority}
          </span>
        </td>
        <td className="px-4 py-3">
          {p.contact_name && <div className="text-xs text-utu-text-primary">{p.contact_name}</div>}
          {p.contact_email && <div className="text-xs text-utu-blue">{p.contact_email}</div>}
          {!p.contact_name && <span className="text-xs text-utu-text-muted">—</span>}
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${HP_STATUS_COLORS[p.outreach_status]}`}>
            {p.outreach_status.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
          {p.last_contacted_at ? fmtDate(p.last_contacted_at) : '—'}
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex gap-1.5">
            {nextStatus && (
              <button onClick={() => onAdvance(p.id, nextStatus)}
                disabled={advancing}
                className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-blue hover:bg-utu-bg-subtle disabled:opacity-40">
                → {nextStatus.replace(/_/g, ' ')}
              </button>
            )}
            <button
              onClick={() => { if (confirm(`Remove "${p.hotel_name}"?`)) onDelete(p.id); }}
              disabled={deleting}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              Del
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-utu-bg-muted">
          <td colSpan={9} className="px-6 pb-4">
            <HpActivityPanel partner={p} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Tab: Hotel Partners ──────────────────────────────────────────────────────

const HP_STATUS_ORDER: HotelPartnerStatus[] = ['not_contacted','emailed','replied','meeting_scheduled','signed','live','rejected'];

function HotelPartnersTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [showForm,     setShowForm]     = useState(false);
  const [form, setForm] = useState({
    hotel_name: '', city: '', country: '', distance_haram_m: '', stars: '',
    contact_name: '', contact_email: '', notes: '',
  });
  const [msg, setMsg] = useState('');

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 3000); }

  const HP_LIMIT = 25;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm-hotel-partners', statusFilter, search, page],
    queryFn:  () => getHotelPartners({ status: statusFilter || undefined, search: search || undefined, page, limit: HP_LIMIT }),
    staleTime: 30_000,
  });
  const totalPages = data ? Math.ceil(data.total / HP_LIMIT) : 1;

  const createMutation = useMutation({
    mutationFn: () => createHotelPartner({
      ...form,
      distance_haram_m: form.distance_haram_m ? parseInt(form.distance_haram_m) : undefined,
      stars: form.stars ? parseInt(form.stars) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-hotel-partners'] });
      setShowForm(false);
      setForm({ hotel_name:'',city:'',country:'',distance_haram_m:'',stars:'',contact_name:'',contact_email:'',notes:'' });
      flash('Hotel partner added.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HotelPartnerStatus }) =>
      updateHotelPartner(id, { outreach_status: status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-hotel-partners'] }); flash('Status updated.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHotelPartner(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-hotel-partners'] }); flash('Hotel partner removed.'); },
  });

  const partners: HotelPartner[] = data?.data ?? [];

  // Stats
  const statusCounts = HP_STATUS_ORDER.reduce((acc, s) => {
    acc[s] = partners.filter(p => p.outreach_status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      {msg && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{msg}</div>}

      {/* Status summary */}
      <div className="flex flex-wrap gap-2">
        {HP_STATUS_ORDER.map(s => (
          <button key={s} onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? 'border-utu-navy bg-utu-navy text-white' : 'border-utu-border-default bg-utu-bg-card text-utu-text-secondary hover:bg-utu-bg-muted'
            }`}>
            {s.replace(/_/g, ' ')} {(data?.total ?? 0) > 0 ? `(${statusCounts[s] ?? 0})` : ''}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search hotels…"
          className="w-52 rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <div className="flex gap-2">
          <a href="/api/admin/crm/hotel-partners/export.csv" download
            className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted transition-colors">
            Export CSV
          </a>
          <button onClick={() => setShowForm(s => !s)}
            className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue transition-colors">
            + Add Hotel
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-utu-text-primary text-sm">New Hotel Partner</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { key: 'hotel_name', label: 'Hotel name *', placeholder: 'e.g. Raffles Makkah' },
              { key: 'city',       label: 'City',         placeholder: 'Makkah' },
              { key: 'country',    label: 'Country',      placeholder: 'SA' },
              { key: 'distance_haram_m', label: 'Distance to Haram (m)', placeholder: '200' },
              { key: 'stars',      label: 'Stars',        placeholder: '5' },
              { key: 'contact_name',  label: 'Contact name',  placeholder: 'GM name' },
              { key: 'contact_email', label: 'Contact email', placeholder: 'gm@hotel.com' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className={key === 'hotel_name' ? 'col-span-2 sm:col-span-1' : ''}>
                <label className="block text-xs font-medium text-utu-text-secondary mb-1">{label}</label>
                <input value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key info about this hotel / contact..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!form.hotel_name || createMutation.isPending}
              className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue disabled:opacity-50">
              {createMutation.isPending ? 'Saving…' : 'Add Hotel'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && <div className="py-10 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-10 text-center text-sm text-red-500">Failed to load hotel partners.</div>}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Hotel', 'Location', 'Distance', 'Stars', 'Priority', 'Contact', 'Status', 'Last Contacted', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {partners.map(p => (
                <HotelPartnerRow
                  key={p.id}
                  p={p as HotelPartner & { priority?: number; last_contacted_at?: string | null }}
                  onAdvance={(id, status) => updateMutation.mutate({ id, status })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  advancing={updateMutation.isPending}
                  deleting={deleteMutation.isPending}
                />
              ))}
              {partners.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-utu-text-muted">No hotel partners yet. Add your first one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && totalPages <= 1 && (
        <p className="text-sm text-utu-text-muted">{data.total} total hotel partners</p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-utu-text-muted">
            Page {page} of {totalPages} · {data?.total ?? 0} hotel partners
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Funnel ─────────────────────────────────────────────────────────────

function FunnelTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm-funnel'],
    queryFn:  getCrmFunnel,
    staleTime: 60_000,
  });

  const funnel = data?.data;
  const PIPELINE_STAGES = ['lead','qualified','demo','proposal','negotiation'];
  const STAGE_BG: Record<string, string> = {
    lead:'bg-gray-200', qualified:'bg-blue-200', demo:'bg-indigo-200',
    proposal:'bg-amber-200', negotiation:'bg-orange-200',
  };
  const maxCount = funnel ? Math.max(...funnel.stages.map(s => s.count), 1) : 1;

  if (isLoading) return <div className="py-12 text-center text-sm text-utu-text-muted">Loading funnel…</div>;
  if (isError || !funnel) return <div className="py-12 text-center text-sm text-red-500">Failed to load funnel data.</div>;

  return (
    <div className="space-y-6">
      {/* Win rate headline */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <p className="text-xs text-utu-text-muted">Win Rate</p>
          <p className="mt-1 text-3xl font-bold text-green-700">
            {funnel.win_rate_pct != null ? `${funnel.win_rate_pct}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-utu-text-muted">{funnel.won_count} won / {funnel.lost_count} lost</p>
        </div>
        <div className="col-span-2 rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-utu-text-secondary mb-3">Stage-to-stage conversion rates</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(funnel.conversion_rates).map(([key, pct]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-utu-text-muted capitalize">{key.replace(/_to_/g, ' to ').replace(/_/g, ' ')}</span>
                <span className={`font-semibold ${pct == null ? 'text-utu-text-muted' : pct >= 50 ? 'text-green-700' : 'text-amber-700'}`}>
                  {pct != null ? `${pct}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual funnel bars */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6 shadow-sm">
        <h3 className="mb-5 text-sm font-semibold text-utu-text-primary">Pipeline Funnel</h3>
        <div className="space-y-3">
          {funnel.stages.filter(s => PIPELINE_STAGES.includes(s.stage)).map(s => (
            <div key={s.stage} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-right text-xs capitalize text-utu-text-secondary">{s.stage}</span>
              <div className="flex-1 rounded-full bg-utu-bg-muted h-7 overflow-hidden">
                <div
                  className={`h-full rounded-full flex items-center ps-3 text-xs font-semibold text-utu-navy transition-all ${STAGE_BG[s.stage] ?? 'bg-gray-200'}`}
                  style={{ width: `${Math.max((s.count / maxCount) * 100, 4)}%` }}
                >
                  {s.count}
                </div>
              </div>
              <span className="w-20 shrink-0 text-xs text-utu-text-muted">
                {s.avg_days != null ? `avg ${s.avg_days}d` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stage stats table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
          <thead className="bg-utu-bg-muted">
            <tr>
              {['Stage','Current Deals','Avg Days','Min Days','Max Days','Total Entries'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {funnel.stages.map(s => (
              <tr key={s.stage} className="hover:bg-utu-bg-muted/40">
                <td className="px-4 py-3 text-xs font-medium capitalize text-utu-text-primary">{s.stage}</td>
                <td className="px-4 py-3 text-xs text-utu-text-secondary">{s.count}</td>
                <td className="px-4 py-3 text-xs text-utu-text-secondary">{s.avg_days ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-utu-text-secondary">{s.min_days ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-utu-text-secondary">{s.max_days ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-utu-text-muted">{s.entries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Reps ────────────────────────────────────────────────────────────────

function RepsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', region: '' });
  const [quotaRep, setQuotaRep] = useState<string | null>(null);
  const [quotaForm, setQuotaForm] = useState({ year: new Date().getFullYear(), quarter: 1, target_sar: '' });
  const [msg, setMsg] = useState('');

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 3000); }

  const { data, isLoading } = useQuery({
    queryKey: ['sales-reps'],
    queryFn:  getSalesReps,
    staleTime: 30_000,
  });
  const reps: SalesRep[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => createSalesRep(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-reps'] }); setShowForm(false); setForm({ name:'', email:'', region:'' }); flash('Rep added.'); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateSalesRep(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-reps'] }); flash('Rep updated.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalesRep(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-reps'] }); flash('Rep removed.'); },
  });

  const quotaMutation = useMutation({
    mutationFn: (repId: string) => assignRepQuota(repId, { ...quotaForm, target_sar: parseFloat(quotaForm.target_sar) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-reps'] }); setQuotaRep(null); setQuotaForm({ year: new Date().getFullYear(), quarter: 1, target_sar: '' }); flash('Quota saved.'); },
  });

  if (isLoading) return <div className="py-12 text-center text-sm text-utu-text-muted">Loading reps…</div>;

  return (
    <div className="space-y-5">
      {msg && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{msg}</div>}

      <div className="flex justify-end">
        <button onClick={() => setShowForm(s => !s)}
          className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue transition-colors">
          + Add Rep
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-utu-text-primary">New Sales Rep</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'name',   label: 'Full name *',   placeholder: 'Ahmed Al-Rashid' },
              { key: 'email',  label: 'Email',          placeholder: 'ahmed@example.com' },
              { key: 'region', label: 'Region',         placeholder: 'Saudi Arabia / Gulf' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-utu-text-secondary mb-1">{label}</label>
                <input value={(form as Record<string,string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}
              className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue disabled:opacity-50">
              {createMutation.isPending ? 'Saving…' : 'Add Rep'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quota assignment modal */}
      {quotaRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="font-semibold text-utu-text-primary text-sm">Assign Quota</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-utu-text-secondary mb-1">Year</label>
                  <input type="number" value={quotaForm.year} onChange={e => setQuotaForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                    className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-utu-text-secondary mb-1">Quarter</label>
                  <select value={quotaForm.quarter} onChange={e => setQuotaForm(f => ({ ...f, quarter: parseInt(e.target.value) }))}
                    className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
                    {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-utu-text-secondary mb-1">Target (SAR)</label>
                  <input type="number" value={quotaForm.target_sar} onChange={e => setQuotaForm(f => ({ ...f, target_sar: e.target.value }))}
                    placeholder="e.g. 500000"
                    className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-6 py-4">
              <button onClick={() => setQuotaRep(null)} className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">Cancel</button>
              <button onClick={() => quotaMutation.mutate(quotaRep)} disabled={!quotaForm.target_sar || quotaMutation.isPending}
                className="rounded-lg bg-utu-navy px-4 py-2 text-sm font-semibold text-white hover:bg-utu-blue disabled:opacity-50">
                {quotaMutation.isPending ? 'Saving…' : 'Save Quota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reps.length === 0 && (
        <div className="rounded-xl border border-dashed border-utu-border-default p-10 text-center text-sm text-utu-text-muted">
          No sales reps yet. Add one to start tracking quotas and attainment.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reps.map(rep => (
          <div key={rep.id} className={`rounded-xl border bg-utu-bg-card p-5 shadow-sm ${rep.is_active ? 'border-utu-border-default' : 'border-dashed border-gray-300 opacity-60'}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-utu-text-primary text-sm">{rep.name}</p>
                {rep.region && <p className="text-xs text-utu-text-muted mt-0.5">{rep.region}</p>}
                {rep.email  && <p className="text-xs text-utu-text-muted">{rep.email}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${rep.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {rep.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Quotas */}
            {rep.quotas.length > 0 && (
              <div className="space-y-1 mb-3">
                {rep.quotas.slice(-4).map(q => (
                  <div key={q.id} className="flex items-center justify-between text-xs">
                    <span className="text-utu-text-muted">{q.year} Q{q.quarter}</span>
                    <span className="font-medium text-utu-text-primary">SAR {q.target_sar.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {rep.quotas.length === 0 && (
              <p className="text-xs text-utu-text-muted mb-3">No quotas assigned yet.</p>
            )}

            <div className="flex gap-2 border-t border-[#E5E7EB] pt-3">
              <button onClick={() => setQuotaRep(rep.id)}
                className="flex-1 rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                Set Quota
              </button>
              <button onClick={() => toggleMutation.mutate({ id: rep.id, is_active: !rep.is_active })}
                className="flex-1 rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                {rep.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button onClick={() => { if (confirm(`Remove ${rep.name}?`)) deleteMutation.mutate(rep.id); }}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Contacts ────────────────────────────────────────────────────────────

function ContactsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const LIMIT = 50;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm-contacts', search, page],
    queryFn:  () => getContacts({ search: search || undefined, page, limit: LIMIT }),
    staleTime: 30_000,
  });

  const contacts: CrmContactWithDeal[] = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, or phone…"
          className="w-72 rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        {data && <p className="text-sm text-utu-text-muted">{data.total} contacts</p>}
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-12 text-center text-sm text-red-500">Failed to load contacts.</div>}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Name','Title','Email','Phone','Deal','Stage'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-utu-bg-muted/40">
                  <td className="px-4 py-3 text-xs font-medium text-utu-text-primary whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary whitespace-nowrap">{c.title ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary whitespace-nowrap">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary max-w-[180px] truncate">{c.deal_title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STAGE_COLORS[c.deal_stage as DealStage] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.deal_stage}
                    </span>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-utu-text-muted">
                  {search ? 'No contacts match your search.' : 'No contacts yet. Add contacts to deals to see them here.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-utu-text-muted">Page {page} of {totalPages} · {data?.total ?? 0} contacts</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Deal Pipeline', 'Hotel Partners', 'Funnel', 'Reps', 'Contacts'] as const;
type Tab = typeof TABS[number];

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Deal Pipeline');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Sales & CRM</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Deal pipeline, contact tracking, activity log, hotel partners, funnel analytics, and rep quotas.
        </p>
      </div>

      <div className="flex gap-1 border-b border-utu-border-default overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Deal Pipeline'  && <PipelineTab />}
      {activeTab === 'Hotel Partners' && <HotelPartnersTab />}
      {activeTab === 'Funnel'         && <FunnelTab />}
      {activeTab === 'Reps'           && <RepsTab />}
      {activeTab === 'Contacts'       && <ContactsTab />}
    </div>
  );
}
