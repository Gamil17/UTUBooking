'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHrStats, getHrEmployees, createHrEmployee, updateHrEmployee, deleteHrEmployee,
  getHrDepartments, createHrDepartment, updateHrDepartment, deleteHrDepartment,
  getHrLeave, createHrLeave, updateHrLeave,
  getLeaveBalancesOverview, seedLeaveBalances, getOrgChart, importEmployees,
  getPerformanceAnalysis, analyzePerformance,
  type HrEmployee, type HrDepartment, type HrLeaveRequest, type HrStats,
  type EmployeeStatus, type EmploymentType, type LeaveType, type LeaveStatus,
  type HrLeaveBalanceOverviewRow, type OrgChartNode, type ImportResult, type ImportEmployeeRow,
  type PerformanceAnalysis,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const e = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  active:     'bg-green-100  text-green-700  border-green-200',
  on_leave:   'bg-amber-100  text-amber-700  border-amber-200',
  terminated: 'bg-red-100    text-red-600    border-red-200',
};

const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  pending:   'bg-amber-100  text-amber-700  border-amber-200',
  approved:  'bg-green-100  text-green-700  border-green-200',
  rejected:  'bg-red-100    text-red-600    border-red-200',
  cancelled: 'bg-utu-bg-muted text-utu-text-muted border-utu-border-default',
};

const TYPE_COLORS: Record<EmploymentType, string> = {
  full_time:   'bg-utu-bg-subtle  text-utu-blue    border-utu-border-default',
  part_time:   'bg-purple-50      text-purple-700   border-purple-200',
  contractor:  'bg-amber-50       text-amber-700    border-amber-200',
  intern:      'bg-blue-50        text-blue-700     border-blue-200',
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual:     'Annual', sick: 'Sick', emergency: 'Emergency',
  maternity:  'Maternity', paternity: 'Paternity', unpaid: 'Unpaid',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: number | string; sub?: string; accent?: 'green' | 'amber' | 'blue' | 'red';
}) {
  const colors = {
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    blue:  'border-utu-blue  bg-blue-50',
    red:   'border-red-200   bg-red-50',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? colors[accent] : 'border-utu-border-default bg-utu-bg-card'}`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

// ─── Dept bar chart ───────────────────────────────────────────────────────────

function DeptChart({ data }: { data: { name: string; count: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.name} className="flex items-center gap-3">
          <p className="w-28 truncate text-xs text-utu-text-secondary text-right">{d.name}</p>
          <div className="flex-1 h-3 rounded-full bg-utu-bg-muted">
            <div
              className="h-3 rounded-full bg-utu-blue transition-all duration-500"
              style={{ width: `${Math.max(4, Math.round((d.count / max) * 100))}%` }}
            />
          </div>
          <p className="w-6 text-xs font-medium text-utu-text-primary text-right">{d.count}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Employee Panel (create / edit) ──────────────────────────────────────────

const EMPTY_EMP = {
  full_name: '', email: '', phone: '', role: '',
  department_id: '', manager_id: '', location: '', hire_date: '',
  employment_type: 'full_time' as EmploymentType, salary_sar: '',
};

function EmployeePanel({
  employee,
  departments,
  employees,
  onClose,
}: {
  employee: HrEmployee | null;
  departments: HrDepartment[];
  employees: HrEmployee[];
  onClose: () => void;
}) {
  const qc     = useQueryClient();
  const isEdit = !!employee;

  const [form, setForm] = useState({
    full_name:       employee?.full_name       ?? '',
    email:           employee?.email           ?? '',
    phone:           employee?.phone           ?? '',
    role:            employee?.role            ?? '',
    department_id:   employee?.department_id   ?? '',
    manager_id:      employee?.manager_id      ?? '',
    location:        employee?.location        ?? '',
    hire_date:       employee?.hire_date?.slice(0, 10) ?? '',
    employment_type: employee?.employment_type ?? 'full_time' as EmploymentType,
    salary_sar:      employee?.salary_sar != null ? String(employee.salary_sar) : '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        department_id: form.department_id || null,
        manager_id:    form.manager_id    || null,
        phone:         form.phone         || null,
        location:      form.location      || null,
        salary_sar:    form.salary_sar ? parseFloat(form.salary_sar) : null,
      };
      return isEdit ? updateHrEmployee(employee!.id, payload) : createHrEmployee(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-employees'] });
      qc.invalidateQueries({ queryKey: ['hr-stats'] });
      onClose();
    },
  });

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">
            {isEdit ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>

        <div className="flex-1 space-y-4 px-6 py-5">
          {[
            { label: 'Full Name *', key: 'full_name', placeholder: 'Sarah Al-Rashidi' },
            { label: 'Email *', key: 'email', placeholder: 'sarah@utubooking.com' },
            { label: 'Phone', key: 'phone', placeholder: '+966 50 000 0000' },
            { label: 'Role / Job Title *', key: 'role', placeholder: 'Senior Engineer' },
            { label: 'Location', key: 'location', placeholder: 'Riyadh, SA' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{label}</label>
              <input type="text" placeholder={placeholder}
                value={form[key as keyof typeof form] as string} onChange={f(key as keyof typeof form)}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Department</label>
              <select value={form.department_id} onChange={f('department_id')}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
                <option value="">No department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Manager</label>
              <select value={form.manager_id} onChange={f('manager_id')}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
                <option value="">No manager</option>
                {employees.filter(e => e.id !== employee?.id && e.status !== 'terminated').map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Hire Date *</label>
              <input type="date" value={form.hire_date} onChange={f('hire_date')}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Employment Type</label>
              <select value={form.employment_type} onChange={f('employment_type')}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Salary (SAR / year) — optional</label>
            <input type="number" placeholder="120000" value={form.salary_sar} onChange={f('salary_sar')}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
        </div>

        <div className="border-t border-utu-border-default px-6 py-4">
          {saveMutation.isError && <p className="mb-3 text-xs text-red-500">Failed to save. Email may already exist.</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
              Cancel
            </button>
            <button onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.full_name || !form.email || !form.role || !form.hire_date}
              className="flex-1 rounded-lg bg-utu-blue py-2.5 text-sm font-medium text-white disabled:opacity-40">
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Leave Panel (create) ─────────────────────────────────────────────────────

function LeavePanel({ employees, onClose }: { employees: HrEmployee[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    employee_id: '', leave_type: 'annual' as LeaveType,
    start_date: '', end_date: '', reason: '',
  });

  const createMutation = useMutation({
    mutationFn: () => createHrLeave({
      employee_id: form.employee_id,
      leave_type:  form.leave_type,
      start_date:  form.start_date,
      end_date:    form.end_date,
      reason:      form.reason || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-leave'] }); onClose(); },
  });

  const days = calcDays(form.start_date, form.end_date);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">Request Leave</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>

        <div className="flex-1 space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Employee *</label>
            <select value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
              <option value="">Select employee…</option>
              {employees.filter(e => e.status !== 'terminated').map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Leave Type *</label>
            <select value={form.leave_type}
              onChange={e => setForm(f => ({ ...f, leave_type: e.target.value as LeaveType }))}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(lt => (
                <option key={lt} value={lt}>{LEAVE_TYPE_LABELS[lt]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Start Date *</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-utu-text-secondary">End Date *</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>
          </div>

          {form.start_date && form.end_date && (
            <p className="text-xs text-utu-text-muted">{days} calendar day{days !== 1 ? 's' : ''}</p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Reason (optional)</label>
            <input type="text" placeholder="Brief reason…" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
          </div>
        </div>

        <div className="border-t border-utu-border-default px-6 py-4">
          {createMutation.isError && <p className="mb-3 text-xs text-red-500">Failed to create leave request.</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
              Cancel
            </button>
            <button onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.employee_id || !form.start_date || !form.end_date}
              className="flex-1 rounded-lg bg-utu-blue py-2.5 text-sm font-medium text-white disabled:opacity-40">
              {createMutation.isPending ? 'Saving…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-stats'],
    queryFn:  getHrStats,
    staleTime: 60_000,
  });

  const { data: balData, isLoading: balLoading } = useQuery({
    queryKey: ['hr-leave-balances-overview', year],
    queryFn:  () => getLeaveBalancesOverview(year),
    staleTime: 120_000,
  });
  const balRows: HrLeaveBalanceOverviewRow[] = balData?.data ?? [];

  const seedMutation = useMutation({
    mutationFn: () => seedLeaveBalances(year),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['hr-leave-balances-overview'] }),
  });

  const s: HrStats | undefined = data?.data;

  if (isLoading) return <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>;
  if (isError || !s) return <div className="py-16 text-center text-sm text-red-500">Failed to load headcount data.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total Staff"     value={s.total}         accent="blue" />
        <KpiCard label="Active"          value={s.active}        accent="green" />
        <KpiCard label="On Leave"        value={s.on_leave}      accent="amber" />
        <KpiCard label="Contractors"     value={s.contractors} />
        <KpiCard label="Interns"         value={s.interns} />
        <KpiCard label="New Hires (30d)" value={s.new_hires_30d} accent="blue" />
      </div>

      {s.by_department.length > 0 && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-utu-text-primary">Headcount by Department</h2>
          <DeptChart data={s.by_department} />
        </div>
      )}

      {/* Leave Balances Overview */}
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-utu-text-primary">Leave Balances Overview</h2>
          <div className="ms-auto flex items-center gap-2">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="rounded-lg bg-utu-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
              {seedMutation.isPending ? 'Seeding…' : 'Seed Year Defaults'}
            </button>
          </div>
        </div>
        {seedMutation.isSuccess && seedMutation.data?.data && (
          <p className="mb-3 text-xs text-green-600">
            Seeded {seedMutation.data.data.seeded} balance row(s) for {seedMutation.data.data.employees} employee(s).
          </p>
        )}
        {balLoading ? (
          <div className="py-8 text-center text-sm text-utu-text-muted">Loading…</div>
        ) : balRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-utu-text-muted">
            No balances for {year}. Click Seed Year Defaults to initialise.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Employee', 'Department', 'Annual Rem.', 'Sick Rem.', 'Maternity Rem.', 'Paternity Rem.'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {balRows.map(r => (
                  <tr key={r.employee_id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-medium text-utu-text-primary">{r.full_name}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{r.department_name ?? '—'}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${r.annual_remaining < 5 ? 'text-amber-600' : 'text-utu-text-primary'}`}>
                      {r.annual_remaining}d
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{r.sick_remaining}d</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{r.maternity_remaining}d</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{r.paternity_remaining}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = 'full_name,email,role,hire_date,employment_type,department_name,phone,location,salary_sar';
const VALID_EMP_TYPES = ['full_time', 'part_time', 'contractor', 'intern'];

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE_HEADERS + '\n'], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'employees_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseEmployeeCsv(text: string): { valid: ImportEmployeeRow[]; errors: { row: number; message: string }[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { valid: [], errors: [] };
  const start = lines[0].toLowerCase().startsWith('full_name') ? 1 : 0;
  const valid: ImportEmployeeRow[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = start; i < lines.length; i++) {
    const row = i - start + 1;
    const cols = lines[i].split(',');
    const [full_name, email, role, hire_date, employment_type, department_name, phone, location, salary_sar] = cols.map(c => c.trim());
    if (!full_name)                             { errors.push({ row, message: 'Missing full_name' }); continue; }
    if (!email || !email.includes('@'))         { errors.push({ row, message: 'Invalid email' }); continue; }
    if (!role)                                  { errors.push({ row, message: 'Missing role' }); continue; }
    if (!hire_date || isNaN(Date.parse(hire_date))) { errors.push({ row, message: 'Invalid hire_date (use YYYY-MM-DD)' }); continue; }
    if (!VALID_EMP_TYPES.includes(employment_type)) { errors.push({ row, message: `Invalid employment_type: ${employment_type}` }); continue; }
    valid.push({
      full_name, email, role, hire_date,
      employment_type: employment_type as EmploymentType,
      department_name: department_name || undefined,
      phone:           phone           || undefined,
      location:        location        || undefined,
      salary_sar:      salary_sar      ? parseFloat(salary_sar) : undefined,
    });
  }
  return { valid, errors };
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep]     = useState<1 | 2 | 3>(1);
  const [parsed, setParsed] = useState<{ valid: ImportEmployeeRow[]; errors: { row: number; message: string }[] }>({ valid: [], errors: [] });
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: () => importEmployees(parsed.valid),
    onSuccess:  (res) => {
      setResult((res as { data?: ImportResult }).data ?? (res as ImportResult));
      setStep(3);
      qc.invalidateQueries({ queryKey: ['hr-employees'] });
      qc.invalidateQueries({ queryKey: ['hr-stats'] });
    },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setParsed(parseEmployeeCsv(text));
      setStep(2);
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-utu-bg-card shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">
            {step === 1 ? 'Import Employees — Upload CSV' : step === 2 ? 'Preview' : 'Result'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-utu-text-secondary">
                Upload a CSV file with one employee per row. Columns must not contain commas.
              </p>
              <button onClick={downloadCsvTemplate} className="text-sm text-utu-blue underline">
                Download CSV Template
              </button>
              <div>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">Select CSV file *</label>
                <input type="file" accept=".csv,text/csv" onChange={handleFile}
                  className="block w-full text-sm text-utu-text-secondary file:me-3 file:rounded-lg file:border-0 file:bg-utu-blue file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">{parsed.valid.length} valid rows</span>
                <span className="text-red-500 font-medium">{parsed.errors.length} invalid rows</span>
              </div>
              {parsed.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
                  {parsed.errors.map(err => (
                    <p key={err.row} className="text-xs text-red-600">Row {err.row}: {err.message}</p>
                  ))}
                </div>
              )}
              {parsed.valid.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-utu-border-default">
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-xs">
                    <thead className="bg-utu-bg-muted">
                      <tr>
                        {['Name', 'Email', 'Role', 'Hire Date', 'Type', 'Department'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-utu-text-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {parsed.valid.map((r, i) => (
                        <tr key={i} className="bg-green-50/50">
                          <td className="px-3 py-2 text-utu-text-primary">{r.full_name}</td>
                          <td className="px-3 py-2 text-utu-text-secondary">{r.email}</td>
                          <td className="px-3 py-2 text-utu-text-secondary">{r.role}</td>
                          <td className="px-3 py-2 text-utu-text-secondary">{r.hire_date}</td>
                          <td className="px-3 py-2 text-utu-text-secondary">{r.employment_type}</td>
                          <td className="px-3 py-2 text-utu-text-secondary">{r.department_name ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {parsed.valid.length === 0 && (
                <p className="text-sm text-utu-text-muted">No valid rows to import after validation.</p>
              )}
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-4">
              <div className="flex gap-6 text-sm">
                <span className="text-green-600 font-medium">{result.success} imported</span>
                <span className="text-red-500 font-medium">{result.failed} failed</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">Row {err.row}: {err.field} — {err.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-utu-border-default px-6 py-4 flex gap-3 justify-end">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
              Back
            </button>
          )}
          {step === 2 && parsed.valid.length > 0 && (
            <button onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              {importMutation.isPending ? 'Importing…' : `Import ${parsed.valid.length} Employee${parsed.valid.length !== 1 ? 's' : ''}`}
            </button>
          )}
          {(step === 1 || step === 3) && (
            <button onClick={onClose}
              className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white">
              {step === 3 ? 'Done' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Employees ───────────────────────────────────────────────────────────

function EmployeesTab() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [dept, setDept]       = useState('');
  const [status, setStatus]   = useState('active');
  const [page, setPage]       = useState(1);
  const [panel, setPanel]     = useState<HrEmployee | 'new' | null>(null);
  const [showImport, setImport] = useState(false);

  const { data: deptData } = useQuery({ queryKey: ['hr-departments'], queryFn: getHrDepartments });
  const departments = deptData?.data ?? [];

  const { data: allEmpData } = useQuery({
    queryKey: ['hr-employees-all'],
    queryFn: () => getHrEmployees({ limit: 500 }),
  });
  const allEmployees = allEmpData?.data ?? [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-employees', search, dept, status, page],
    queryFn:  () => getHrEmployees({ search: search || undefined, department_id: dept || undefined, status: status || undefined, page }),
    staleTime: 30_000,
  });

  const employees = data?.data ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / 50);

  const terminateMutation = useMutation({
    mutationFn: (id: string) => deleteHrEmployee(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['hr-employees'] });
      qc.invalidateQueries({ queryKey: ['hr-employees-all'] });
      qc.invalidateQueries({ queryKey: ['hr-stats'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search name or email…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-56 rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <select value={dept} onChange={e => { setDept(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="terminated">Terminated</option>
        </select>
        <div className="ms-auto flex gap-2">
          <button onClick={() => setImport(true)}
            className="rounded-lg border border-utu-border-default px-4 py-2 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
            Import CSV
          </button>
          <button onClick={() => setPanel('new')}
            className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white">
            Add Employee
          </button>
        </div>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-12 text-center text-sm text-red-500">Failed to load employees.</div>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Employee', 'Role', 'Department', 'Location', 'Hire Date', 'Type', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {employees.map(e => (
                  <tr key={e.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3">
                      <div className="font-medium text-utu-text-primary">{e.full_name}</div>
                      <div className="text-xs text-utu-text-muted">{e.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{e.role}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{e.department_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{e.location ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary whitespace-nowrap">{fmtDate(e.hire_date)}</td>
                    <td className="px-4 py-3">
                      <Badge label={e.employment_type} color={TYPE_COLORS[e.employment_type]} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={e.status} color={STATUS_COLORS[e.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setPanel(e)}
                          className="rounded border border-utu-border-default px-2 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                          Edit
                        </button>
                        {e.status !== 'terminated' && (
                          <button
                            onClick={() => { if (confirm(`Terminate ${e.full_name}?`)) terminateMutation.mutate(e.id); }}
                            disabled={terminateMutation.isPending}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                            Terminate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-sm text-utu-text-muted">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-utu-text-muted">Page {page} of {pages} ({total} total)</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
                  Previous
                </button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {panel !== null && (
        <EmployeePanel
          employee={panel === 'new' ? null : panel}
          departments={departments}
          employees={allEmployees}
          onClose={() => setPanel(null)}
        />
      )}
      {showImport && <ImportModal onClose={() => setImport(false)} />}
    </div>
  );
}

// ─── Tab: Leave Requests ──────────────────────────────────────────────────────

function LeaveTab() {
  const qc = useQueryClient();
  const [status, setStatus]   = useState('pending');
  const [month, setMonth]     = useState('');
  const [page, setPage]       = useState(1);
  const [showPanel, setPanel] = useState(false);
  const year = new Date().getFullYear();

  const { data: allEmpData } = useQuery({
    queryKey: ['hr-employees-all'],
    queryFn:  () => getHrEmployees({ limit: 500 }),
  });
  const allEmployees = allEmpData?.data ?? [];

  const { data: balData } = useQuery({
    queryKey: ['hr-leave-balances-overview', year],
    queryFn:  () => getLeaveBalancesOverview(year),
    staleTime: 300_000,
  });
  const balMap = new Map<string, number>(
    (balData?.data ?? []).map((r: HrLeaveBalanceOverviewRow) => [r.employee_id, r.annual_remaining])
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-leave', status, month, page],
    queryFn:  () => getHrLeave({ status: status || 'all', month: month || undefined, page }),
    staleTime: 30_000,
  });

  const leaves = data?.data ?? [];
  const total  = data?.total ?? 0;
  const pages  = Math.ceil(total / 50);

  const updateMutation = useMutation({
    mutationFn: ({ id, status: s, reviewed_by }: { id: string; status: LeaveStatus; reviewed_by?: string }) =>
      updateHrLeave(id, { status: s, reviewed_by }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-leave'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}
          className="rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <div className="ms-auto">
          <button onClick={() => setPanel(true)}
            className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white">
            Request Leave
          </button>
        </div>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-12 text-center text-sm text-red-500">Failed to load leave requests.</div>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Employee', 'Type', 'Period', 'Days', 'Bal.', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {leaves.map(lr => (
                  <tr key={lr.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-medium text-utu-text-primary">{lr.employee_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={LEAVE_TYPE_LABELS[lr.leave_type]} color="bg-utu-bg-subtle text-utu-text-secondary border-utu-border-default" />
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary whitespace-nowrap">
                      {fmtDateRange(lr.start_date, lr.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">{lr.days}</td>
                    <td className="px-4 py-3 text-sm text-utu-text-secondary">
                      {lr.leave_type === 'annual'
                        ? (balMap.get(lr.employee_id) != null ? `${balMap.get(lr.employee_id)}d` : '—')
                        : '—'}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-utu-text-muted">{lr.reason ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={lr.status} color={LEAVE_STATUS_COLORS[lr.status]} />
                    </td>
                    <td className="px-4 py-3">
                      {lr.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateMutation.mutate({ id: lr.id, status: 'approved', reviewed_by: 'Admin' })}
                            disabled={updateMutation.isPending}
                            className="rounded border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50 disabled:opacity-40">
                            Approve
                          </button>
                          <button
                            onClick={() => updateMutation.mutate({ id: lr.id, status: 'rejected', reviewed_by: 'Admin' })}
                            disabled={updateMutation.isPending}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-sm text-utu-text-muted">No leave requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-utu-text-muted">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
                  Previous
                </button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showPanel && (
        <LeavePanel employees={allEmployees} onClose={() => setPanel(false)} />
      )}
    </div>
  );
}

// ─── Tab: Departments ─────────────────────────────────────────────────────────

function DepartmentsTab() {
  const qc = useQueryClient();
  const [newName, setNewName]   = useState('');
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-departments'],
    queryFn:  getHrDepartments,
    staleTime: 60_000,
  });
  const departments = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => createHrDepartment(newName.trim()),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['hr-departments'] }); setNewName(''); },
  });

  const renameMutation = useMutation({
    mutationFn: () => updateHrDepartment(editId!, editName.trim()),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['hr-departments'] }); setEditId(null); setEditName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHrDepartment(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['hr-departments'] });
      qc.invalidateQueries({ queryKey: ['hr-stats'] });
    },
  });

  return (
    <div className="space-y-5">
      {/* New department inline form */}
      <div className="flex gap-3">
        <input type="text" placeholder="New department name…" value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(); }}
          className="w-64 rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
        <button onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !newName.trim()}
          className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {createMutation.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>
      {createMutation.isError && <p className="text-xs text-red-500">Failed to create — name may already exist.</p>}

      {isLoading && <div className="py-8 text-center text-sm text-utu-text-muted">Loading…</div>}
      {isError   && <div className="py-8 text-center text-sm text-red-500">Failed to load departments.</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map(d => (
          <div key={d.id} className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-3">
            {editId === d.id ? (
              <div className="flex gap-2">
                <input type="text" value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && editName.trim()) renameMutation.mutate(); if (e.key === 'Escape') setEditId(null); }}
                  autoFocus
                  className="flex-1 rounded-lg border border-utu-border-default px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
                <button onClick={() => renameMutation.mutate()}
                  disabled={renameMutation.isPending || !editName.trim()}
                  className="rounded-lg bg-utu-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">
                  Save
                </button>
                <button onClick={() => setEditId(null)}
                  className="rounded-lg border border-utu-border-default px-3 py-1.5 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-utu-text-primary">{d.name}</p>
                <p className="text-xs text-utu-text-muted mt-0.5">
                  {d.employee_count} active employee{d.employee_count !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {editId !== d.id && (
                <button onClick={() => { setEditId(d.id); setEditName(d.name); }}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                  Rename
                </button>
              )}
              <button
                onClick={() => {
                  if (d.employee_count > 0) { alert(`Cannot delete "${d.name}" — it has ${d.employee_count} active employee(s). Reassign or terminate them first.`); return; }
                  if (confirm(`Delete department "${d.name}"?`)) deleteMutation.mutate(d.id);
                }}
                disabled={deleteMutation.isPending}
                className="ms-auto rounded border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                Delete
              </button>
            </div>
          </div>
        ))}
        {departments.length === 0 && !isLoading && (
          <div className="col-span-3 rounded-xl border border-utu-border-default bg-utu-bg-card p-8 text-center text-utu-text-muted">
            No departments yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Org Chart helpers ────────────────────────────────────────────────────────

type OrgTreeNode = OrgChartNode & { children: OrgTreeNode[] };

function buildOrgTree(rows: OrgChartNode[]): OrgTreeNode[] {
  const map = new Map<string, OrgTreeNode>();
  rows.forEach(r => map.set(r.id, { ...r, children: [] }));
  const roots: OrgTreeNode[] = [];
  map.forEach(node => {
    if (node.manager_id && map.has(node.manager_id)) {
      map.get(node.manager_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const DEPT_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
];

function deptColor(name?: string): string {
  if (!name) return 'bg-utu-bg-muted text-utu-text-muted';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return DEPT_COLORS[Math.abs(hash) % DEPT_COLORS.length];
}

function OrgNodeCard({
  node,
  onSelect,
}: {
  node: OrgTreeNode;
  onSelect: (node: OrgTreeNode) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const initials = node.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect(node)}
        className="w-44 cursor-pointer rounded-xl border border-utu-border-default bg-utu-bg-card p-3 shadow-sm hover:border-utu-blue hover:shadow-md transition-all space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-utu-blue text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-utu-text-primary">{node.full_name}</p>
            <p className="truncate text-xs text-utu-text-muted">{node.role}</p>
          </div>
        </div>
        {node.department_name && (
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${deptColor(node.department_name)}`}>
            {node.department_name}
          </span>
        )}
      </div>

      {node.children.length > 0 && (
        <button
          onClick={() => setCollapsed(c => !c)}
          className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-utu-border-default bg-utu-bg-card text-xs text-utu-text-muted hover:bg-utu-bg-muted">
          {collapsed ? '+' : '−'}
        </button>
      )}

      {!collapsed && node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-utu-border-default" />
          <div className="flex gap-6">
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-4 bg-utu-border-default" />
                <OrgNodeCard node={child} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Org Chart ───────────────────────────────────────────────────────────

function OrgChartTab() {
  const [selectedEmployee, setSelected] = useState<HrEmployee | null>(null);

  const { data: orgData, isLoading, isError } = useQuery({
    queryKey: ['hr-org-chart'],
    queryFn:  getOrgChart,
    staleTime: 300_000,
  });
  const nodes: OrgChartNode[] = orgData?.data ?? [];
  const roots = buildOrgTree(nodes);

  const { data: allEmpData } = useQuery({
    queryKey: ['hr-employees-all'],
    queryFn:  () => getHrEmployees({ limit: 500 }),
  });
  const allEmployees: HrEmployee[] = allEmpData?.data ?? [];

  const { data: deptData } = useQuery({ queryKey: ['hr-departments'], queryFn: getHrDepartments });
  const departments: HrDepartment[] = deptData?.data ?? [];

  function handleSelect(node: OrgTreeNode) {
    const emp = allEmployees.find(e => e.id === node.id) ?? null;
    setSelected(emp);
  }

  if (isLoading) return <div className="py-16 text-center text-sm text-utu-text-muted">Loading…</div>;
  if (isError)   return <div className="py-16 text-center text-sm text-red-500">Failed to load org chart.</div>;

  if (roots.length === 0) {
    return (
      <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-12 text-center">
        <p className="text-sm text-utu-text-muted">Assign managers in the Employees tab to build the org chart.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-utu-border-default bg-utu-bg-card p-8">
        <div className="min-w-max flex gap-12 justify-center">
          {roots.map(root => (
            <OrgNodeCard key={root.id} node={root} onSelect={handleSelect} />
          ))}
        </div>
      </div>

      {selectedEmployee && (
        <EmployeePanel
          employee={selectedEmployee}
          departments={departments}
          employees={allEmployees}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── AI Performance Modal ─────────────────────────────────────────────────────

const HEALTH_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700 border-green-200',
  good:      'bg-blue-50  text-blue-700  border-blue-200',
  fair:      'bg-amber-100 text-amber-700 border-amber-200',
  poor:      'bg-red-100  text-red-600   border-red-200',
};

function AIPerformanceModal({
  dept,
  onClose,
}: {
  dept: HrDepartment;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPerformanceAnalysis(dept.id)
      .then(r => { if (!cancelled) { setAnalysis(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dept.id]);

  async function handleAnalyze() {
    setRunning(true);
    setError('');
    try {
      const res = await analyzePerformance(dept.id);
      if (res.data) setAnalysis(res.data);
      else setError('Analysis failed. Please try again.');
    } catch {
      setError('Failed to run analysis. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-violet-600">✦</span>
              <h2 className="text-base font-bold text-utu-text-primary">AI Performance Analysis</h2>
            </div>
            <p className="mt-0.5 text-xs text-utu-text-muted">{dept.name}</p>
          </div>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary text-lg">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading && (
            <p className="text-xs text-utu-text-muted italic py-8 text-center">Loading analysis…</p>
          )}

          {!loading && !analysis && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-utu-text-secondary">
                No analysis yet. Run AI Performance Analysis to get team health, top performers, development needs, and manager recommendations.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={running}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Analysing…' : '✦ Analyse Department'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Overall health + meta */}
              <div className="flex flex-wrap items-start gap-3">
                <div className={`rounded-xl border px-4 py-3 ${HEALTH_COLORS[analysis.overall_health] ?? 'bg-utu-bg-muted border-utu-border-default'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Team Health</p>
                  <p className="mt-0.5 text-lg font-bold capitalize">{analysis.overall_health}</p>
                </div>
                <div className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-3">
                  <p className="text-xs text-utu-text-muted">Period</p>
                  <p className="mt-0.5 text-sm font-semibold text-utu-text-primary">{analysis.review_period}</p>
                </div>
                <div className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-3">
                  <p className="text-xs text-utu-text-muted">Reviewed</p>
                  <p className="mt-0.5 text-sm font-semibold text-utu-text-primary">{analysis.total_reviewed} employees</p>
                </div>
              </div>

              {/* Team summary */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-1">Summary</h3>
                <p className="text-sm text-utu-text-secondary leading-relaxed">{analysis.team_summary}</p>
              </div>

              {/* Top performers */}
              {analysis.top_performers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Top Performers</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.top_performers.map((p, i) => (
                      <div key={i} className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <p className="text-xs font-semibold text-green-800">{p.name}</p>
                        <p className="text-xs text-green-600">{p.role} · Rating {p.rating}/5</p>
                        <p className="text-xs text-green-700 mt-0.5 italic">{p.highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Development needs */}
              {analysis.development_needs.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Development Needs</h3>
                  <div className="space-y-2">
                    {analysis.development_needs.map((d, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${d.pip_recommended ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-semibold ${d.pip_recommended ? 'text-red-800' : 'text-amber-800'}`}>{d.name}</p>
                          {d.pip_recommended && (
                            <span className="rounded bg-red-200 px-1.5 py-0.5 text-xs font-medium text-red-700">PIP Recommended</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${d.pip_recommended ? 'text-red-600' : 'text-amber-700'}`}>{d.focus_area}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team strengths */}
              {analysis.team_strengths.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Team Strengths</h3>
                  <ul className="space-y-1">
                    {analysis.team_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary">
                        <span className="mt-0.5 text-green-500">●</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Development priorities */}
              {analysis.development_priorities.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Development Priorities</h3>
                  <ul className="space-y-1">
                    {analysis.development_priorities.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary">
                        <span className="mt-0.5 text-amber-500">●</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Manager recommendations */}
              {analysis.manager_recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Manager Recommendations</h3>
                  <ul className="space-y-1">
                    {analysis.manager_recommendations.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-utu-text-secondary">
                        <span className="mt-0.5 text-violet-400">▸</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk flags */}
              {analysis.risk_flags.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <h3 className="text-xs font-semibold text-red-700 mb-2">Risk Flags</h3>
                  <ul className="space-y-1">
                    {analysis.risk_flags.map((f, i) => (
                      <li key={i} className="text-xs text-red-600">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-utu-border-default">
                <p className="text-xs text-utu-text-muted">
                  Generated {new Date(analysis.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={running}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Re-analysing…' : 'Re-analyse'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

function PerformanceTab() {
  const [activeDept, setActiveDept] = useState<HrDepartment | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-departments'],
    queryFn:  getHrDepartments,
    staleTime: 60_000,
  });

  const departments: HrDepartment[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-utu-text-primary">Performance Reviews</h2>
          <p className="text-xs text-utu-text-muted mt-0.5">AI-powered performance analysis per department. Select a department to view team health, top performers, and development needs.</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-utu-text-muted py-12 text-center">Loading departments…</p>}
      {isError   && <p className="text-sm text-red-500 py-12 text-center">Failed to load departments.</p>}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-utu-border-default bg-white">
          <table className="w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Department', 'Employees', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {departments.map(d => (
                <tr key={d.id} className="hover:bg-utu-bg-muted">
                  <td className="px-5 py-3 font-medium text-utu-text-primary">{d.name}</td>
                  <td className="px-5 py-3 text-xs text-utu-text-secondary">{d.employee_count}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setActiveDept(d)}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      <span>✦</span> Analyse Department
                    </button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={3} className="py-12 text-center text-sm text-utu-text-muted">No departments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeDept && (
        <AIPerformanceModal dept={activeDept} onClose={() => setActiveDept(null)} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Employees', 'Leave Requests', 'Departments', 'Org Chart', 'Performance'] as const;
type Tab = typeof TABS[number];

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">HR Department</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Employee directory, leave management, org chart, and headcount tracking.
        </p>
      </div>

      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard'      && <DashboardTab />}
      {activeTab === 'Employees'      && <EmployeesTab />}
      {activeTab === 'Leave Requests' && <LeaveTab />}
      {activeTab === 'Departments'    && <DepartmentsTab />}
      {activeTab === 'Org Chart'      && <OrgChartTab />}
      {activeTab === 'Performance'    && <PerformanceTab />}
    </div>
  );
}
