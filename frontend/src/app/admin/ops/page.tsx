'use client';

/**
 * /admin/ops — Operations Department
 *
 * Tabs: Overview | Incidents | Support Tickets | Platform Health
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle, Clock, Ticket, Activity, Plus,
  Pencil, Trash2, ChevronDown, ExternalLink, RefreshCw, X, Copy, Check,
} from 'lucide-react';
import {
  getOpsStats, getOpsIncidents, createOpsIncident, updateOpsIncident, deleteOpsIncident,
  getOpsTickets, createOpsTicket, updateOpsTicket, deleteOpsTicket,
  getSupportTriage, triageTicket,
  type OpsStats, type OpsIncident, type OpsSupportTicket,
  type IncidentSeverity, type IncidentStatus, type TicketPriority, type TicketStatus, type TicketCategory,
  type SupportTriage, type TicketSentiment,
  getOpsAdvice, analyzeOps, type OpsAdvice,
} from '@/lib/api';

// ─── AI Ops Advisor Panel ─────────────────────────────────────────────────────

const OPS_HEALTH_BADGE: Record<string, string> = {
  excellent: 'border-green-300  bg-green-50  text-green-700',
  good:      'border-blue-200   bg-blue-50   text-blue-700',
  fair:      'border-amber-200  bg-amber-50  text-amber-700',
  poor:      'border-red-200    bg-red-50    text-red-700',
};

function AIOpsPanelInner() {
  const [advice,  setAdvice]  = useState<OpsAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getOpsAdvice()
      .then(r => { if (!cancelled) { setAdvice(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeOps();
      if (res.data) setAdvice(res.data);
      else setError('Analysis failed. Please try again.');
    } catch { setError('Failed to run analysis.'); }
    finally { setRunning(false); }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 mb-4">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Ops Health Advisor</span>
          {advice && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${OPS_HEALTH_BADGE[advice.ops_health] ?? ''}`}>
              {advice.ops_health}
            </span>
          )}
          {advice && (
            <span className="text-xs text-violet-500">
              {advice.open_incidents} open incidents · {advice.open_tickets} open tickets
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading ops analysis…</p>}

          {!loading && !advice && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                Run AI Ops Advisor to surface critical incidents, SLA breach risks, ticket backlog patterns, and platform health flags — including Hajj/Umrah season risk windows.
              </p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Ops Analysis'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {advice && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{advice.executive_summary}</p>

              {advice.critical_incidents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Critical Open Incidents</h3>
                  <div className="space-y-2">
                    {advice.critical_incidents.map((inc, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${inc.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className={`text-xs font-semibold ${inc.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>{inc.title}</p>
                          <span className={`text-xs font-medium ${inc.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{inc.age_hours}h old</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${inc.severity === 'critical' ? 'text-red-600' : 'text-amber-700'}`}>{inc.service}</p>
                        <p className={`text-xs mt-0.5 italic ${inc.severity === 'critical' ? 'text-red-500' : 'text-amber-600'}`}>{inc.recommended_action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.sla_risks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">SLA Breach Risks</h3>
                  <div className="space-y-2">
                    {advice.sla_risks.map((s, i) => (
                      <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-orange-700 capitalize">{s.type}</span>
                          <p className="text-xs font-semibold text-orange-800">{s.segment} ({s.count})</p>
                        </div>
                        <p className="text-xs text-orange-600 mt-0.5">{s.breach_risk}</p>
                        <p className="text-xs text-orange-500 mt-0.5 italic">{s.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.incident_patterns && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">Incident Patterns</p>
                    <p className="text-xs text-utu-text-secondary">{advice.incident_patterns}</p>
                  </div>
                )}
                {advice.ticket_backlog && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">Ticket Backlog</p>
                    <p className="text-xs text-utu-text-secondary">{advice.ticket_backlog}</p>
                  </div>
                )}
              </div>

              {advice.platform_risk_flags.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-semibold text-red-800 mb-1">Platform Risk Flags</p>
                  <ul className="space-y-0.5">
                    {advice.platform_risk_flags.map((f, i) => <li key={i} className="text-xs text-red-700">• {f}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.quick_wins.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Quick Wins</h3>
                    <ul className="space-y-1">
                      {advice.quick_wins.map((w, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary before:content-['→'] before:mr-1.5 before:text-green-500">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {advice.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {advice.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-utu-text-secondary before:content-['✓'] before:mr-1.5 before:text-violet-500">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-violet-200">
                <p className="text-xs text-violet-400">Last run: {new Date(advice.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <button onClick={handleAnalyze} disabled={running}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {running ? 'Refreshing…' : '↺ Refresh'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Incidents', 'Support Tickets', 'Platform Health'] as const;
type Tab = typeof TABS[number];

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  high:     'bg-orange-100 text-orange-700 border border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low:      'bg-green-100 text-green-700 border border-green-200',
};

const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  open:          'bg-red-100 text-red-700',
  investigating: 'bg-orange-100 text-orange-700',
  resolved:      'bg-green-100 text-green-700',
  closed:        'bg-slate-100 text-slate-600',
};

const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  high:   'bg-orange-100 text-orange-700 border border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low:    'bg-green-100 text-green-700 border border-green-200',
};

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open:        'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-slate-100 text-slate-600',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? 'text-utu-text-primary'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

// ─── Incident Form (shared for create + edit) ─────────────────────────────────

interface IncidentFormData {
  title:       string;
  severity:    IncidentSeverity;
  status:      IncidentStatus;
  service:     string;
  description: string;
  impact:      string;
}

const BLANK_INCIDENT: IncidentFormData = {
  title: '', severity: 'medium', status: 'open', service: '', description: '', impact: '',
};

function IncidentPanel({
  incident,
  onClose,
  onSaved,
}: {
  incident: OpsIncident | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<IncidentFormData>(incident ? {
    title:       incident.title,
    severity:    incident.severity,
    status:      incident.status,
    service:     incident.service ?? '',
    description: incident.description ?? '',
    impact:      incident.impact ?? '',
  } : BLANK_INCIDENT);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: keyof IncidentFormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title:       form.title.trim(),
        severity:    form.severity,
        status:      form.status,
        service:     form.service.trim() || null,
        description: form.description.trim() || null,
        impact:      form.impact.trim() || null,
      };
      if (incident) {
        await updateOpsIncident(incident.id, payload);
      } else {
        await createOpsIncident(payload);
      }
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">
            {incident ? 'Edit Incident' : 'New Incident'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Title *</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Brief description of incident"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Severity</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.severity} onChange={e => set('severity', e.target.value as IncidentSeverity)}
              >
                {(['critical','high','medium','low'] as IncidentSeverity[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Status</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.status} onChange={e => set('status', e.target.value as IncidentStatus)}
              >
                {(['open','investigating','resolved','closed'] as IncidentStatus[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_',' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Affected Service</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.service} onChange={e => set('service', e.target.value)}
              placeholder="e.g. payment-service, booking-api"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Description</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What is happening?"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Customer Impact</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.impact} onChange={e => set('impact', e.target.value)}
              placeholder="How are users affected?"
            />
          </div>
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : incident ? 'Save Changes' : 'Create Incident'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Form ──────────────────────────────────────────────────────────────

interface TicketFormData {
  subject:     string;
  user_email:  string;
  booking_ref: string;
  category:    TicketCategory;
  priority:    TicketPriority;
  status:      TicketStatus;
  assignee:    string;
  description: string;
  resolution:  string;
}

const BLANK_TICKET: TicketFormData = {
  subject: '', user_email: '', booking_ref: '',
  category: 'other', priority: 'medium', status: 'open',
  assignee: '', description: '', resolution: '',
};

// ─── AI Triage Panel ──────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<TicketSentiment, { label: string; bg: string; text: string; dot: string }> = {
  positive:   { label: 'Positive',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  neutral:    { label: 'Neutral',    bg: 'bg-slate-100', text: 'text-slate-600',  dot: 'bg-slate-400' },
  frustrated: { label: 'Frustrated', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  angry:      { label: 'Angry',      bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
};

const URGENCY_COLORS: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-green-100 text-green-700',
};

function AITriagePanel({ ticketId }: { ticketId: string }) {
  const [triage,  setTriage]  = useState<SupportTriage | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);
  const [open,    setOpen]    = useState(false);

  // Auto-load existing triage when panel opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getSupportTriage(ticketId)
      .then(r => { if (!cancelled) { setTriage(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId, open]);

  async function handleTriage() {
    setRunning(true);
    setError('');
    try {
      const res = await triageTicket(ticketId);
      if (res.data) setTriage(res.data);
      else setError('Triage failed. Please try again.');
    } catch {
      setError('Failed to run triage. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  function copyResponse() {
    if (!triage?.draft_response) return;
    navigator.clipboard.writeText(triage.draft_response).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sentiment = triage ? SENTIMENT_CONFIG[triage.sentiment] : null;

  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/40">
      {/* Header toggle */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Triage</span>
          {triage && (
            <>
              {triage.escalation_flag && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">ESCALATE</span>
              )}
              <span className="text-xs text-violet-500 font-normal">
                · {new Date(triage.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-4 pt-3 space-y-3">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading triage…</p>}

          {!loading && !triage && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                No triage yet. Run AI Triage to get sentiment analysis, urgency assessment, a draft customer response, and internal resolution steps.
              </p>
              <button
                onClick={handleTriage}
                disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Triaging…' : 'Triage with AI'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {triage && !loading && (
            <>
              {/* Escalation banner */}
              {triage.escalation_flag && triage.escalation_reason && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-bold text-red-700 mb-0.5">Escalation Required</p>
                  <p className="text-xs text-red-700">{triage.escalation_reason}</p>
                </div>
              )}

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                {sentiment && (
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sentiment.bg} ${sentiment.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
                    {sentiment.label}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${URGENCY_COLORS[triage.urgency_override]}`}>
                  AI Priority: {triage.urgency_override.charAt(0).toUpperCase() + triage.urgency_override.slice(1)}
                </span>
                {triage.category_suggestion && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    Category: {triage.category_suggestion}
                  </span>
                )}
                <button
                  onClick={handleTriage}
                  disabled={running}
                  className="ms-auto rounded border border-violet-300 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Re-triaging…' : 'Re-triage'}
                </button>
              </div>

              {/* Summary + root cause */}
              {triage.summary && (
                <p className="text-xs text-utu-text-secondary leading-relaxed">{triage.summary}</p>
              )}
              {triage.root_cause && (
                <div className="rounded-lg bg-utu-bg-muted px-3 py-2">
                  <p className="text-xs font-semibold text-utu-text-secondary mb-0.5">Root Cause</p>
                  <p className="text-xs text-utu-text-secondary leading-relaxed">{triage.root_cause}</p>
                </div>
              )}

              {/* Resolution steps */}
              {triage.resolution_steps.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                  <p className="mb-2 text-xs font-semibold text-blue-800">Internal Resolution Steps</p>
                  <ol className="space-y-1 list-none">
                    {triage.resolution_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-700">
                          {i + 1}
                        </span>
                        <span className="text-xs text-blue-900 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Pattern note */}
              {triage.pattern_note && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Pattern Detected</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{triage.pattern_note}</p>
                </div>
              )}

              {/* Draft customer response */}
              {triage.draft_response && (
                <div className="rounded-lg border border-violet-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-violet-800">Draft Customer Response</p>
                    <button
                      onClick={copyResponse}
                      className="flex items-center gap-1 rounded border border-violet-200 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-utu-text-secondary leading-relaxed font-sans">
                    {triage.draft_response}
                  </pre>
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

// ─── Ticket Panel ─────────────────────────────────────────────────────────────

function TicketPanel({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: OpsSupportTicket | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TicketFormData>(ticket ? {
    subject:     ticket.subject,
    user_email:  ticket.user_email ?? '',
    booking_ref: ticket.booking_ref ?? '',
    category:    ticket.category,
    priority:    ticket.priority,
    status:      ticket.status,
    assignee:    ticket.assignee ?? '',
    description: ticket.description ?? '',
    resolution:  ticket.resolution ?? '',
  } : BLANK_TICKET);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: keyof TicketFormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.subject.trim()) { setError('Subject is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        subject:     form.subject.trim(),
        user_email:  form.user_email.trim() || null,
        booking_ref: form.booking_ref.trim() || null,
        category:    form.category,
        priority:    form.priority,
        status:      form.status,
        assignee:    form.assignee.trim() || null,
        description: form.description.trim() || null,
        resolution:  form.resolution.trim() || null,
      };
      if (ticket) {
        await updateOpsTicket(ticket.id, payload);
      } else {
        await createOpsTicket(payload);
      }
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-utu-bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-base font-semibold text-utu-text-primary">
            {ticket ? 'Edit Ticket' : 'New Support Ticket'}
          </h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Subject *</label>
            <input
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">User Email</label>
              <input
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.user_email} onChange={e => set('user_email', e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Booking Ref</label>
              <input
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.booking_ref} onChange={e => set('booking_ref', e.target.value)}
                placeholder="UTU-XXXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Category</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.category} onChange={e => set('category', e.target.value as TicketCategory)}
              >
                {(['booking','payment','technical','account','refund','other'] as TicketCategory[]).map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Priority</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.priority} onChange={e => set('priority', e.target.value as TicketPriority)}
              >
                {(['urgent','high','medium','low'] as TicketPriority[]).map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Status</label>
              <select
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.status} onChange={e => set('status', e.target.value as TicketStatus)}
              >
                {(['open','in_progress','resolved','closed'] as TicketStatus[]).map(s => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-utu-text-muted">Assignee</label>
              <input
                className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
                value={form.assignee} onChange={e => set('assignee', e.target.value)}
                placeholder="Agent name"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Description</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Details of the issue"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-utu-text-muted">Resolution</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
              value={form.resolution} onChange={e => set('resolution', e.target.value)}
              placeholder="How was it resolved?"
            />
          </div>

          {/* AI Triage — only for existing tickets */}
          {ticket && <AITriagePanel ticketId={ticket.id} />}
        </div>
        <div className="border-t border-utu-border-default px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : ticket ? 'Save Changes' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ onGoToIncidents, onGoToTickets }: { onGoToIncidents: () => void; onGoToTickets: () => void }) {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['ops-stats'],
    queryFn:  () => getOpsStats(),
    refetchInterval: 60_000,
  });
  const { data: incData } = useQuery({
    queryKey: ['ops-incidents-recent'],
    queryFn:  () => getOpsIncidents({ limit: 5 }),
    refetchInterval: 60_000,
  });

  const stats: OpsStats | undefined = statsData?.data;

  return (
    <div className="space-y-6">
      {/* Incident KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Incidents</h2>
        {statsLoading ? (
          <p className="text-sm text-utu-text-muted">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Open"          value={stats?.incidents.open ?? 0}          color={stats?.incidents.open ? 'text-red-600' : 'text-green-600'} />
            <StatCard label="Critical"      value={stats?.incidents.critical ?? 0}      color="text-red-600" />
            <StatCard label="High"          value={stats?.incidents.high ?? 0}          color="text-orange-600" />
            <StatCard label="Resolved 24h"  value={stats?.incidents.resolved_24h ?? 0} color="text-green-600" />
            <StatCard label="SLA Breaching" value={stats?.incidents.sla_breaching ?? 0} color={stats?.incidents.sla_breaching ? 'text-red-600' : 'text-slate-500'} sub="Critical/High open >1h" />
          </div>
        )}
      </div>

      {/* Ticket KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Support Tickets</h2>
        {statsLoading ? null : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Open"         value={stats?.tickets.open ?? 0}         color={stats?.tickets.open ? 'text-blue-600' : 'text-green-600'} />
            <StatCard label="Urgent"       value={stats?.tickets.urgent ?? 0}       color="text-red-600" />
            <StatCard label="High"         value={stats?.tickets.high ?? 0}         color="text-orange-600" />
            <StatCard label="Resolved 24h" value={stats?.tickets.resolved_24h ?? 0} color="text-green-600" />
          </div>
        )}
      </div>

      {/* Recent incidents */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-utu-text-muted">Recent Incidents</h2>
          <button onClick={onGoToIncidents} className="text-xs text-utu-blue hover:underline">View all</button>
        </div>
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
          {!incData?.data?.length ? (
            <p className="px-5 py-4 text-sm text-utu-text-muted">No incidents — all clear.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Title','Severity','Status','Service','Started'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-utu-border-default">
                {incData.data.map(inc => (
                  <tr key={inc.id} className="hover:bg-utu-bg-muted/50">
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-utu-text-primary">{inc.title}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[inc.severity]}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INCIDENT_STATUS_COLORS[inc.status]}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-utu-text-secondary">{inc.service ?? '—'}</td>
                    <td className="px-4 py-3 text-utu-text-muted">{fmtDate(inc.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <button
          onClick={onGoToIncidents}
          className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"
        >
          <AlertTriangle size={14} /> Manage Incidents
        </button>
        <button
          onClick={onGoToTickets}
          className="flex items-center gap-2 rounded border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted"
        >
          <Ticket size={14} /> Support Queue
        </button>
      </div>
    </div>
  );
}

// ─── Incidents Tab ────────────────────────────────────────────────────────────

function IncidentsTab() {
  const qc = useQueryClient();
  const [statusFilter,   setStatusFilter]   = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page,  setPage]  = useState(1);
  const [panel, setPanel] = useState<OpsIncident | null | 'new'>(null);
  const [delId, setDelId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ops-incidents', statusFilter, severityFilter, page],
    queryFn:  () => getOpsIncidents({
      status:   statusFilter   || undefined,
      severity: severityFilter || undefined,
      page, limit: 20,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteOpsIncident,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['ops-incidents'] }); qc.invalidateQueries({ queryKey: ['ops-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['ops-incidents'] }); qc.invalidateQueries({ queryKey: ['ops-stats'] }); };

  const incidents = data?.data ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All statuses</option>
          {['open','investigating','resolved','closed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All severities</option>
          {['critical','high','medium','low'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted">
          <RefreshCw size={14} />
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setPanel('new')}
            className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} /> New Incident
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !incidents.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No incidents found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Title','Severity','Status','Service','Started','Resolved',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {incidents.map(inc => (
                <tr key={inc.id} className="hover:bg-utu-bg-muted/50">
                  <td className="max-w-xs px-4 py-3 font-medium text-utu-text-primary">
                    <div className="truncate">{inc.title}</div>
                    {inc.impact && <div className="truncate text-xs text-utu-text-muted">{inc.impact}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INCIDENT_STATUS_COLORS[inc.status]}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{inc.service ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-muted whitespace-nowrap">{fmtDate(inc.started_at)}</td>
                  <td className="px-4 py-3 text-utu-text-muted whitespace-nowrap">{fmtDate(inc.resolved_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPanel(inc)}
                        className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDelId(inc.id)}
                        className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Prev</button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Next</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Delete incident?</h3>
            <p className="mt-2 text-sm text-utu-text-secondary">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDelId('')} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(delId)}
                disabled={deleteMut.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit panel */}
      {panel !== null && (
        <IncidentPanel
          incident={panel === 'new' ? null : panel}
          onClose={() => setPanel(null)}
          onSaved={() => { setPanel(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Support Tickets Tab ──────────────────────────────────────────────────────

function TicketsTab() {
  const qc = useQueryClient();
  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page,  setPage]  = useState(1);
  const [panel, setPanel] = useState<OpsSupportTicket | null | 'new'>(null);
  const [delId, setDelId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ops-tickets', statusFilter, priorityFilter, categoryFilter, search, page],
    queryFn:  () => getOpsTickets({
      status:   statusFilter   || undefined,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      search:   search.trim()  || undefined,
      page, limit: 20,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteOpsTicket,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['ops-tickets'] }); qc.invalidateQueries({ queryKey: ['ops-stats'] }); setDelId(''); },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['ops-tickets'] }); qc.invalidateQueries({ queryKey: ['ops-stats'] }); };

  const tickets = data?.data ?? [];
  const total   = data?.total ?? 0;
  const pages   = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search subject, email, ref…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-56 rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-1 focus:ring-utu-blue"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All statuses</option>
          {['open','in_progress','resolved','closed'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All priorities</option>
          {['urgent','high','medium','low'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue"
        >
          <option value="">All categories</option>
          {['booking','payment','technical','account','refund','other'].map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <button onClick={refresh} className="rounded border border-utu-border-default p-2 text-utu-text-muted hover:bg-utu-bg-muted">
          <RefreshCw size={14} />
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setPanel('new')}
            className="flex items-center gap-2 rounded bg-utu-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} /> New Ticket
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">Loading…</p>
        ) : !tickets.length ? (
          <p className="px-5 py-8 text-sm text-utu-text-muted">No tickets found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-utu-bg-muted">
              <tr>
                {['Subject','Priority','Status','Category','Email / Ref','Assignee','Created',''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-utu-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {tickets.map(tk => (
                <tr key={tk.id} className="hover:bg-utu-bg-muted/50">
                  <td className="max-w-xs px-4 py-3 font-medium text-utu-text-primary">
                    <div className="truncate">{tk.subject}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_PRIORITY_COLORS[tk.priority]}`}>
                      {tk.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLORS[tk.status]}`}>
                      {tk.status.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary capitalize">{tk.category}</td>
                  <td className="px-4 py-3 text-utu-text-muted">
                    <div>{tk.user_email ?? '—'}</div>
                    {tk.booking_ref && <div className="text-xs">{tk.booking_ref}</div>}
                  </td>
                  <td className="px-4 py-3 text-utu-text-secondary">{tk.assignee ?? '—'}</td>
                  <td className="px-4 py-3 text-utu-text-muted whitespace-nowrap">{fmtDate(tk.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPanel(tk)}
                        className="rounded p-1 text-utu-text-muted hover:bg-utu-bg-muted hover:text-utu-blue"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDelId(tk.id)}
                        className="rounded p-1 text-utu-text-muted hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Prev</button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="rounded border border-utu-border-default px-3 py-1 disabled:opacity-40 hover:bg-utu-bg-muted">Next</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-utu-card border border-utu-border-default bg-utu-bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-utu-text-primary">Delete ticket?</h3>
            <p className="mt-2 text-sm text-utu-text-secondary">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDelId('')} className="rounded border border-utu-border-default px-4 py-2 text-sm hover:bg-utu-bg-muted">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(delId)}
                disabled={deleteMut.isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit panel */}
      {panel !== null && (
        <TicketPanel
          ticket={panel === 'new' ? null : panel}
          onClose={() => setPanel(null)}
          onSaved={() => { setPanel(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Platform Health Tab ──────────────────────────────────────────────────────

function PlatformHealthTab() {
  const links = [
    { label: 'Infrastructure Health Monitor', href: '/admin/infrastructure', icon: Activity, desc: '8-region parallel health probe — AWS regions, DB shards, Redis, Kafka' },
    { label: 'White-label Tenants',           href: '/admin/tenants',        icon: ExternalLink, desc: 'Tenant configuration and status' },
    { label: 'Email Automation Log',          href: '/admin/notifications/email-log', icon: CheckCircle, desc: 'Email delivery status and bounce tracking' },
    { label: 'AI Chat Logs',                  href: '/admin/ai-chat',        icon: Clock, desc: 'AI assistant session logs and errors' },
    { label: 'Audit Log',                     href: '/admin/audit-log',      icon: Clock, desc: 'Admin action audit trail' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-utu-text-secondary">
        Platform health monitoring links. For real-time infrastructure status, use the Health Monitor.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ label, href, icon: Icon, desc }) => (
          <a
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5 hover:border-utu-blue hover:shadow-sm transition-shadow"
          >
            <div className="mt-0.5 rounded-lg bg-utu-blue/10 p-2 text-utu-blue">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-utu-text-primary">{label}</p>
              <p className="mt-1 text-xs text-utu-text-muted">{desc}</p>
            </div>
            <ExternalLink size={14} className="ml-auto mt-1 shrink-0 text-utu-text-muted" />
          </a>
        ))}
      </div>

      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
        <h3 className="text-sm font-semibold text-utu-text-primary">Services Overview</h3>
        <p className="mt-1 text-xs text-utu-text-muted">Microservice ports (internal)</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {[
            ['admin-service',       '3012'],
            ['auth-service',        '3001'],
            ['booking-service',     '3003'],
            ['notification-service','3002'],
            ['payment-service',     '3004'],
            ['pricing-service',     '3011'],
            ['loyalty-service',     '3005'],
            ['wallet-service',      '3006'],
            ['sales-service',       '3013'],
          ].map(([name, port]) => (
            <div key={name} className="flex items-center justify-between rounded border border-utu-border-default bg-utu-bg-muted px-3 py-2">
              <span className="text-utu-text-secondary">{name}</span>
              <span className="font-mono text-utu-text-muted">:{port}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">Operations</h1>
        <p className="mt-1 text-sm text-utu-text-muted">Incident management, support ticket queue, and platform health.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-utu-blue text-utu-blue'
                : 'text-utu-text-secondary hover:text-utu-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview'         && <><AIOpsPanelInner /><OverviewTab onGoToIncidents={() => setActiveTab('Incidents')} onGoToTickets={() => setActiveTab('Support Tickets')} /></>}
      {activeTab === 'Incidents'        && <IncidentsTab />}
      {activeTab === 'Support Tickets'  && <TicketsTab />}
      {activeTab === 'Platform Health'  && <PlatformHealthTab />}
    </div>
  );
}
