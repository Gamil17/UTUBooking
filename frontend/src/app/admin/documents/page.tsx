'use client';

/**
 * /admin/documents — AI Document Generator
 *
 * Generates professional business documents using Claude claude-sonnet-4-6.
 * Supports 8 document types across HR, Finance, Sales, Legal, and Procurement.
 *
 * UI flow:
 *   1. Type selection grid (8 document type cards)
 *   2. Dynamic context form (type-specific fields)
 *   3. "Generate Document" → full-page preview with copy/download
 *   4. History tab: recently generated documents
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  UserCheck,
  XCircle,
  Mail,
  UserPlus,
  TrendingUp,
  Shield,
  ShoppingCart,
  Sparkles,
  Loader2,
  Copy,
  Download,
  ChevronLeft,
  Clock,
  CheckCircle,
  History,
  AlertTriangle,
} from 'lucide-react';
import {
  generateAiDocument,
  listAiDocuments,
  type AiDocumentType,
  type AiDocument,
} from '@/lib/api';

// ── Field & type definitions ──────────────────────────────────────────────────

interface FieldDef {
  key:          string;
  label:        string;
  type:         'text' | 'textarea' | 'number' | 'date' | 'select';
  placeholder?: string;
  options?:     string[];
  required?:    boolean;
  wide?:        boolean; // spans full width
}

interface DocTypeDef {
  type:        AiDocumentType;
  label:       string;
  description: string;
  department:  string;
  Icon:        React.ComponentType<{ size?: number; className?: string }>;
  iconColor:   string;
  fields:      FieldDef[];
}

const DOC_TYPES: DocTypeDef[] = [
  {
    type:        'offer_letter',
    label:       'Offer Letter',
    description: 'Formal employment offer for a new hire',
    department:  'HR',
    Icon:        UserCheck,
    iconColor:   'text-emerald-600',
    fields: [
      { key: 'candidate_name',     label: 'Candidate Name',     type: 'text',   required: true },
      { key: 'role',               label: 'Job Title / Role',   type: 'text',   required: true },
      { key: 'department',         label: 'Department',         type: 'text',   required: true },
      { key: 'employment_type',    label: 'Employment Type',    type: 'select', required: true,
        options: ['full_time', 'part_time', 'contractor'] },
      { key: 'salary_sar',         label: 'Monthly Salary (SAR)', type: 'number', required: true },
      { key: 'start_date',         label: 'Start Date',         type: 'date',   required: true },
      { key: 'probation_months',   label: 'Probation (months)', type: 'number', placeholder: '3' },
      { key: 'reporting_to',       label: 'Reporting To',       type: 'text' },
      { key: 'location',           label: 'Work Location',      type: 'text',   placeholder: 'Riyadh, KSA' },
      { key: 'additional_benefits',label: 'Additional Benefits',type: 'textarea', wide: true,
        placeholder: 'Medical insurance, annual flights, housing allowance...' },
    ],
  },
  {
    type:        'expense_rejection',
    label:       'Expense Rejection',
    description: 'Formal rejection notice for an expense claim',
    department:  'Finance',
    Icon:        XCircle,
    iconColor:   'text-red-500',
    fields: [
      { key: 'employee_name',   label: 'Employee Name',    type: 'text',   required: true },
      { key: 'claim_date',      label: 'Claim Date',       type: 'date',   required: true },
      { key: 'category',        label: 'Category',         type: 'select', required: true,
        options: ['travel','meals','accommodation','equipment','training','other'] },
      { key: 'amount_sar',      label: 'Amount Claimed (SAR)', type: 'number', required: true },
      { key: 'reason',          label: 'Rejection Reason', type: 'select', required: true,
        options: ['missing_receipts','over_policy_limit','not_business_related','duplicate_claim','unapproved_vendor','other'] },
      { key: 'additional_notes',label: 'Additional Notes', type: 'textarea', wide: true },
      { key: 'reviewer_name',   label: 'Reviewed By',      type: 'text',   required: true },
    ],
  },
  {
    type:        'deal_proposal_email',
    label:       'Deal Proposal Email',
    description: 'B2B partnership outreach email for a CRM deal',
    department:  'Sales',
    Icon:        Mail,
    iconColor:   'text-utu-blue',
    fields: [
      { key: 'partner_name',        label: 'Partner / Company Name', type: 'text',   required: true },
      { key: 'contact_name',        label: 'Contact Person',         type: 'text',   required: true },
      { key: 'partner_country',     label: 'Partner Country',        type: 'text',   placeholder: 'UAE' },
      { key: 'deal_type',           label: 'Deal Type',              type: 'select', required: true,
        options: ['b2b_whitelabel','hotel_partner','airline','investor','other'] },
      { key: 'proposed_value_sar',  label: 'Proposed Value (SAR)',   type: 'number' },
      { key: 'deal_owner',          label: 'Our Representative',     type: 'text',   required: true },
      { key: 'our_offering',        label: 'What We Are Offering',   type: 'textarea', wide: true, required: true },
      { key: 'key_differentiators', label: 'Key Differentiators',    type: 'textarea', wide: true,
        placeholder: 'Hajj/Umrah specialisation, Gulf-native platform, real-time inventory...' },
      { key: 'cta_date',            label: 'Suggested Meeting Date', type: 'date' },
    ],
  },
  {
    type:        'supplier_contract_summary',
    label:       'Contract Summary',
    description: 'Internal memo summarising supplier contract terms',
    department:  'Procurement',
    Icon:        FileText,
    iconColor:   'text-amber-600',
    fields: [
      { key: 'supplier_name',    label: 'Supplier Name',         type: 'text',     required: true },
      { key: 'contract_title',   label: 'Contract Title',        type: 'text',     required: true },
      { key: 'effective_date',   label: 'Effective Date',        type: 'date',     required: true },
      { key: 'expiry_date',      label: 'Expiry Date',           type: 'date',     required: true },
      { key: 'total_value_sar',  label: 'Total Value (SAR)',     type: 'number',   required: true },
      { key: 'scope_of_work',    label: 'Scope of Work',         type: 'textarea', wide: true, required: true },
      { key: 'key_obligations',  label: 'Key Obligations',       type: 'textarea', wide: true },
      { key: 'termination_clause',label: 'Termination Clause',   type: 'text',
        placeholder: 'Standard 30-day written notice' },
    ],
  },
  {
    type:        'welcome_email',
    label:       'Welcome Email',
    description: 'Onboarding welcome email for a new employee',
    department:  'HR',
    Icon:        UserPlus,
    iconColor:   'text-emerald-600',
    fields: [
      { key: 'employee_name',       label: 'Employee Name',         type: 'text', required: true },
      { key: 'role',                label: 'Role / Job Title',      type: 'text', required: true },
      { key: 'department',          label: 'Department',            type: 'text', required: true },
      { key: 'start_date',          label: 'Start Date',            type: 'date', required: true },
      { key: 'manager_name',        label: 'Manager Name',          type: 'text', required: true },
      { key: 'office_location',     label: 'Office Location',       type: 'text', placeholder: 'Riyadh HQ' },
      { key: 'first_day_instructions', label: 'First Day Instructions', type: 'textarea', wide: true,
        placeholder: 'Report to reception at 09:00, ask for [name]...' },
    ],
  },
  {
    type:        'performance_improvement_plan',
    label:       'Performance Improvement Plan',
    description: 'Formal PIP document for underperforming employees',
    department:  'HR',
    Icon:        TrendingUp,
    iconColor:   'text-orange-500',
    fields: [
      { key: 'employee_name',   label: 'Employee Name',        type: 'text',     required: true },
      { key: 'role',            label: 'Role',                 type: 'text',     required: true },
      { key: 'department',      label: 'Department',           type: 'text',     required: true },
      { key: 'manager_name',    label: 'Manager Name',         type: 'text',     required: true },
      { key: 'concern_areas',   label: 'Areas of Concern',     type: 'textarea', wide: true, required: true },
      { key: 'improvement_goals',label:'Improvement Goals',    type: 'textarea', wide: true, required: true },
      { key: 'support_provided',label: 'Company Support Provided', type: 'textarea', wide: true,
        placeholder: 'Coaching sessions, training courses, mentor assignment...' },
      { key: 'review_date',     label: 'Review Date',          type: 'date',     required: true },
      { key: 'consequence',     label: 'Consequence of Non-Improvement', type: 'text',
        placeholder: 'Further disciplinary action up to and including termination' },
    ],
  },
  {
    type:        'nda_draft',
    label:       'NDA Draft',
    description: 'Non-disclosure agreement for a named counterparty',
    department:  'Legal',
    Icon:        Shield,
    iconColor:   'text-violet-600',
    fields: [
      { key: 'counterparty_name',       label: 'Counterparty Name',     type: 'text',   required: true },
      { key: 'counterparty_type',       label: 'Counterparty Type',     type: 'select', required: true,
        options: ['company', 'individual'] },
      { key: 'purpose',                 label: 'Purpose of Disclosure', type: 'textarea', wide: true, required: true,
        placeholder: 'Partnership discussions regarding white-label travel platform...' },
      { key: 'duration_years',          label: 'Confidentiality Period (years)', type: 'number', required: true },
      { key: 'governing_jurisdiction',  label: 'Governing Jurisdiction', type: 'text',
        placeholder: 'Kingdom of Saudi Arabia' },
    ],
  },
  {
    type:        'po_justification',
    label:       'PO Justification Memo',
    description: 'Purchase order justification memo for management approval',
    department:  'Procurement',
    Icon:        ShoppingCart,
    iconColor:   'text-amber-600',
    fields: [
      { key: 'item_or_service',          label: 'Item or Service',       type: 'text',     required: true },
      { key: 'supplier_name',            label: 'Proposed Supplier',     type: 'text',     required: true },
      { key: 'amount_sar',               label: 'Amount (SAR)',          type: 'number',   required: true },
      { key: 'department',               label: 'Requesting Department', type: 'text',     required: true },
      { key: 'business_justification',   label: 'Business Justification',type: 'textarea', wide: true, required: true },
      { key: 'alternatives_considered',  label: 'Alternatives Considered', type: 'textarea', wide: true,
        placeholder: 'None — sole source, or: Evaluated X and Y but rejected because...' },
      { key: 'requested_by',             label: 'Requested By',          type: 'text',     required: true },
      { key: 'required_by_date',         label: 'Required By',           type: 'date' },
    ],
  },
];

// ── Safe Markdown renderer ────────────────────────────────────────────────────

function DocContent({ md }: { md: string }) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length) {
      elements.push(<ul key={key++} className="mb-3 space-y-1 ps-5">{listItems}</ul>);
      listItems = [];
    }
  }

  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} className="font-semibold text-utu-text-primary">{p.slice(2, -2)}</strong>
        : p,
    );
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={key++} className="mb-3 mt-1 text-xl font-bold text-utu-text-primary border-b border-utu-border-default pb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={key++} className="mb-2 mt-5 text-sm font-semibold text-utu-blue uppercase tracking-wide">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={key++} className="mb-1 mt-3 text-sm font-semibold text-utu-text-primary">{line.slice(4)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(<li key={key++} className="text-sm text-utu-text-secondary leading-relaxed list-disc">{renderInline(line.slice(2))}</li>);
    } else if (line === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="mb-2 text-sm text-utu-text-secondary leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return <div>{elements}</div>;
}

// ── Form component ────────────────────────────────────────────────────────────

function DocForm({
  def,
  values,
  onChange,
}: {
  def: DocTypeDef;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const inputBase = [
    'w-full rounded-lg border border-utu-border-default bg-utu-bg-page',
    'px-3 py-2 text-sm text-utu-text-primary',
    'placeholder:text-utu-text-muted',
    'focus:border-utu-blue focus:outline-none focus:ring-1 focus:ring-utu-blue',
  ].join(' ');

  return (
    <div className="grid grid-cols-2 gap-4">
      {def.fields.map(f => (
        <div key={f.key} className={f.wide || f.type === 'textarea' ? 'col-span-2' : 'col-span-1'}>
          <label className="mb-1 block text-xs font-medium text-utu-text-secondary">
            {f.label}
            {f.required && <span className="ms-0.5 text-red-500">*</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              rows={3}
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={`${inputBase} resize-y`}
            />
          ) : f.type === 'select' ? (
            <select
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              className={inputBase}
            >
              <option value="">Select...</option>
              {f.options?.map(o => (
                <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type}
              value={values[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={inputBase}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ViewState = 'select' | 'form' | 'preview';

export default function DocumentsPage() {
  const [view,       setView]       = useState<ViewState>('select');
  const [activeType, setActiveType] = useState<DocTypeDef | null>(null);
  const [fields,     setFields]     = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState<AiDocument | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [tab,        setTab]        = useState<'generator' | 'history'>('generator');
  const [history,    setHistory]    = useState<AiDocument[]>([]);
  const [histLoading,setHistLoading]= useState(false);
  const [copied,     setCopied]     = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await listAiDocuments(20, 0);
      setHistory(res.data ?? []);
    } catch { /* ignore */ }
    finally { setHistLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  const selectType = (def: DocTypeDef) => {
    setActiveType(def);
    setFields({});
    setGenerated(null);
    setError(null);
    setView('form');
  };

  const handleGenerate = async () => {
    if (!activeType) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generateAiDocument(activeType.type, fields);
      if (res?.data) {
        setGenerated(res.data);
        setView('preview');
      } else {
        setError((res as { message?: string })?.message ?? 'Generation failed');
      }
    } catch {
      setError('Failed to generate document. Check that the AI service is running.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated.content_md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!generated) return;
    const blob = new Blob([generated.content_md], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${generated.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DEPT_COLORS: Record<string, string> = {
    HR:          'bg-emerald-100 text-emerald-700',
    Finance:     'bg-red-100 text-red-700',
    Sales:       'bg-blue-100 text-blue-700',
    Procurement: 'bg-amber-100 text-amber-700',
    Legal:       'bg-violet-100 text-violet-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-utu-text-primary">
            <Sparkles className="text-utu-blue" size={24} />
            AI Document Generator
          </h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Generate professional business documents using Claude
          </p>
        </div>
        {/* Tabs */}
        <div className="flex rounded-lg border border-utu-border-default bg-utu-bg-muted p-1">
          {(['generator', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                tab === t
                  ? 'bg-utu-bg-card text-utu-text-primary shadow-sm'
                  : 'text-utu-text-muted hover:text-utu-text-primary',
              ].join(' ')}
            >
              {t === 'history' ? <span className="flex items-center gap-1"><History size={13} />History</span> : 'Generator'}
            </button>
          ))}
        </div>
      </div>

      {/* ── GENERATOR TAB ─────────────────────────────────────────────────── */}
      {tab === 'generator' && (
        <>
          {/* Type selection grid */}
          {view === 'select' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {DOC_TYPES.map(def => (
                <button
                  key={def.type}
                  onClick={() => selectType(def)}
                  className={[
                    'flex flex-col items-start gap-3 rounded-utu-card border border-utu-border-default',
                    'bg-utu-bg-card p-4 text-start transition-all',
                    'hover:border-utu-blue hover:shadow-md hover:-translate-y-0.5',
                  ].join(' ')}
                >
                  <def.Icon size={22} className={def.iconColor} />
                  <div>
                    <p className="text-sm font-semibold text-utu-text-primary">{def.label}</p>
                    <p className="mt-0.5 text-xs text-utu-text-muted leading-snug">{def.description}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DEPT_COLORS[def.department] ?? ''}`}>
                    {def.department}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Form view */}
          {view === 'form' && activeType && (
            <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6">
              {/* Form header */}
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={() => setView('select')}
                  className="rounded p-1 text-utu-text-muted hover:text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <activeType.Icon size={20} className={activeType.iconColor} />
                <div>
                  <h2 className="text-base font-semibold text-utu-text-primary">{activeType.label}</h2>
                  <p className="text-xs text-utu-text-muted">{activeType.description}</p>
                </div>
              </div>

              <DocForm
                def={activeType}
                values={fields}
                onChange={(k, v) => setFields(prev => ({ ...prev, [k]: v }))}
              />

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={15} />
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={[
                    'flex items-center gap-2 rounded-lg px-5 py-2.5',
                    'bg-utu-blue text-white text-sm font-medium',
                    'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                  ].join(' ')}
                >
                  {generating
                    ? <><Loader2 size={15} className="animate-spin" />Generating...</>
                    : <><Sparkles size={15} />Generate Document</>}
                </button>
                <p className="text-xs text-utu-text-muted">Takes 5-15 seconds</p>
              </div>
            </div>
          )}

          {/* Preview view */}
          {view === 'preview' && generated && activeType && (
            <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card">
              {/* Preview toolbar */}
              <div className="flex items-center justify-between border-b border-utu-border-default px-5 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setView('form')}
                    className="rounded p-1 text-utu-text-muted hover:text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-utu-text-primary">{generated.title}</p>
                    <p className="flex items-center gap-1 text-xs text-utu-text-muted">
                      <CheckCircle size={11} className="text-emerald-500" />
                      Generated just now — review before sending
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg border border-utu-border-default px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                  >
                    {copied ? <><CheckCircle size={13} className="text-emerald-500" />Copied</> : <><Copy size={13} />Copy</>}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 rounded-lg border border-utu-border-default px-3 py-1.5 text-xs font-medium text-utu-text-secondary hover:text-utu-text-primary hover:bg-utu-bg-muted transition-colors"
                  >
                    <Download size={13} />
                    Download .md
                  </button>
                  <button
                    onClick={() => { setView('select'); setGenerated(null); setFields({}); }}
                    className="flex items-center gap-1.5 rounded-lg bg-utu-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles size={13} />
                    New Document
                  </button>
                </div>
              </div>

              {/* Document content */}
              <div className="px-8 py-6 max-w-3xl">
                <DocContent md={generated.content_md} />
              </div>

              {/* Disclaimer */}
              <div className="border-t border-utu-border-default bg-amber-50 px-5 py-3">
                <p className="text-xs text-amber-700">
                  AI-generated content — review carefully before use. For legal documents (NDA, contracts), obtain professional legal review before execution.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card">
          {histLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-utu-blue" size={22} />
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={40} className="mx-auto mb-3 text-utu-text-muted opacity-30" />
              <p className="text-sm text-utu-text-muted">No documents generated yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-utu-border-default">
              {history.map(doc => (
                <li key={doc.id} className="flex items-start gap-4 px-5 py-4">
                  <div className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${DEPT_COLORS[
                    DOC_TYPES.find(d => d.type === doc.type)?.department ?? ''
                  ] ?? 'bg-gray-100 text-gray-700'}`}>
                    {DOC_TYPES.find(d => d.type === doc.type)?.department ?? doc.type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-utu-text-primary">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-utu-text-muted line-clamp-1">
                      {doc.preview?.replace(/^#+ /gm, '').replace(/\*\*/g, '')}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-utu-text-muted">
                      <Clock size={10} />
                      {new Date(doc.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                      {doc.created_by && ` — ${doc.created_by}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
