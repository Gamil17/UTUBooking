'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdStats {
  total:               string;
  new_count:           string;
  contacted_count:     string;
  qualified_count:     string;
  proposal_sent_count: string;
  won_count:           string;
  lost_count:          string;
  last_30_days:        string;
  last_7_days:         string;
}

interface AdEnquiry {
  id:           string;
  full_name:    string;
  company_name: string;
  work_email:   string;
  phone:        string | null;
  company_type: string;
  region:       string;
  goal:         string;
  budget_range: string;
  message:      string | null;
  consent:      boolean;
  status:       AdEnquiryStatus;
  assigned_to:  string | null;
  admin_notes:  string | null;
  created_at:   string;
  updated_at:   string;
}

type AdEnquiryStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost' | 'archived';

// ─── API helpers ───────────────────────────────────────────────────────────────

async function fetchStats(): Promise<AdStats> {
  const r = await fetch('/api/admin/advertising?view=stats');
  if (!r.ok) throw new Error('Failed to fetch stats');
  return r.json();
}

async function fetchEnquiries(params: Record<string, string> = {}): Promise<{ enquiries: AdEnquiry[]; total: number }> {
  const qs = new URLSearchParams({ view: 'enquiries', ...params }).toString();
  const r  = await fetch(`/api/admin/advertising?${qs}`);
  if (!r.ok) throw new Error('Failed to fetch enquiries');
  return r.json();
}

async function patchEnquiry(id: string, body: Partial<Pick<AdEnquiry, 'status' | 'assigned_to' | 'admin_notes'>>): Promise<AdEnquiry> {
  const r = await fetch(`/api/admin/advertising/enquiries/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Failed to update enquiry');
  return r.json();
}

// ─── Labels ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AdEnquiryStatus, string> = {
  new:           'bg-amber-100  text-amber-700',
  contacted:     'bg-blue-100   text-blue-700',
  qualified:     'bg-violet-100 text-violet-700',
  proposal_sent: 'bg-indigo-100 text-indigo-700',
  won:           'bg-green-100  text-green-700',
  lost:          'bg-red-100    text-red-600',
  archived:      'bg-gray-100   text-gray-500',
};

const STATUS_LABELS: Record<AdEnquiryStatus, string> = {
  new:           'New',
  contacted:     'Contacted',
  qualified:     'Qualified',
  proposal_sent: 'Proposal Sent',
  won:           'Won',
  lost:          'Lost',
  archived:      'Archived',
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  tourism_board:      'Tourism Board',
  airline:            'Airline',
  hotel:              'Hotel',
  ota:                'OTA',
  attractions:        'Attractions',
  car_rental:         'Car Rental',
  travel_tech:        'Travel Tech',
  consumer_brands:    'Consumer Brands',
  financial_payments: 'Financial / Payments',
  halal_brands:       'Halal Brands',
  other:              'Other',
};

const REGION_LABELS: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia',
  uae:          'UAE',
  gulf_gcc:     'Gulf / GCC',
  mena:         'MENA',
  muslim_world: 'Muslim World',
  se_asia:      'SE Asia',
  s_asia:       'South Asia',
  global:       'Global',
};

const GOAL_LABELS: Record<string, string> = {
  performance_marketing: 'Performance Marketing',
  brand_awareness:       'Brand Awareness',
  lead_generation:       'Lead Generation',
  app_growth:            'App Growth',
  retargeting:           'Retargeting',
  product_launch:        'Product Launch',
  market_entry:          'Market Entry',
};

const BUDGET_LABELS: Record<string, string> = {
  under_10k:    '< SAR 10K',
  '10k_50k':    'SAR 10–50K',
  '50k_200k':   'SAR 50–200K',
  over_200k:    'SAR 200K+',
  lets_discuss: "Let's discuss",
};

const ALL_STATUSES: AdEnquiryStatus[] = [
  'new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'archived',
];

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: 'green' | 'amber' | 'blue' | 'violet' }) {
  const colors = {
    green:  'border-green-200  bg-green-50',
    amber:  'border-amber-200  bg-amber-50',
    blue:   'border-blue-200   bg-blue-50',
    violet: 'border-violet-200 bg-violet-50',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? colors[accent] : 'border-utu-border-default bg-utu-bg-card'}`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="text-2xl font-extrabold text-utu-text-primary mt-1">{value}</p>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function EnquiryPanel({ enq, onClose }: { enq: AdEnquiry; onClose: () => void }) {
  const qc = useQueryClient();
  const [status,      setStatus]      = useState<AdEnquiryStatus>(enq.status);
  const [assignedTo,  setAssignedTo]  = useState(enq.assigned_to ?? '');
  const [adminNotes,  setAdminNotes]  = useState(enq.admin_notes ?? '');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const mutation = useMutation({
    mutationFn: () => patchEnquiry(enq.id, {
      status:      status,
      assigned_to: assignedTo || null,
      admin_notes: adminNotes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-enquiries'] });
      qc.invalidateQueries({ queryKey: ['ad-stats'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const inputCls = 'w-full rounded-xl border border-utu-border-default bg-utu-bg-page px-3 py-2 text-sm focus:border-utu-blue focus:outline-none focus:ring-2 focus:ring-utu-blue/20';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-utu-border-default bg-white px-6 py-4">
          <div>
            <h2 className="font-bold text-utu-text-primary">{enq.company_name}</h2>
            <p className="text-xs text-utu-text-muted">{enq.full_name} · {enq.work_email}</p>
          </div>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-xl leading-none" aria-label="Close">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Metadata */}
          <div className="bg-utu-bg-muted rounded-xl border border-utu-border-default p-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Company Type', COMPANY_TYPE_LABELS[enq.company_type] ?? enq.company_type],
              ['Region',       REGION_LABELS[enq.region]             ?? enq.region],
              ['Goal',         GOAL_LABELS[enq.goal]                 ?? enq.goal],
              ['Budget',       BUDGET_LABELS[enq.budget_range]       ?? enq.budget_range],
              ['Phone',        enq.phone                             ?? '—'],
              ['Received',     fmtDate(enq.created_at)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-utu-text-muted">{k}</p>
                <p className="font-semibold text-utu-text-primary mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Message */}
          {enq.message && (
            <div>
              <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-1">Message</p>
              <p className="text-sm text-utu-text-secondary leading-relaxed whitespace-pre-wrap">{enq.message}</p>
            </div>
          )}

          <hr className="border-utu-border-default" />

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-2" htmlFor="panel-status">Status</label>
            <div className="relative">
              <select
                id="panel-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AdEnquiryStatus)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-utu-text-muted" aria-hidden="true">▾</span>
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-2" htmlFor="panel-assigned">Assigned To</label>
            <input
              id="panel-assigned"
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Team member name or email"
              className={inputCls}
            />
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-2" htmlFor="panel-notes">Admin Notes</label>
            <textarea
              id="panel-notes"
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this enquiry..."
              className={inputCls}
            />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full bg-utu-navy hover:bg-utu-blue text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {mutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAdvertisingPage() {
  const qc = useQueryClient();

  const [filterStatus,      setFilterStatus]      = useState('');
  const [filterCompanyType, setFilterCompanyType] = useState('');
  const [filterRegion,      setFilterRegion]      = useState('');
  const [search,            setSearch]            = useState('');
  const [selected,          setSelected]          = useState<AdEnquiry | null>(null);

  const { data: stats } = useQuery<AdStats>({
    queryKey: ['ad-stats'],
    queryFn:  fetchStats,
  });

  const filterParams: Record<string, string> = {};
  if (filterStatus)      filterParams.status       = filterStatus;
  if (filterCompanyType) filterParams.company_type = filterCompanyType;
  if (filterRegion)      filterParams.region        = filterRegion;
  if (search)            filterParams.search        = search;

  const { data: enquiriesData, isLoading } = useQuery({
    queryKey: ['ad-enquiries', filterParams],
    queryFn:  () => fetchEnquiries(filterParams),
  });

  const enquiries = enquiriesData?.enquiries ?? [];
  const total     = enquiriesData?.total     ?? 0;

  const selectCls = 'rounded-xl border border-utu-border-default bg-white px-3 py-2 text-sm focus:border-utu-blue focus:outline-none text-utu-text-secondary appearance-none cursor-pointer';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-utu-text-primary">Advertising</h1>
        <p className="text-sm text-utu-text-muted mt-1">Manage advertising enquiries from brands and partners.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Enquiries"  value={stats?.total         ?? '—'} />
        <KpiCard label="New"              value={stats?.new_count     ?? '—'} accent="amber" />
        <KpiCard label="Qualified"        value={stats?.qualified_count ?? '—'} accent="violet" />
        <KpiCard label="Won"              value={stats?.won_count     ?? '—'} accent="green" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard label="Last 7 Days"  value={stats?.last_7_days    ?? '—'} accent="blue" />
        <KpiCard label="Last 30 Days" value={stats?.last_30_days   ?? '—'} />
        <KpiCard label="Proposals Sent" value={stats?.proposal_sent_count ?? '—'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-utu-border-default rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company, email…"
          className="rounded-xl border border-utu-border-default px-3 py-2 text-sm w-56 focus:border-utu-blue focus:outline-none"
        />
        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-utu-text-muted text-xs" aria-hidden="true">▾</span>
        </div>
        <div className="relative">
          <select value={filterCompanyType} onChange={(e) => setFilterCompanyType(e.target.value)} className={selectCls}>
            <option value="">All Types</option>
            {Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-utu-text-muted text-xs" aria-hidden="true">▾</span>
        </div>
        <div className="relative">
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className={selectCls}>
            <option value="">All Regions</option>
            {Object.entries(REGION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-utu-text-muted text-xs" aria-hidden="true">▾</span>
        </div>
        <button
          onClick={() => { setSearch(''); setFilterStatus(''); setFilterCompanyType(''); setFilterRegion(''); }}
          className="text-sm text-utu-text-muted hover:text-utu-text-primary transition-colors"
        >
          Clear
        </button>
        <span className="ms-auto text-xs text-utu-text-muted self-center">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-utu-border-default rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-utu-text-muted text-sm">Loading…</div>
        ) : enquiries.length === 0 ? (
          <div className="py-12 text-center text-utu-text-muted text-sm">No enquiries found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-muted text-xs text-utu-text-muted uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">Company</th>
                <th className="px-4 py-3 text-start font-semibold hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-start font-semibold hidden md:table-cell">Goal</th>
                <th className="px-4 py-3 text-start font-semibold hidden lg:table-cell">Budget</th>
                <th className="px-4 py-3 text-start font-semibold">Status</th>
                <th className="px-4 py-3 text-start font-semibold hidden lg:table-cell">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {enquiries.map((enq) => (
                <tr key={enq.id} className="hover:bg-utu-bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-utu-text-primary">{enq.company_name}</p>
                    <p className="text-xs text-utu-text-muted">{enq.full_name}</p>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary hidden sm:table-cell">
                    {COMPANY_TYPE_LABELS[enq.company_type] ?? enq.company_type}
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary hidden md:table-cell">
                    {GOAL_LABELS[enq.goal] ?? enq.goal}
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary hidden lg:table-cell">
                    {BUDGET_LABELS[enq.budget_range] ?? enq.budget_range}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={STATUS_LABELS[enq.status]} color={STATUS_COLORS[enq.status]} />
                  </td>
                  <td className="px-4 py-3 text-utu-text-muted hidden lg:table-cell">{fmtDate(enq.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(enq)}
                      className="text-utu-blue hover:underline text-xs font-semibold"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <EnquiryPanel enq={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
