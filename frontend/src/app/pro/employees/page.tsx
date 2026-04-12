'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployees, createEmployee, updateEmployee, deactivateEmployee,
  type CorporateEmployee,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type MealPref    = CorporateEmployee['meal_preference'];
type SeatPref    = CorporateEmployee['seat_preference'];

const MEAL_LABELS: Record<MealPref, string> = {
  standard: 'Standard', vegetarian: 'Vegetarian', vegan: 'Vegan',
  halal: 'Halal', kosher: 'Kosher', gluten_free: 'Gluten-free', other: 'Other',
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

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
const selectCls  = inputCls;
const btnPrimary = 'rounded-lg bg-utu-navy px-4 py-2 text-sm font-medium text-white hover:bg-utu-blue transition-colors disabled:opacity-50';
const btnGhost   = 'rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-muted hover:bg-gray-50';

// ── Employee form data ────────────────────────────────────────────────────────

type FormData = {
  employee_ref: string; name: string; email: string; phone: string;
  department: string; job_title: string; nationality: string;
  passport_number: string; passport_expiry: string; date_of_birth: string;
  gender: string; meal_preference: MealPref; seat_preference: SeatPref;
  is_travel_manager: boolean; notes: string;
};

const emptyForm: FormData = {
  employee_ref: '', name: '', email: '', phone: '',
  department: '', job_title: '', nationality: '',
  passport_number: '', passport_expiry: '', date_of_birth: '',
  gender: '', meal_preference: 'standard', seat_preference: 'none',
  is_travel_manager: false, notes: '',
};

function EmployeeForm({ initial, onSave, isSaving, errorMsg }: {
  initial: FormData;
  onSave: (d: FormData) => void;
  isSaving: boolean;
  errorMsg: string;
}) {
  const [f, setF] = useState<FormData>(initial);
  const set = (k: keyof FormData, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider">Basic Info</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name *">
          <input value={f.name} onChange={e => set('name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Work Email *">
          <input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Phone">
          <input value={f.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+966…" />
        </Field>
        <Field label="Employee ID">
          <input value={f.employee_ref} onChange={e => set('employee_ref', e.target.value)} className={inputCls} placeholder="HR / internal ID" />
        </Field>
        <Field label="Department">
          <input value={f.department} onChange={e => set('department', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Job Title">
          <input value={f.job_title} onChange={e => set('job_title', e.target.value)} className={inputCls} />
        </Field>
      </div>

      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider pt-1">Travel Documents</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nationality (ISO)">
          <input value={f.nationality} onChange={e => set('nationality', e.target.value.toUpperCase())} className={inputCls} placeholder="SA / AE / PK…" maxLength={2} />
        </Field>
        <Field label="Gender">
          <select value={f.gender} onChange={e => set('gender', e.target.value)} className={selectCls}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Date of Birth">
          <input type="date" value={f.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Passport Number">
          <input value={f.passport_number} onChange={e => set('passport_number', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Passport Expiry">
          <input type="date" value={f.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} className={inputCls} />
        </Field>
      </div>

      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider pt-1">Travel Preferences</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Meal Preference">
          <select value={f.meal_preference} onChange={e => set('meal_preference', e.target.value as MealPref)} className={selectCls}>
            {(Object.entries(MEAL_LABELS) as [MealPref, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Seat Preference">
          <select value={f.seat_preference} onChange={e => set('seat_preference', e.target.value as SeatPref)} className={selectCls}>
            <option value="none">No preference</option>
            <option value="window">Window</option>
            <option value="aisle">Aisle</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-utu-text-secondary cursor-pointer">
        <input type="checkbox" checked={f.is_travel_manager} onChange={e => set('is_travel_manager', e.target.checked)} />
        Travel Manager — can book on behalf of others
      </label>

      <Field label="Notes">
        <textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} className={inputCls} />
      </Field>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        disabled={isSaving || !f.name.trim() || !f.email.trim()}
        onClick={() => onSave(f)}
        className={btnPrimary}
      >
        {isSaving ? 'Saving…' : 'Save Employee'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProEmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [panel, setPanel]   = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<CorporateEmployee | null>(null);
  const [saveError, setSaveError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['portal-employees', search, statusFilter],
    queryFn: () => getEmployees({ search: search || undefined, status: statusFilter || undefined, limit: 100 }),
    staleTime: 30_000,
  });
  const employees: CorporateEmployee[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const createMut = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-employees'] }); setPanel(null); setSaveError(''); },
    onError: (e: any) => setSaveError(e?.message || 'Failed to save. Please try again.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<CorporateEmployee> }) => updateEmployee(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-employees'] }); setPanel(null); setSaveError(''); },
    onError: (e: any) => setSaveError(e?.message || 'Failed to save. Please try again.'),
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-employees'] }),
  });

  function openEdit(emp: CorporateEmployee) {
    setSelected(emp);
    setSaveError('');
    setPanel('edit');
  }

  const editInitial: FormData = selected ? {
    employee_ref:      selected.employee_ref ?? '',
    name:              selected.name,
    email:             selected.email,
    phone:             selected.phone ?? '',
    department:        selected.department ?? '',
    job_title:         selected.job_title ?? '',
    nationality:       selected.nationality ?? '',
    passport_number:   selected.passport_number ?? '',
    passport_expiry:   selected.passport_expiry?.slice(0, 10) ?? '',
    date_of_birth:     selected.date_of_birth?.slice(0, 10) ?? '',
    gender:            selected.gender ?? '',
    meal_preference:   selected.meal_preference,
    seat_preference:   selected.seat_preference,
    is_travel_manager: selected.is_travel_manager,
    notes:             selected.notes ?? '',
  } : emptyForm;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Employee Directory</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Manage your company&apos;s travellers, travel documents, and preferences.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="">All</option>
        </select>
        <span className="text-xs text-utu-text-muted">{total} employees</span>
        <button
          onClick={() => { setSaveError(''); setPanel('add'); }}
          className={`${btnPrimary} ms-auto`}
        >
          + Add Employee
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-utu-text-muted">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="py-20 text-center text-sm text-utu-text-muted">
          {search ? 'No employees match your search.' : 'No employees yet. Click "+ Add Employee" to get started.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-utu-border-default bg-utu-bg-subtle">
              <tr>
                {['Employee', 'Department / Title', 'Documents', 'Preferences', 'Role', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-utu-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-utu-text-primary">{emp.name}</p>
                    <p className="text-xs text-utu-text-muted">{emp.email}</p>
                    {emp.phone && <p className="text-xs text-utu-text-muted">{emp.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-secondary">
                    {emp.department && <p>{emp.department}</p>}
                    {emp.job_title && <p className="text-utu-text-muted">{emp.job_title}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    {emp.nationality && <p>{emp.nationality}</p>}
                    {emp.passport_expiry && (
                      <p className={new Date(emp.passport_expiry) < new Date(Date.now() + 180*24*3600000) ? 'text-amber-600 font-medium' : ''}>
                        Exp: {fmtDate(emp.passport_expiry)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-utu-text-muted">
                    <p>{MEAL_LABELS[emp.meal_preference]}</p>
                    {emp.seat_preference !== 'none' && <p className="capitalize">{emp.seat_preference}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {emp.is_travel_manager && (
                      <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Travel Mgr
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(emp)} className={btnGhost}>Edit</button>
                      {emp.status === 'active' && (
                        <button
                          onClick={() => { if (confirm(`Deactivate ${emp.name}?`)) deactivateMut.mutate(emp.id); }}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Remove
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

      {/* Add panel */}
      <SlidePanel open={panel === 'add'} onClose={() => setPanel(null)} title="Add Employee">
        <EmployeeForm
          initial={emptyForm}
          isSaving={createMut.isPending}
          errorMsg={saveError}
          onSave={d => {
            setSaveError('');
            createMut.mutate({
              ...d,
              passport_expiry: d.passport_expiry || undefined,
              date_of_birth:   d.date_of_birth   || undefined,
              gender:          (d.gender as any)  || undefined,
            } as any);
          }}
        />
      </SlidePanel>

      {/* Edit panel */}
      <SlidePanel open={panel === 'edit' && !!selected} onClose={() => { setPanel(null); setSelected(null); }} title={selected?.name ?? 'Edit Employee'}>
        {selected && (
          <EmployeeForm
            initial={editInitial}
            isSaving={updateMut.isPending}
            errorMsg={saveError}
            onSave={d => {
              setSaveError('');
              updateMut.mutate({
                id: selected.id,
                d: {
                  ...d,
                  passport_expiry: d.passport_expiry || undefined,
                  date_of_birth:   d.date_of_birth   || undefined,
                  gender:          (d.gender as any)  || undefined,
                } as any,
              });
            }}
          />
        )}
      </SlidePanel>

    </div>
  );
}
