'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComplianceStats,
  getErasureRequests,
  updateErasureRequest,
  getDataExports,
  getDsrFulfillment,
  compileDsrFulfillment,
  type ComplianceStats,
  type ErasureRequest,
  type DataExportRequest,
  type ErasureStatus,
  type ComplianceLaw,
  type DsrFulfillment,
  type DsrShardSummary,
  getComplianceAdvice, analyzeCompliance, type ComplianceAdvice,
} from '@/lib/api';

// ─── AI Compliance Advisor Panel ─────────────────────────────────────────────

const COMP_HEALTH_BADGE: Record<string, string> = {
  excellent: 'border-green-300  bg-green-50  text-green-700',
  good:      'border-blue-200   bg-blue-50   text-blue-700',
  fair:      'border-amber-200  bg-amber-50  text-amber-700',
  poor:      'border-red-200    bg-red-50    text-red-700',
};
const COMP_RISK_COLORS: Record<string, string> = {
  critical: 'border-red-200    bg-red-50',
  high:     'border-amber-200  bg-amber-50',
  medium:   'border-blue-200   bg-blue-50',
  low:      'border-gray-200   bg-gray-50',
};

function AIComplianceAdvisorPanel() {
  const [advice,  setAdvice]  = useState<ComplianceAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getComplianceAdvice()
      .then(r => { if (!cancelled) { setAdvice(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeCompliance();
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
          <span className="text-xs font-semibold text-violet-800">AI Privacy Compliance Advisor</span>
          {advice && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${COMP_HEALTH_BADGE[advice.compliance_health] ?? ''}`}>
              {advice.compliance_health}
            </span>
          )}
          {advice && (
            <span className="text-xs text-violet-500">
              {advice.overdue_erasures} overdue erasures · {advice.total_erasure_requests} total requests
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading compliance analysis…</p>}

          {!loading && !advice && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                Run AI Privacy Compliance Advisor to assess GDPR/PDPL/LGPD/CCPA SLA health, overdue erasure risk, regulation-specific gaps, and enforcement exposure.
              </p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Compliance Analysis'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {advice && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{advice.executive_summary}</p>

              {advice.sla_breaches.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">SLA Breaches</h3>
                  <div className="space-y-2">
                    {advice.sla_breaches.map((b, i) => (
                      <div key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-red-800">{b.regulation}</p>
                          <span className="text-xs text-red-600 capitalize">{b.breach_type.replace('_', ' ')}</span>
                          <span className="text-xs font-medium text-red-700">{b.count} affected</span>
                        </div>
                        <p className="text-xs text-red-600 mt-0.5">{b.risk}</p>
                        <p className="text-xs text-red-500 mt-0.5 italic">{b.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.regulation_risks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Regulation Risk Assessment</h3>
                  <div className="space-y-2">
                    {advice.regulation_risks.map((r, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${COMP_RISK_COLORS[r.risk_level] ?? ''}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold">{r.regulation}</p>
                          <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ${
                            r.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
                            r.risk_level === 'high' ? 'bg-amber-100 text-amber-700' :
                            r.risk_level === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>{r.risk_level}</span>
                        </div>
                        <p className="text-xs mt-0.5 opacity-80">{r.issue}</p>
                        <p className="text-xs mt-0.5 italic opacity-70">{r.remediation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.erasure_backlog && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">Erasure Backlog</p>
                    <p className="text-xs text-utu-text-secondary">{advice.erasure_backlog}</p>
                  </div>
                )}
                {advice.export_patterns && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">DSR Patterns</p>
                    <p className="text-xs text-utu-text-secondary">{advice.export_patterns}</p>
                  </div>
                )}
              </div>

              {advice.breach_assessment && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <p className="text-xs font-semibold text-orange-800 mb-1">Breach Assessment</p>
                  <p className="text-xs text-orange-700">{advice.breach_assessment}</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: number | string; sub?: string; accent?: 'red' | 'amber' | 'green' | 'blue';
}) {
  const ring = accent === 'red'   ? 'border-red-400'
             : accent === 'amber' ? 'border-amber-400'
             : accent === 'green' ? 'border-green-400'
             : 'border-utu-border-default';
  const val  = accent === 'red'   ? 'text-red-600'
             : accent === 'amber' ? 'text-amber-600'
             : accent === 'green' ? 'text-green-600'
             : 'text-utu-text-primary';
  return (
    <div className={`rounded-utu-card bg-utu-bg-card border ${ring} p-4`}>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${val}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-utu-text-muted">{sub}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
};

const LAW_COLORS: Record<string, string> = {
  GDPR:   'bg-blue-100 text-blue-700',
  CCPA:   'bg-purple-100 text-purple-700',
  LGPD:   'bg-green-100 text-green-700',
  PIPEDA: 'bg-orange-100 text-orange-700',
  KVKK:   'bg-rose-100 text-rose-700',
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Dashboard
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-stats'],
    queryFn:  () => getComplianceStats().then(r => (r as any).data as ComplianceStats),
  });

  if (isLoading) return <p className="text-sm text-utu-text-muted py-8 text-center">Loading compliance statistics...</p>;
  if (!data)     return <p className="text-sm text-red-500 py-8 text-center">Failed to load stats.</p>;

  const LAWS: ComplianceLaw[] = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];

  return (
    <div className="space-y-6">
      {/* SLA alert banner */}
      {data.overdue_erasures > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700 font-medium">
          {data.overdue_erasures} erasure request{data.overdue_erasures !== 1 ? 's' : ''} past the 30-day SLA — immediate DPO action required.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Pending Erasures"    value={data.pending_erasures}      accent={data.pending_erasures > 0 ? 'amber' : undefined} />
        <KpiCard label="In Progress"         value={data.in_progress_erasures}  accent={data.in_progress_erasures > 0 ? 'blue' : undefined} />
        <KpiCard label="Overdue (>30 days)"  value={data.overdue_erasures}      accent={data.overdue_erasures > 0 ? 'red' : undefined} />
        <KpiCard label="Completed (30d)"     value={data.completed_erasures_30d} accent="green" />
        <KpiCard label="Pending Exports"     value={data.pending_exports}       accent={data.pending_exports > 0 ? 'amber' : undefined} />
      </div>

      {/* By-law breakdown */}
      <div className="rounded-utu-card bg-utu-bg-card border border-utu-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-utu-border-default">
          <h3 className="text-sm font-semibold text-utu-text-primary">Breakdown by Regulation</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-utu-bg-muted text-utu-text-muted text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-start">Regulation</th>
              <th className="px-4 py-2 text-end">Pending Erasures</th>
              <th className="px-4 py-2 text-end">Pending Exports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-utu-border-default">
            {LAWS.map(law => {
              const row = data.by_law[law] ?? { pending_erasures: 0, pending_exports: 0 };
              return (
                <tr key={law}>
                  <td className="px-4 py-2.5">
                    <Badge label={law} color={LAW_COLORS[law] ?? 'bg-gray-100 text-gray-700'} />
                  </td>
                  <td className={`px-4 py-2.5 text-end font-medium ${row.pending_erasures > 0 ? 'text-amber-600' : 'text-utu-text-muted'}`}>
                    {row.pending_erasures}
                  </td>
                  <td className={`px-4 py-2.5 text-end font-medium ${row.pending_exports > 0 ? 'text-amber-600' : 'text-utu-text-muted'}`}>
                    {row.pending_exports}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI DSR Auto-Fulfillment Panel
// ─────────────────────────────────────────────────────────────────────────────

function AIDsrPanel({ dsr, onClose }: { dsr: ErasureRequest; onClose: () => void }) {
  const [fulfillment, setFulfillment] = useState<DsrFulfillment | null>(null);
  const [loading, setLoading]         = useState(true);
  const [running, setRunning]         = useState(false);
  const [copied,  setCopied]          = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDsrFulfillment(dsr.id).then(r => { if (!cancelled) { setFulfillment(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [dsr.id]);

  async function compile() {
    setRunning(true);
    try {
      const res = await compileDsrFulfillment(dsr.id);
      setFulfillment(res.data);
    } finally {
      setRunning(false);
    }
  }

  function copyLetter() {
    if (!fulfillment?.cover_letter_md) return;
    navigator.clipboard.writeText(fulfillment.cover_letter_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const SLA_COLORS: Record<string, string> = {
    on_track: 'bg-green-100 text-green-700',
    at_risk:  'bg-amber-100 text-amber-700',
    overdue:  'bg-red-100 text-red-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-utu-navy text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider">✦ AI DSR Fulfillment Assistant</p>
            <p className="font-semibold text-sm mt-0.5 truncate max-w-[400px]">{dsr.email_snapshot}</p>
            <p className="text-xs text-blue-300">{dsr.law} &middot; {dsr.status}</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Checking for existing fulfillment package...</p>
          ) : fulfillment ? (
            <>
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SLA_COLORS[fulfillment.sla_status] ?? 'bg-gray-100 text-gray-600'}`}>
                  SLA: {fulfillment.sla_status.replace('_', ' ')}
                </span>
                {fulfillment.response_deadline && (
                  <span className="text-xs text-gray-500">Deadline: {fulfillment.response_deadline}</span>
                )}
                <span className="text-xs text-gray-400 ms-auto">Generated {new Date(fulfillment.generated_at).toLocaleString()}</span>
                <button onClick={compile} disabled={running} className="text-xs text-blue-600 hover:underline disabled:opacity-40">
                  {running ? 'Compiling…' : 'Re-compile'}
                </button>
              </div>

              {/* Data summary */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">Data Summary ({fulfillment.total_records_found} records found)</p>
                <p className="text-sm text-blue-800">{fulfillment.data_summary}</p>
              </div>

              {/* Shard breakdown */}
              {fulfillment.shard_summary.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shard Breakdown</p>
                  <div className="grid grid-cols-4 gap-2">
                    {fulfillment.shard_summary.map((s: DsrShardSummary) => (
                      <div key={s.shard} className={`rounded-lg border p-2 text-center ${s.has_data ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                        <p className="text-xs font-bold text-gray-700">{s.shard}</p>
                        <p className="text-xs text-gray-500">{s.record_count} records</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retention notes */}
              {fulfillment.retention_notes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data Retained (Legal Basis)</p>
                  <ul className="space-y-1">
                    {fulfillment.retention_notes.map((n, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-amber-500">&#9632;</span>{n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended redactions */}
              {fulfillment.recommended_redactions.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Recommended Redactions Before Sending</p>
                  <ul className="space-y-0.5">
                    {fulfillment.recommended_redactions.map((r, i) => (
                      <li key={i} className="text-xs text-amber-800">&bull; {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cover letter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cover Letter Draft</p>
                  <button onClick={copyLetter} className="ms-auto text-xs text-blue-600 hover:underline">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {fulfillment.cover_letter_md}
                  </pre>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  DPO review required before sending — this package is not automatically sent.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-gray-500">
                No fulfillment package compiled yet for this DSR.
              </p>
              <p className="text-xs text-gray-400">
                Compilation queries all 8 regional shards and generates a personalised cover letter. This may take up to 60 seconds.
              </p>
              <button
                onClick={compile}
                disabled={running}
                className="bg-utu-navy text-white text-sm px-5 py-2 rounded-lg hover:bg-utu-blue disabled:opacity-50"
              >
                {running ? 'Compiling across shards…' : '✦ Compile Fulfillment Package'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Erasure Requests
// ─────────────────────────────────────────────────────────────────────────────

function ErasureTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [lawFilter,    setLawFilter]    = useState('');
  const [page,         setPage]         = useState(1);
  const [notesEditing, setNotesEditing] = useState<Record<string, string>>({});
  const [dsrPanel,     setDsrPanel]     = useState<ErasureRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-erasures', statusFilter, lawFilter, page],
    queryFn:  () => getErasureRequests({
      status: statusFilter || undefined,
      law:    lawFilter    || undefined,
      page,
      limit:  50,
    }).then(r => r as any),
  });

  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { status?: ErasureStatus; dpo_notes?: string; _shard: string } }) =>
      updateErasureRequest(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-erasures'] }),
  });

  const rows: ErasureRequest[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  function rowBg(row: ErasureRequest) {
    if (row.status !== 'pending') return '';
    const days = daysSince(row.requested_at);
    if (days > 30) return 'bg-red-50';
    if (days > 25) return 'bg-amber-50';
    return '';
  }

  function saveNotes(row: ErasureRequest) {
    const notes = notesEditing[row.id];
    if (notes === undefined || notes === (row.dpo_notes ?? '')) return;
    mutation.mutate({ id: row.id, updates: { dpo_notes: notes, _shard: row._shard } });
    setNotesEditing(prev => { const n = { ...prev }; delete n[row.id]; return n; });
  }

  const LAWS: ComplianceLaw[] = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={lawFilter}
          onChange={e => { setLawFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All Regulations</option>
          {LAWS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <span className="ms-auto text-xs text-utu-text-muted self-center">
          {total} request{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading erasure requests...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No erasure requests found.</p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-utu-bg-muted text-utu-text-muted text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-start">Email</th>
                <th className="px-3 py-2 text-start">Law</th>
                <th className="px-3 py-2 text-start">Requested</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">Shard</th>
                <th className="px-3 py-2 text-start">DPO Notes</th>
                <th className="px-3 py-2 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => {
                const days   = daysSince(row.requested_at);
                const bg     = rowBg(row);
                const isPending    = row.status === 'pending';
                const isInProgress = row.status === 'in_progress';
                const noteVal = notesEditing[row.id] !== undefined ? notesEditing[row.id] : (row.dpo_notes ?? '');

                return (
                  <tr key={`${row._shard}-${row.id}`} className={bg}>
                    <td className="px-3 py-2 font-mono text-xs max-w-[180px] truncate" title={row.email_snapshot}>
                      {row.email_snapshot}
                    </td>
                    <td className="px-3 py-2">
                      <Badge label={row.law} color={LAW_COLORS[row.law] ?? 'bg-gray-100 text-gray-700'} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span>{fmtDate(row.requested_at)}</span>
                      {isPending && days > 25 && (
                        <span className={`ms-1.5 text-xs font-medium ${days > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                          ({days}d)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        label={row.status.replace('_', ' ')}
                        color={STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-utu-bg-muted px-1.5 py-0.5 text-xs font-mono text-utu-text-muted">
                        {row._shard}
                      </span>
                    </td>
                    <td className="px-3 py-2 min-w-[160px]">
                      <input
                        type="text"
                        value={noteVal}
                        placeholder="Add DPO notes..."
                        onChange={e => setNotesEditing(prev => ({ ...prev, [row.id]: e.target.value }))}
                        onBlur={() => saveNotes(row)}
                        className="w-full rounded border border-utu-border-default bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-utu-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => setDsrPanel(row)}
                          className="rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                        >
                          ✦ Fulfill
                        </button>
                        {isPending && (
                          <button
                            onClick={() => mutation.mutate({ id: row.id, updates: { status: 'in_progress', _shard: row._shard } })}
                            disabled={mutation.isPending}
                            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Start
                          </button>
                        )}
                        {(isPending || isInProgress) && (
                          <>
                            <button
                              onClick={() => mutation.mutate({ id: row.id, updates: { status: 'completed', _shard: row._shard } })}
                              disabled={mutation.isPending}
                              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => mutation.mutate({ id: row.id, updates: { status: 'rejected', _shard: row._shard } })}
                              disabled={mutation.isPending}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button
            disabled={rows.length < 50}
            onClick={() => setPage(p => p + 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {dsrPanel && <AIDsrPanel dsr={dsrPanel} onClose={() => setDsrPanel(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Data Exports
// ─────────────────────────────────────────────────────────────────────────────

function ExportsTab() {
  const [lawFilter, setLawFilter] = useState('');
  const [page,      setPage]      = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-exports', lawFilter, page],
    queryFn:  () => getDataExports({
      law:   lawFilter || undefined,
      page,
      limit: 50,
    }).then(r => r as any),
  });

  const rows: DataExportRequest[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const LAWS: ComplianceLaw[] = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'KVKK'];

  function isDownloadable(row: DataExportRequest) {
    if (!row.download_url) return false;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return false;
    return true;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={lawFilter}
          onChange={e => { setLawFilter(e.target.value); setPage(1); }}
          className="rounded border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
        >
          <option value="">All Regulations</option>
          {LAWS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <p className="ms-auto text-xs text-utu-text-muted">
          {total} export{total !== 1 ? 's' : ''} — read-only (auto-generated by auth service)
        </p>
      </div>

      {/* Table */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">Loading data exports...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-utu-text-muted">No data export requests found.</p>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-utu-bg-muted text-utu-text-muted text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-start">User ID</th>
                <th className="px-3 py-2 text-start">Law</th>
                <th className="px-3 py-2 text-start">Type</th>
                <th className="px-3 py-2 text-start">Format</th>
                <th className="px-3 py-2 text-start">Requested</th>
                <th className="px-3 py-2 text-start">Generated</th>
                <th className="px-3 py-2 text-start">Download</th>
                <th className="px-3 py-2 text-start">Shard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-utu-border-default">
              {rows.map(row => (
                <tr key={`${row._shard}-${row.id}`}>
                  <td className="px-3 py-2 font-mono text-xs max-w-[120px] truncate" title={row.user_id}>
                    {row.user_id.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-2">
                    <Badge label={row.law} color={LAW_COLORS[row.law] ?? 'bg-gray-100 text-gray-700'} />
                  </td>
                  <td className="px-3 py-2 capitalize text-utu-text-secondary">{row.export_type}</td>
                  <td className="px-3 py-2 uppercase text-xs text-utu-text-muted">{row.format}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-utu-text-secondary">{fmtDate(row.requested_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.generated_at ? (
                      <span className="text-green-600">{fmtDate(row.generated_at)}</span>
                    ) : (
                      <span className="text-amber-600 text-xs">Pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isDownloadable(row) ? (
                      <a
                        href={row.download_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-utu-blue hover:underline text-xs"
                      >
                        Download
                      </a>
                    ) : row.download_url && row.expires_at && new Date(row.expires_at) < new Date() ? (
                      <span className="text-xs text-red-500">Expired</span>
                    ) : (
                      <span className="text-xs text-utu-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-utu-bg-muted px-1.5 py-0.5 text-xs font-mono text-utu-text-muted">
                      {row._shard}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-xs text-utu-text-muted">Page {page}</span>
          <button
            disabled={rows.length < 50}
            onClick={() => setPage(p => p + 1)}
            className="rounded border border-utu-border-default px-3 py-1 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Erasure Requests', 'Data Exports'] as const;
type Tab = typeof TABS[number];

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Data &amp; Privacy</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          GDPR, CCPA, LGPD, PIPEDA, KVKK — cross-shard DPO dashboard
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-utu-border-default">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-utu-blue text-utu-blue'
                : 'border-transparent text-utu-text-muted hover:text-utu-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'Dashboard'        && <><AIComplianceAdvisorPanel /><DashboardTab /></>}
        {activeTab === 'Erasure Requests' && <ErasureTab />}
        {activeTab === 'Data Exports'     && <ExportsTab />}
      </div>
    </div>
  );
}
