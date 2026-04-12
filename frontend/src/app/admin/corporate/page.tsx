'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCorporateStats, getCorporateAccounts, createCorporateAccount, updateCorporateAccount, deleteCorporateAccount,
  activateCorporateAccount,
  getCorporateContacts, createCorporateContact, deleteCorporateContact,
  getCorporateEnquiries, updateCorporateEnquiry, approveCorporateEnquiry, rejectCorporateEnquiry,
  getAdminCorporateBookings, confirmCorporateBooking, rejectCorporateBooking,
  getAdminCorporateEmployees, updateAdminCorporateEmployee,
  getAdminTripGroups,
  type CorporateStats, type CorporateAccount, type CorporateContact, type CorporateEnquiry,
  type CorporateBookingAdmin, type CorpBookingStatus,
  type CorporateTier, type CorporateStatus, type CorporateIndustry, type FlightClass, type EnquiryStatus,
  type CorporateEmployee, type EmployeeStatus, type AdminTripGroup, type TripGroupStatus,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sarFmt(n: number) { return `SAR ${Math.round(n).toLocaleString()}`; }
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TIER_COLORS: Record<CorporateTier, string> = {
  enterprise: 'bg-purple-100 text-purple-700',
  premium:    'bg-blue-100   text-blue-700',
  standard:   'bg-gray-100   text-gray-600',
};

const STATUS_COLORS: Record<CorporateStatus, string> = {
  prospect: 'bg-gray-100   text-gray-600',
  active:   'bg-green-100  text-green-700',
  paused:   'bg-orange-100 text-orange-700',
  churned:  'bg-red-100    text-red-600',
};

const ENQUIRY_STATUS_COLORS: Record<EnquiryStatus, string> = {
  new:       'bg-amber-100  text-amber-700',
  contacted: 'bg-blue-100   text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  converted: 'bg-green-100  text-green-700',
  lost:      'bg-red-100    text-red-600',
};

type Tab = 'overview' | 'accounts' | 'enquiries' | 'bookings' | 'employees' | 'groups';

// ─── Shared UI ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colors = {
    green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50',
    red:   'border-red-200   bg-red-50',   blue:  'border-blue-200  bg-blue-50',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? colors[accent] : 'border-utu-border-default bg-utu-bg-card'}`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

function Badge({ label, colorCls }: { label: string; colorCls: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorCls}`}>{label}</span>;
}

function SlidePanel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">{title}</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-utu-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls   = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const selectCls  = 'w-full rounded-lg border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue';
const btnPrimary = 'rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors disabled:opacity-50';
const btnGhost   = 'rounded-lg border border-utu-border-default px-3 py-1.5 text-sm text-utu-text-muted hover:bg-gray-50';

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['corporate-stats'], queryFn: getCorporateStats, staleTime: 60_000 });
  const stats: CorporateStats | undefined = (data as any)?.data;

  if (isLoading) return <div className="py-20 text-center text-sm text-utu-text-muted">Loading...</div>;
  if (!stats)    return <div className="py-20 text-center text-sm text-utu-text-muted">No data available.</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Active Accounts"  value={String(stats.accounts.active)}  accent="green" />
        <KpiCard label="Prospects"        value={String(stats.accounts.prospect)} accent="amber" />
        <KpiCard label="Total Spend"      value={sarFmt(stats.accounts.total_spend_sar)} />
        <KpiCard label="New Applications"  value={String(stats.enquiries.new)} accent={stats.enquiries.new > 0 ? 'blue' : undefined}
          sub={`${stats.enquiries.total} total`} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Accounts by tier */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="text-sm font-semibold text-utu-text-primary mb-4">Accounts by Tier</h3>
          <div className="space-y-3">
            {(['enterprise','premium','standard'] as CorporateTier[]).map(t => (
              <div key={t} className="flex items-center justify-between">
                <Badge label={t.charAt(0).toUpperCase()+t.slice(1)} colorCls={TIER_COLORS[t]} />
                <span className="text-sm font-semibold text-utu-text-primary">{stats.accounts.by_tier[t]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enquiry pipeline */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5">
          <h3 className="text-sm font-semibold text-utu-text-primary mb-4">Application Pipeline</h3>
          <div className="space-y-3">
            {([
              { label: 'New',       key: 'new'       as const, color: 'bg-amber-400'  },
              { label: 'Contacted', key: 'contacted' as const, color: 'bg-blue-400'   },
              { label: 'Qualified', key: 'qualified' as const, color: 'bg-indigo-400' },
              { label: 'Approved',   key: 'converted' as const, color: 'bg-green-500' },
              { label: 'Lost',      key: 'lost'      as const, color: 'bg-red-400'    },
            ]).map(s => (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                <span className="text-sm text-utu-text-secondary flex-1">{s.label}</span>
                <span className="text-sm font-semibold text-utu-text-primary">{stats.enquiries[s.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.contracts.expiring_60d > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            {stats.contracts.expiring_60d} contract{stats.contracts.expiring_60d > 1 ? 's' : ''} expiring within 60 days
          </p>
          <p className="text-xs text-amber-700 mt-0.5">Review the Accounts tab to renew before expiry.</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button onClick={() => onNavigate('accounts')}  className={btnGhost}>Manage Accounts</button>
        <button onClick={() => onNavigate('enquiries')} className={btnGhost}>Review Applications</button>
        <button onClick={() => onNavigate('employees')} className={btnGhost}>Employees</button>
        <button onClick={() => onNavigate('groups')}    className={btnGhost}>Group Trips</button>
      </div>
    </div>
  );
}

// ─── Tab: Accounts ────────────────────────────────────────────────────────────

function ContactsSubPanel({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', title:'', email:'', phone:'', role:'booker', is_primary: false });

  const { data } = useQuery({
    queryKey: ['corp-contacts', accountId],
    queryFn: () => getCorporateContacts(accountId),
    staleTime: 30_000,
  });
  const contacts: CorporateContact[] = (data as any)?.data ?? [];

  const createMut = useMutation({
    mutationFn: (d: Partial<CorporateContact>) => createCorporateContact(accountId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corp-contacts', accountId] }); setShowAdd(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (cid: string) => deleteCorporateContact(accountId, cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corp-contacts', accountId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider">Contacts</p>
        <button onClick={() => setShowAdd(v=>!v)} className="text-xs text-utu-blue hover:underline">+ Add</button>
      </div>

      {showAdd && (
        <div className="space-y-3 rounded-lg bg-utu-bg-subtle p-4 border border-utu-border-default">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inputCls} /></Field>
            <Field label="Title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inputCls} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inputCls} /></Field>
            <Field label="Role">
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className={selectCls}>
                {['decision_maker','travel_manager','booker','finance','other'].map(r=><option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Primary">
              <label className="flex items-center gap-2 mt-2 text-sm text-utu-text-secondary cursor-pointer">
                <input type="checkbox" checked={form.is_primary} onChange={e=>setForm(f=>({...f,is_primary:e.target.checked}))} />
                Primary contact
              </label>
            </Field>
          </div>
          <button disabled={createMut.isPending} onClick={() => createMut.mutate(form)} className={btnPrimary}>
            {createMut.isPending ? 'Adding…' : 'Add Contact'}
          </button>
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="text-xs text-utu-text-muted">No contacts yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-utu-border-default px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-utu-text-primary">{c.name}</span>
                {c.title && <span className="ms-2 text-xs text-utu-text-muted">{c.title}</span>}
                {c.is_primary && <Badge label="Primary" colorCls="bg-blue-50 text-blue-600 ms-2" />}
                <p className="text-xs text-utu-text-muted">{c.email ?? ''} {c.phone ? `· ${c.phone}` : ''}</p>
              </div>
              <button onClick={() => deleteMut.mutate(c.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountsTab() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [tier, setTier]       = useState('');
  const [status, setStatus]   = useState('');
  const [panel, setPanel]     = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<CorporateAccount | null>(null);

  const emptyForm = { company_name:'', industry:'other' as CorporateIndustry, country:'SA', tier:'standard' as CorporateTier,
    status:'prospect' as CorporateStatus, annual_travel_budget_sar:'0', max_flight_class:'economy' as FlightClass,
    max_hotel_stars:'4', per_diem_sar:'0', advance_booking_days:'14', discount_pct:'0',
    owner:'', contract_start:'', contract_end:'', notes:'' };
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-accounts', search, tier, status],
    queryFn: () => getCorporateAccounts({ search: search||undefined, tier: tier||undefined, status: status||undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const accounts: CorporateAccount[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const createMut = useMutation({
    mutationFn: createCorporateAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corporate-accounts'] }); qc.invalidateQueries({ queryKey: ['corporate-stats'] }); setPanel(null); setForm(emptyForm); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CorporateAccount> }) => updateCorporateAccount(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corporate-accounts'] }); setPanel(null); setSelected(null); },
  });

  const [activateForm, setActivateForm] = useState({ email: '', password: '', name: '' });
  const [showActivate, setShowActivate] = useState(false);

  const activateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { email: string; password: string; name?: string } }) =>
      activateCorporateAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corporate-accounts'] });
      setShowActivate(false);
      setActivateForm({ email: '', password: '', name: '' });
    },
  });

  const churnMut = useMutation({
    mutationFn: deleteCorporateAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corporate-accounts'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Tiers</option>
          <option value="enterprise">Enterprise</option>
          <option value="premium">Premium</option>
          <option value="standard">Standard</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="churned">Churned</option>
        </select>
        <span className="text-xs text-utu-text-muted">{total} accounts</span>
        <button onClick={() => { setForm(emptyForm); setPanel('add'); }} className={`${btnPrimary} ms-auto`}>+ New Account</button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No accounts found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Company','Tier','Industry','Flight Policy','Travel Budget','Contract','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {accounts.map(a => (
                <tr key={a.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{a.company_name}</p>
                    <p className="text-xs text-utu-text-muted">{a.country ?? ''} {a.owner ? `· ${a.owner}` : ''}</p>
                  </td>
                  <td className="px-4 py-3"><Badge label={a.tier} colorCls={TIER_COLORS[a.tier]} /></td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary capitalize">{a.industry.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary capitalize">{a.max_flight_class.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{sarFmt(a.annual_travel_budget_sar)}</td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    {a.contract_end ? (
                      <span className={new Date(a.contract_end) < new Date(Date.now() + 60*24*3600000) ? 'text-red-600 font-medium' : ''}>
                        {fmtDate(a.contract_end)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3"><Badge label={a.status} colorCls={STATUS_COLORS[a.status]} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelected(a); setPanel('edit'); }} className={btnGhost}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Account Panel */}
      <SlidePanel open={panel === 'add'} onClose={() => setPanel(null)} title="New Corporate Account">
        <div className="space-y-4">
          <Field label="Company Name *"><input value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value}))} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <select value={form.industry} onChange={e=>setForm(f=>({...f,industry:e.target.value as CorporateIndustry}))} className={selectCls}>
                {['government','finance','oil_gas','tech','healthcare','education','ngo','retail','hospitality','other'].map(v=><option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Country"><input value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))} className={inputCls} placeholder="SA" /></Field>
            <Field label="Tier">
              <select value={form.tier} onChange={e=>setForm(f=>({...f,tier:e.target.value as CorporateTier}))} className={selectCls}>
                <option value="standard">Standard</option><option value="premium">Premium</option><option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as CorporateStatus}))} className={selectCls}>
                <option value="prospect">Prospect</option><option value="active">Active</option><option value="paused">Paused</option>
              </select>
            </Field>
          </div>
          <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider pt-1">Travel Policy</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Flight Class">
              <select value={form.max_flight_class} onChange={e=>setForm(f=>({...f,max_flight_class:e.target.value as FlightClass}))} className={selectCls}>
                <option value="economy">Economy</option><option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option><option value="first">First</option>
              </select>
            </Field>
            <Field label="Max Hotel Stars"><input type="number" min="1" max="5" value={form.max_hotel_stars} onChange={e=>setForm(f=>({...f,max_hotel_stars:e.target.value}))} className={inputCls} /></Field>
            <Field label="Per Diem (SAR)"><input type="number" value={form.per_diem_sar} onChange={e=>setForm(f=>({...f,per_diem_sar:e.target.value}))} className={inputCls} /></Field>
            <Field label="Annual Budget (SAR)"><input type="number" value={form.annual_travel_budget_sar} onChange={e=>setForm(f=>({...f,annual_travel_budget_sar:e.target.value}))} className={inputCls} /></Field>
            <Field label="Advance Booking (days)"><input type="number" value={form.advance_booking_days} onChange={e=>setForm(f=>({...f,advance_booking_days:e.target.value}))} className={inputCls} /></Field>
            <Field label="Discount %"><input type="number" step="0.5" value={form.discount_pct} onChange={e=>setForm(f=>({...f,discount_pct:e.target.value}))} className={inputCls} /></Field>
          </div>
          <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider pt-1">Contract</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contract Start"><input type="date" value={form.contract_start} onChange={e=>setForm(f=>({...f,contract_start:e.target.value}))} className={inputCls} /></Field>
            <Field label="Contract End"><input type="date" value={form.contract_end} onChange={e=>setForm(f=>({...f,contract_end:e.target.value}))} className={inputCls} /></Field>
          </div>
          <Field label="Owner"><input value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} className={inputCls} placeholder="Sales rep name" /></Field>
          <Field label="Notes"><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className={inputCls} /></Field>
          <button disabled={createMut.isPending} onClick={() => createMut.mutate({
            ...form,
            annual_travel_budget_sar: parseFloat(form.annual_travel_budget_sar),
            max_hotel_stars: parseInt(form.max_hotel_stars),
            per_diem_sar: parseFloat(form.per_diem_sar),
            advance_booking_days: parseInt(form.advance_booking_days),
            discount_pct: parseFloat(form.discount_pct),
            contract_start: form.contract_start || undefined,
            contract_end:   form.contract_end   || undefined,
          } as any)} className={btnPrimary}>
            {createMut.isPending ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </SlidePanel>

      {/* Edit Account Panel */}
      <SlidePanel open={panel === 'edit' && !!selected} onClose={() => { setPanel(null); setSelected(null); }} title={selected?.company_name ?? 'Edit Account'}>
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select defaultValue={selected.status}
                  onChange={e => updateMut.mutate({ id: selected.id, d: { status: e.target.value as CorporateStatus } })}
                  className={selectCls}>
                  <option value="prospect">Prospect</option><option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
              <Field label="Tier">
                <select defaultValue={selected.tier}
                  onChange={e => updateMut.mutate({ id: selected.id, d: { tier: e.target.value as CorporateTier } })}
                  className={selectCls}>
                  <option value="standard">Standard</option><option value="premium">Premium</option><option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="Max Flight Class">
                <select defaultValue={selected.max_flight_class}
                  onChange={e => updateMut.mutate({ id: selected.id, d: { max_flight_class: e.target.value as FlightClass } })}
                  className={selectCls}>
                  <option value="economy">Economy</option><option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option><option value="first">First</option>
                </select>
              </Field>
              <Field label="Per Diem (SAR)">
                <input type="number" defaultValue={selected.per_diem_sar}
                  onBlur={e => updateMut.mutate({ id: selected.id, d: { per_diem_sar: parseFloat(e.target.value) } })}
                  className={inputCls} />
              </Field>
              <Field label="Discount %">
                <input type="number" step="0.5" defaultValue={selected.discount_pct}
                  onBlur={e => updateMut.mutate({ id: selected.id, d: { discount_pct: parseFloat(e.target.value) } })}
                  className={inputCls} />
              </Field>
              <Field label="Contract End">
                <input type="date" defaultValue={selected.contract_end?.slice(0,10) ?? ''}
                  onBlur={e => updateMut.mutate({ id: selected.id, d: { contract_end: e.target.value || undefined } })}
                  className={inputCls} />
              </Field>
            </div>

            <Field label="Notes">
              <textarea rows={3} defaultValue={selected.notes ?? ''}
                onBlur={e => updateMut.mutate({ id: selected.id, d: { notes: e.target.value } })}
                className={inputCls} />
            </Field>

            <div className="border-t border-utu-border-default pt-4">
              <ContactsSubPanel accountId={selected.id} />
            </div>

            {/* Portal Activation */}
            <div className="border-t border-utu-border-default pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider">
                  UTUBooking for Business Portal
                </p>
                {selected.activated_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    &#10003; Active
                  </span>
                ) : (
                  <button onClick={() => setShowActivate(v => !v)} className="text-xs text-utu-blue hover:underline">
                    {showActivate ? 'Cancel' : 'Activate Portal Login'}
                  </button>
                )}
              </div>

              {selected.activated_at ? (
                <p className="text-xs text-utu-text-muted">
                  Activated {fmtDate(selected.activated_at)}.{' '}
                  Portal user ID: <span className="font-mono">{selected.portal_user_id?.slice(0, 8)}…</span>
                </p>
              ) : showActivate && (
                <div className="rounded-lg bg-utu-bg-subtle border border-utu-border-default p-4 space-y-3">
                  <p className="text-xs text-utu-text-muted">
                    Creates a <strong>UTUBooking for Business</strong> login. Share the credentials securely with the client.
                  </p>
                  <Field label="Login Email *">
                    <input type="email" value={activateForm.email}
                      onChange={e => setActivateForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls} placeholder="admin@company.com" />
                  </Field>
                  <Field label="Temporary Password *">
                    <input type="password" value={activateForm.password}
                      onChange={e => setActivateForm(f => ({ ...f, password: e.target.value }))}
                      className={inputCls} placeholder="Min. 8 characters" />
                  </Field>
                  <Field label="Display Name">
                    <input value={activateForm.name}
                      onChange={e => setActivateForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} placeholder={`Defaults to "${selected.company_name}"`} />
                  </Field>
                  {(activateMut.error || (activateMut.data as any)?.error) && (
                    <p className="text-xs text-red-600">
                      {(activateMut.data as any)?.message || 'Activation failed. Please try again.'}
                    </p>
                  )}
                  <button
                    disabled={activateMut.isPending || !activateForm.email || !activateForm.password}
                    onClick={() => activateMut.mutate({ id: selected.id, data: activateForm })}
                    className={btnPrimary}
                  >
                    {activateMut.isPending ? 'Activating…' : 'Activate Portal Login'}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-utu-border-default">
              <button onClick={() => { if (confirm(`Churn ${selected.company_name}?`)) churnMut.mutate(selected.id); }}
                className="text-xs text-red-600 hover:underline">
                Churn Account
              </button>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Enquiries ───────────────────────────────────────────────────────────

function EnquiriesTab() {
  const qc = useQueryClient();
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('new');
  const [selected, setSelected] = useState<CorporateEnquiry | null>(null);
  // Approve / Reject modals
  const [approveTarget, setApproveTarget] = useState<CorporateEnquiry | null>(null);
  const [approveNotes,  setApproveNotes]  = useState('');
  const [rejectTarget,  setRejectTarget]  = useState<CorporateEnquiry | null>(null);
  const [rejectReason,  setRejectReason]  = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-enquiries', search, status],
    queryFn:  () => getCorporateEnquiries({ search: search||undefined, status: status||undefined, limit: 50 }),
    staleTime: 30_000,
  });
  const enquiries: CorporateEnquiry[] = (data as any)?.data ?? [];
  const total: number                 = (data as any)?.total ?? 0;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['corporate-enquiries'] });
    qc.invalidateQueries({ queryKey: ['corporate-stats'] });
    qc.invalidateQueries({ queryKey: ['corporate-accounts'] });
  };

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CorporateEnquiry> }) => updateCorporateEnquiry(id, d),
    onSuccess: refresh,
  });

  const approveMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => approveCorporateEnquiry(id, notes),
    onSuccess: () => { setApproveTarget(null); setApproveNotes(''); refresh(); },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectCorporateEnquiry(id, reason),
    onSuccess: () => { setRejectTarget(null); setRejectReason(''); refresh(); },
  });

  const NEXT_STATUS: Record<EnquiryStatus, EnquiryStatus | null> = {
    new: 'contacted', contacted: 'qualified', qualified: 'converted', converted: null, lost: null,
  };

  const sarFmt2 = (n: number | null) => n ? `SAR ${Math.round(n).toLocaleString()}/mo` : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company / email…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Approved</option>
          <option value="lost">Rejected / Lost</option>
        </select>
        <span className="text-xs text-utu-text-muted ms-auto">{total} applications</span>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : enquiries.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No applications found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Company','Contact / Role','Industry / Size','Budget / mo','Status','Applied','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {enquiries.map(e => (
                <tr key={e.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{e.company_name}</p>
                    {e.country && <p className="text-xs text-utu-text-muted">{e.country}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-utu-text-secondary">{e.contact_name}</p>
                    <p className="text-xs text-utu-text-muted">{e.job_title ?? e.email}</p>
                    {e.job_title && <p className="text-xs text-utu-text-muted">{e.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">
                    <p className="capitalize">{e.industry?.replace(/_/g,' ') ?? '—'}</p>
                    <p className="text-utu-text-muted">{e.company_size ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">{sarFmt2(e.estimated_monthly_budget_sar)}</td>
                  <td className="px-4 py-3"><Badge label={e.status === 'converted' ? 'approved' : e.status} colorCls={ENQUIRY_STATUS_COLORS[e.status]} /></td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">{fmtDate(e.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setSelected(e)} className={btnGhost}>View</button>
                      {/* One-click Approve — available for new/contacted/qualified */}
                      {(e.status === 'new' || e.status === 'contacted' || e.status === 'qualified') && (
                        <button onClick={() => { setApproveTarget(e); setApproveNotes(''); }}
                          className="rounded-lg border border-green-300 bg-green-50 px-3 py-1 text-xs text-green-700 hover:bg-green-100 font-semibold">
                          Approve
                        </button>
                      )}
                      {/* Reject — available for new/contacted/qualified */}
                      {(e.status === 'new' || e.status === 'contacted' || e.status === 'qualified') && (
                        <button onClick={() => { setRejectTarget(e); setRejectReason(''); }}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                          Reject
                        </button>
                      )}
                      {/* Advance pipeline manually */}
                      {NEXT_STATUS[e.status] && NEXT_STATUS[e.status] !== 'converted' && (
                        <button onClick={() => updateMut.mutate({ id: e.id, d: { status: NEXT_STATUS[e.status]! } })}
                          className="rounded-lg border border-blue-200 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50 capitalize">
                          {NEXT_STATUS[e.status]}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enquiry detail panel */}
      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title="Application Details">
        {selected && (
          <div className="space-y-4 text-sm">
            {/* Status banner for approved */}
            {selected.status === 'converted' && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700 font-medium">
                Approved — corporate account created and credentials sent.
              </div>
            )}
            {selected.status === 'lost' && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 font-medium">
                Rejected — applicant has been notified.
              </div>
            )}
            {/* Company */}
            <div>
              <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">Company</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-utu-text-muted">Company</p><p className="font-medium">{selected.company_name}</p></div>
                <div><p className="text-xs text-utu-text-muted">Size</p><p>{selected.company_size ?? '—'}</p></div>
                <div><p className="text-xs text-utu-text-muted">Country</p><p>{selected.country ?? '—'}</p></div>
                <div><p className="text-xs text-utu-text-muted">Industry</p><p className="capitalize">{selected.industry?.replace(/_/g,' ') ?? '—'}</p></div>
                <div><p className="text-xs text-utu-text-muted">Monthly Budget</p><p>{sarFmt2(selected.estimated_monthly_budget_sar)}</p></div>
              </div>
            </div>
            {/* Contact */}
            <div>
              <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-utu-text-muted">Name</p><p>{selected.contact_name}</p></div>
                <div><p className="text-xs text-utu-text-muted">Job Title</p><p>{selected.job_title ?? '—'}</p></div>
                <div><p className="text-xs text-utu-text-muted">Email</p><p className="break-all">{selected.email}</p></div>
                <div><p className="text-xs text-utu-text-muted">Phone</p><p>{selected.phone ?? '—'}</p></div>
                <div><p className="text-xs text-utu-text-muted">Heard via</p><p className="capitalize">{selected.hear_about_us?.replace(/_/g,' ') ?? '—'}</p></div>
                <div><p className="text-xs text-utu-text-muted">Source</p><p className="capitalize">{selected.source}</p></div>
              </div>
            </div>
            {/* Travel profile */}
            <div>
              <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">Travel Profile</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-utu-text-muted">Travelers</p><p>{selected.traveler_count}</p></div>
                <div><p className="text-xs text-utu-text-muted">Status</p><Badge label={selected.status === 'converted' ? 'approved' : selected.status} colorCls={ENQUIRY_STATUS_COLORS[selected.status]} /></div>
                <div className="col-span-2"><p className="text-xs text-utu-text-muted">Destinations</p><p>{selected.destinations ?? '—'}</p></div>
                <div className="col-span-2"><p className="text-xs text-utu-text-muted">Travel Dates / Frequency</p><p>{selected.travel_dates ?? '—'}</p></div>
              </div>
            </div>
            {selected.message && (
              <div><p className="text-xs text-utu-text-muted mb-1">Message</p>
                <p className="rounded-lg bg-utu-bg-subtle p-3 text-xs">{selected.message}</p></div>
            )}
            <Field label="Assigned To">
              <input defaultValue={selected.assigned_to ?? ''}
                onBlur={e => updateMut.mutate({ id: selected.id, d: { assigned_to: e.target.value || undefined } })}
                className={inputCls} placeholder="Rep name…" />
            </Field>
            <Field label="Admin Notes">
              <textarea rows={3} defaultValue={selected.admin_notes ?? ''}
                onBlur={e => updateMut.mutate({ id: selected.id, d: { admin_notes: e.target.value } })}
                className={inputCls} />
            </Field>
            {/* Action buttons inside panel */}
            {(selected.status === 'new' || selected.status === 'contacted' || selected.status === 'qualified') && (
              <div className="flex gap-3 pt-2 border-t border-utu-border-default">
                <button onClick={() => { setSelected(null); setApproveTarget(selected); setApproveNotes(''); }}
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 text-sm transition-colors">
                  Approve Application
                </button>
                <button onClick={() => { setSelected(null); setRejectTarget(selected); setRejectReason(''); }}
                  className="flex-1 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 font-semibold py-2.5 text-sm transition-colors">
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Approve confirmation modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setApproveTarget(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-utu-text-primary">Approve Application</h3>
            <p className="text-sm text-utu-text-secondary">
              This will create a corporate account and portal login for{' '}
              <strong>{approveTarget.company_name}</strong> and send{' '}
              <strong>{approveTarget.email}</strong> their credentials.
            </p>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Notes (optional — visible to team)</label>
              <textarea rows={2} value={approveNotes} onChange={e => setApproveNotes(e.target.value)}
                className="w-full rounded-xl border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                placeholder="e.g. Enterprise deal, introductory 15% discount applied" />
            </div>
            {approveMut.isError && (
              <p className="text-xs text-red-600">{(approveMut.error as any)?.message ?? 'Approval failed. Please try again.'}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setApproveTarget(null)}
                className="flex-1 rounded-xl border border-utu-border-default text-utu-text-secondary py-2.5 text-sm hover:bg-utu-bg-subtle">
                Cancel
              </button>
              <button
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate({ id: approveTarget.id, notes: approveNotes || undefined })}
                className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-2.5 text-sm transition-colors">
                {approveMut.isPending ? 'Approving…' : 'Approve & Send Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectTarget(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-utu-text-primary">Reject Application</h3>
            <p className="text-sm text-utu-text-secondary">
              A rejection email will be sent to <strong>{rejectTarget.email}</strong>{' '}
              ({rejectTarget.company_name}).
            </p>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Reason (optional — included in email)</label>
              <textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
                placeholder="e.g. Company size below minimum threshold at this time." />
            </div>
            {rejectMut.isError && (
              <p className="text-xs text-red-600">{(rejectMut.error as any)?.message ?? 'Rejection failed. Please try again.'}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-utu-border-default text-utu-text-secondary py-2.5 text-sm hover:bg-utu-bg-subtle">
                Cancel
              </button>
              <button
                disabled={rejectMut.isPending}
                onClick={() => rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason || undefined })}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 text-sm transition-colors">
                {rejectMut.isPending ? 'Rejecting…' : 'Reject & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Bookings ────────────────────────────────────────────────────────────

const CORP_STATUS_COLORS: Record<CorpBookingStatus, string> = {
  pending:   'bg-amber-100  text-amber-700',
  confirmed: 'bg-green-100  text-green-700',
  cancelled: 'bg-gray-100   text-gray-500',
  failed:    'bg-red-100    text-red-600',
};

function BookingsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingOnly, setPendingOnly]   = useState(false);
  const [confirmRef, setConfirmRef]     = useState('');
  const [confirmCost, setConfirmCost]   = useState('');
  const [selected, setSelected]         = useState<CorporateBookingAdmin | null>(null);
  const [actionPanel, setActionPanel]   = useState<'confirm' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-corp-bookings', statusFilter, pendingOnly],
    queryFn: () => getAdminCorporateBookings({
      status:           statusFilter || undefined,
      pending_approval: pendingOnly || undefined,
      limit: 100,
    }),
    staleTime: 30_000,
  });
  const bookings: CorporateBookingAdmin[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const confirmMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: { booking_ref?: string; actual_cost_sar?: number } }) =>
      confirmCorporateBooking(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-corp-bookings'] });
      setSelected(null); setActionPanel(null); setConfirmRef(''); setConfirmCost('');
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: { reason?: string } }) =>
      rejectCorporateBooking(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-corp-bookings'] });
      setSelected(null); setActionPanel(null); setRejectReason('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-utu-text-secondary cursor-pointer">
          <input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} />
          Needs approval only
        </label>
        <span className="text-xs text-utu-text-muted ms-auto">{total} bookings</span>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No corporate bookings found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Trip','Employee','Dates','Est. Cost','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary capitalize">
                      {b.booking_type === 'flight' ? `✈ ${b.origin ?? '?'} → ${b.destination}` : `🏨 ${b.destination}`}
                    </p>
                    {b.booking_ref && <p className="text-xs text-utu-text-muted font-mono">{b.booking_ref}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-utu-text-secondary">{b.employee_name}</p>
                    {b.employee_dept && <p className="text-xs text-utu-text-muted">{b.employee_dept}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    <p>{fmtDate(b.depart_date)}</p>
                    {b.return_date && <p>→ {fmtDate(b.return_date)}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">
                    SAR {Math.round(b.actual_cost_sar ?? b.estimated_cost_sar).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge label={b.status} colorCls={CORP_STATUS_COLORS[b.status]} />
                      {b.requires_approval && !b.approved_at && b.status === 'pending' && (
                        <Badge label="Needs approval" colorCls="bg-amber-50 text-amber-700" />
                      )}
                      {!b.policy_compliant && <Badge label="Policy flag" colorCls="bg-red-50 text-red-600" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => { setSelected(b); setActionPanel('confirm'); }}
                            className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs font-medium">
                            Confirm
                          </button>
                          <button onClick={() => { setSelected(b); setActionPanel('reject'); }}
                            className="rounded-lg border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1 text-xs">
                            Reject
                          </button>
                        </>
                      )}
                      <button onClick={() => { setSelected(b); setActionPanel(null); }}
                        className={btnGhost}>Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action / detail panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => { setSelected(null); setActionPanel(null); setConfirmRef(''); setConfirmCost(''); setRejectReason(''); }}
        title={actionPanel === 'confirm' ? 'Confirm Booking' : actionPanel === 'reject' ? 'Reject Booking' : 'Booking Details'}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            {actionPanel === 'confirm' && (
              <div className="space-y-4">
                <p className="text-utu-text-muted">Mark this booking as confirmed and optionally record the UTUBooking reference and actual cost.</p>
                <Field label="UTUBooking Booking Ref">
                  <input value={confirmRef} onChange={e => setConfirmRef(e.target.value)} className={inputCls} placeholder="BK-XXXXXXXX" />
                </Field>
                <Field label="Actual Cost (SAR)">
                  <input type="number" value={confirmCost} onChange={e => setConfirmCost(e.target.value)} className={inputCls} placeholder={String(selected.estimated_cost_sar)} />
                </Field>
                <button disabled={confirmMut.isPending}
                  onClick={() => confirmMut.mutate({ id: selected.id, d: { booking_ref: confirmRef || undefined, actual_cost_sar: confirmCost ? parseFloat(confirmCost) : undefined } })}
                  className={btnPrimary}>
                  {confirmMut.isPending ? 'Confirming…' : 'Confirm Booking'}
                </button>
              </div>
            )}

            {actionPanel === 'reject' && (
              <div className="space-y-4">
                <p className="text-utu-text-muted">Cancelling this booking for <strong>{selected.employee_name}</strong>.</p>
                <Field label="Reason (optional)">
                  <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} className={inputCls} />
                </Field>
                <button disabled={rejectMut.isPending}
                  onClick={() => rejectMut.mutate({ id: selected.id, d: { reason: rejectReason || undefined } })}
                  className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2">
                  {rejectMut.isPending ? 'Rejecting…' : 'Reject Booking'}
                </button>
              </div>
            )}

            {!actionPanel && (
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-utu-text-muted">Employee</p><p className="font-medium">{selected.employee_name}</p></div>
                <div><p className="text-xs text-utu-text-muted">Email</p><p>{selected.employee_email}</p></div>
                <div><p className="text-xs text-utu-text-muted">Trip</p>
                  <p className="capitalize">{selected.booking_type === 'flight' ? `${selected.origin} → ${selected.destination}` : selected.destination}</p></div>
                <div><p className="text-xs text-utu-text-muted">Dates</p><p>{fmtDate(selected.depart_date)}{selected.return_date ? ` → ${fmtDate(selected.return_date)}` : ''}</p></div>
                <div><p className="text-xs text-utu-text-muted">Est. Cost</p><p>SAR {Math.round(selected.estimated_cost_sar).toLocaleString()}</p></div>
                <div><p className="text-xs text-utu-text-muted">Status</p><Badge label={selected.status} colorCls={CORP_STATUS_COLORS[selected.status]} /></div>
                {selected.approved_by && <div><p className="text-xs text-utu-text-muted">Approved by</p><p>{selected.approved_by}</p></div>}
                {selected.purpose && <div><p className="text-xs text-utu-text-muted">Purpose</p><p>{selected.purpose}</p></div>}
                {selected.booking_ref && <div><p className="text-xs text-utu-text-muted">Booking Ref</p><p className="font-mono">{selected.booking_ref}</p></div>}
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Employees ───────────────────────────────────────────────────────────

const EMP_STATUS_COLORS: Record<EmployeeStatus, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100  text-gray-500',
};

function passportWarning(expiry: string | null | undefined): { label: string; cls: string } | null {
  if (!expiry) return { label: 'No passport', cls: 'bg-red-100 text-red-600' };
  const daysLeft = (new Date(expiry).getTime() - Date.now()) / 86_400_000;
  if (daysLeft < 0)   return { label: 'Expired',       cls: 'bg-red-100    text-red-600'    };
  if (daysLeft < 180) return { label: 'Expiring soon', cls: 'bg-amber-100  text-amber-700'  };
  return null;
}

function EmployeesTab() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState('');
  const [dept, setDept]         = useState('');
  const [statusF, setStatusF]   = useState('active');
  const [selected, setSelected] = useState<CorporateEmployee | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-corp-employees', search, dept, statusF],
    queryFn: () => getAdminCorporateEmployees({
      search: search || undefined,
      department: dept || undefined,
      status: statusF || undefined,
      limit: 100,
    }),
    staleTime: 30_000,
  });
  const employees: CorporateEmployee[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CorporateEmployee> }) =>
      updateAdminCorporateEmployee(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-corp-employees'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <input value={dept} onChange={e => setDept(e.target.value)} placeholder="Department…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-utu-text-muted ms-auto">{total} employees</span>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No employees found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Name','Department','Nationality','Passport','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {employees.map(emp => {
                const warn = passportWarning(emp.passport_expiry);
                return (
                  <tr key={emp.id} className="hover:bg-utu-bg-subtle transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-utu-text-primary">{emp.name}</p>
                      <p className="text-xs text-utu-text-muted">{emp.email ?? ''}</p>
                      {emp.is_travel_manager && (
                        <Badge label="Travel Manager" colorCls="bg-indigo-50 text-indigo-700 mt-0.5" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">
                      {emp.department ?? '—'}
                      {emp.job_title && <p className="text-utu-text-muted">{emp.job_title}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">{emp.nationality ?? '—'}</td>
                    <td className="px-4 py-3">
                      {warn ? (
                        <Badge label={warn.label} colorCls={warn.cls} />
                      ) : (
                        <span className="text-xs text-utu-text-muted">
                          {emp.passport_expiry ? new Date(emp.passport_expiry).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={emp.status} colorCls={EMP_STATUS_COLORS[emp.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(emp)} className={btnGhost}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee edit panel */}
      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? 'Employee'}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 text-xs text-utu-text-muted">
              <div><p>Employee Ref</p><p className="font-mono text-utu-text-primary">{selected.employee_ref ?? '—'}</p></div>
              <div><p>Email</p><p className="text-utu-text-primary">{selected.email ?? '—'}</p></div>
              <div><p>Passport No.</p><p className="font-mono text-utu-text-primary">{selected.passport_number ?? '—'}</p></div>
              <div><p>Passport Expiry</p><p className="text-utu-text-primary">{selected.passport_expiry ? fmtDate(selected.passport_expiry) : '—'}</p></div>
              <div><p>Date of Birth</p><p className="text-utu-text-primary">{selected.date_of_birth ? fmtDate(selected.date_of_birth) : '—'}</p></div>
              <div><p>Nationality</p><p className="text-utu-text-primary">{selected.nationality ?? '—'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <input defaultValue={selected.department ?? ''}
                  onBlur={e => updateMut.mutate({ id: selected.id, d: { department: e.target.value || undefined } })}
                  className={inputCls} />
              </Field>
              <Field label="Job Title">
                <input defaultValue={selected.job_title ?? ''}
                  onBlur={e => updateMut.mutate({ id: selected.id, d: { job_title: e.target.value || undefined } })}
                  className={inputCls} />
              </Field>
              <Field label="Status">
                <select defaultValue={selected.status}
                  onChange={e => updateMut.mutate({ id: selected.id, d: { status: e.target.value as EmployeeStatus } })}
                  className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Travel Manager">
                <label className="flex items-center gap-2 mt-2 text-sm text-utu-text-secondary cursor-pointer">
                  <input type="checkbox" defaultChecked={selected.is_travel_manager}
                    onChange={e => updateMut.mutate({ id: selected.id, d: { is_travel_manager: e.target.checked } })} />
                  Is travel manager
                </label>
              </Field>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Tab: Groups ──────────────────────────────────────────────────────────────

const GROUP_STATUS_COLORS: Record<TripGroupStatus, string> = {
  draft:     'bg-gray-100   text-gray-600',
  confirmed: 'bg-green-100  text-green-700',
  cancelled: 'bg-red-100    text-red-600',
};

function GroupsTab() {
  const [statusF, setStatusF]   = useState('');
  const [selected, setSelected] = useState<AdminTripGroup | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-trip-groups', statusF],
    queryFn: () => getAdminTripGroups({ status: statusF || undefined, limit: 100 }),
    staleTime: 30_000,
  });
  const groups: AdminTripGroup[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-utu-text-muted ms-auto">{total} groups</span>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center text-sm text-utu-text-muted">No group trips found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Group Name','Route','Depart Date','Travelers','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {groups.map(g => (
                <tr key={g.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{g.name}</p>
                    {g.purpose && <p className="text-xs text-utu-text-muted capitalize">{g.purpose}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">
                    {g.origin ? `${g.origin} → ${g.destination}` : g.destination}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    <p>{fmtDate(g.depart_date)}</p>
                    {g.return_date && <p>→ {fmtDate(g.return_date)}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-utu-text-secondary font-medium">{g.traveler_count}</td>
                  <td className="px-4 py-3">
                    <Badge label={g.status} colorCls={GROUP_STATUS_COLORS[g.status]} />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(g)} className={btnGhost}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Group detail panel */}
      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? 'Group Trip'}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-utu-text-muted">Destination</p><p className="font-medium text-utu-text-primary">{selected.destination}</p></div>
              <div><p className="text-xs text-utu-text-muted">Origin</p><p>{selected.origin ?? '—'}</p></div>
              <div><p className="text-xs text-utu-text-muted">Depart Date</p><p>{fmtDate(selected.depart_date)}</p></div>
              <div><p className="text-xs text-utu-text-muted">Return Date</p><p>{selected.return_date ? fmtDate(selected.return_date) : '—'}</p></div>
              <div><p className="text-xs text-utu-text-muted">Travelers</p><p className="font-semibold">{selected.traveler_count}</p></div>
              <div><p className="text-xs text-utu-text-muted">Status</p><Badge label={selected.status} colorCls={GROUP_STATUS_COLORS[selected.status]} /></div>
              <div><p className="text-xs text-utu-text-muted">Purpose</p><p className="capitalize">{selected.purpose ?? '—'}</p></div>
              <div><p className="text-xs text-utu-text-muted">Created</p><p>{fmtDate(selected.created_at)}</p></div>
            </div>
            {selected.description && (
              <div>
                <p className="text-xs text-utu-text-muted mb-1">Description</p>
                <p className="rounded-lg bg-utu-bg-subtle p-3 text-utu-text-secondary">{selected.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-utu-text-muted mb-1">Account ID</p>
              <p className="font-mono text-xs text-utu-text-muted">{selected.account_id}</p>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CorporateTravelPage() {
  const [tab, setTab] = useState<Tab>('overview');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',   label: 'Overview'   },
    { key: 'accounts',   label: 'Accounts'   },
    { key: 'enquiries',  label: 'Applications'  },
    { key: 'bookings',   label: 'Bookings'   },
    { key: 'employees',  label: 'Employees'  },
    { key: 'groups',     label: 'Groups'     },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Corporate Travel</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Manage corporate accounts, travel policies, and inbound business travel enquiries.</p>
      </div>

      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-utu-navy text-utu-navy'
                : 'text-utu-text-muted hover:text-utu-text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview'   && <OverviewTab onNavigate={setTab} />}
        {tab === 'accounts'   && <AccountsTab />}
        {tab === 'enquiries'  && <EnquiriesTab />}
        {tab === 'bookings'   && <BookingsTab />}
        {tab === 'employees'  && <EmployeesTab />}
        {tab === 'groups'     && <GroupsTab />}
      </div>
    </div>
  );
}
