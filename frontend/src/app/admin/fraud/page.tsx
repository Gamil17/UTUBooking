'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFraudStats, getFraudCases, createFraudCase, updateFraudCase, deleteFraudCase,
  getFraudRules, createFraudRule, updateFraudRule, deleteFraudRule,
  getFraudWatchlist, addToWatchlist as createFraudWatchlistEntry, removeFromWatchlist as deleteFraudWatchlistEntry,
  getFraudDecisions,
  getFraudScore, scoreFraudCase,
  type FraudStats, type FraudCase, type FraudRule, type FraudWatchlistEntry, type FraudDecision,
  type FraudScore, type FraudThreatLevel, type FraudVerdict,
  getFraudAdvice, analyzeFraud, type FraudAdvice,
} from '@/lib/api';

// ─── AI Fraud Intelligence Panel ─────────────────────────────────────────────

const FRAUD_HEALTH_BADGE: Record<string, string> = {
  excellent: 'border-green-300  bg-green-50  text-green-700',
  good:      'border-blue-200   bg-blue-50   text-blue-700',
  fair:      'border-amber-200  bg-amber-50  text-amber-700',
  poor:      'border-red-200    bg-red-50    text-red-700',
};
const FRAUD_SEV_COLORS: Record<string, string> = {
  critical: 'border-red-200    bg-red-50    text-red-700',
  high:     'border-amber-200  bg-amber-50  text-amber-700',
  medium:   'border-blue-200   bg-blue-50   text-blue-700',
  low:      'border-gray-200   bg-gray-50   text-gray-600',
};
const DETECTION_COLORS: Record<string, string> = {
  covered: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  gap:     'bg-red-100   text-red-700',
};

function AIFraudAdvisorPanel() {
  const [advice,  setAdvice]  = useState<FraudAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getFraudAdvice()
      .then(r => { if (!cancelled) { setAdvice(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  async function handleAnalyze() {
    setRunning(true); setError('');
    try {
      const res = await analyzeFraud();
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
          <span className="text-xs font-semibold text-violet-800">AI Fraud Intelligence Advisor</span>
          {advice && (
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${FRAUD_HEALTH_BADGE[advice.fraud_health] ?? ''}`}>
              {advice.fraud_health}
            </span>
          )}
          {advice && (
            <span className="text-xs text-violet-500">
              {advice.pending_review} pending · {advice.confirmed_fraud} confirmed · {advice.total_cases} total
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-5 pt-4 space-y-5">
          {loading && <p className="text-xs text-utu-text-muted italic">Loading fraud intelligence…</p>}

          {!loading && !advice && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-utu-text-secondary">
                Run AI Fraud Intelligence to surface emerging threat vectors, detection rule gaps, high-risk patterns (card-not-present, refund abuse, loyalty fraud), and false positive analysis.
              </p>
              <button onClick={handleAnalyze} disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {running ? 'Analysing…' : '✦ Run Fraud Intelligence'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {advice && !loading && (
            <>
              <p className="text-sm text-utu-text-secondary leading-relaxed">{advice.executive_summary}</p>

              {advice.threat_vectors.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Threat Vectors</h3>
                  <div className="space-y-2">
                    {advice.threat_vectors.map((v, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${FRAUD_SEV_COLORS[v.severity] ?? ''}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-semibold">{v.vector}</p>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ${FRAUD_SEV_COLORS[v.severity] ?? ''}`}>{v.severity}</span>
                            <span className={`rounded-md px-1.5 py-0.5 text-xs capitalize ${
                              v.trend === 'increasing' ? 'bg-red-100 text-red-700' :
                              v.trend === 'decreasing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>{v.trend}</span>
                          </div>
                        </div>
                        <p className="text-xs mt-0.5 opacity-80">{v.evidence}</p>
                        <p className="text-xs mt-0.5 italic opacity-70">{v.countermeasure}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.rule_gaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">Detection Rule Gaps</h3>
                  <div className="space-y-2">
                    {advice.rule_gaps.map((g, i) => (
                      <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                        <p className="text-xs font-semibold text-orange-800">{g.gap} <span className="font-normal text-orange-600">— {g.fraud_type}</span></p>
                        <p className="text-xs text-orange-600 mt-0.5">{g.risk}</p>
                        <p className="text-xs text-orange-500 mt-0.5 italic">Add rule: {g.rule_to_add}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.high_risk_patterns.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-2">High-Risk Patterns</h3>
                  <div className="space-y-2">
                    {advice.high_risk_patterns.map((p, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-utu-text-primary">{p.pattern}</p>
                          <p className="text-xs text-utu-text-secondary mt-0.5">{p.volume} · Exposure: {p.loss_exposure}</p>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${DETECTION_COLORS[p.detection_status] ?? ''}`}>{p.detection_status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advice.watchlist_assessment && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">Watchlist Assessment</p>
                    <p className="text-xs text-utu-text-secondary">{advice.watchlist_assessment}</p>
                  </div>
                )}
                {advice.false_positive_analysis && (
                  <div className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-utu-text-muted mb-1">False Positive Analysis</p>
                    <p className="text-xs text-utu-text-secondary">{advice.false_positive_analysis}</p>
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

// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Review Queue', 'Rules', 'Watchlist', 'Decision Audit'] as const;
type Tab = typeof TABS[number];

const CASE_STATUSES = ['pending', 'reviewing', 'confirmed_fraud', 'false_positive', 'escalated'];
const RULE_TYPES = ['threshold','velocity','geo','device','card','pattern','ml'];
const RULE_ACTIONS = ['flag','block','review','allow'];
const SEVERITIES = ['critical','high','medium','low'];
const WATCHLIST_TYPES = ['email','ip','card_bin','device_id','phone'];

function RiskBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'bg-red-100 text-red-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[severity] ?? 'bg-gray-100 text-gray-500'}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    reviewing: 'bg-blue-100 text-blue-700',
    confirmed_fraud: 'bg-red-100 text-red-700',
    false_positive: 'bg-green-100 text-green-700',
    escalated: 'bg-purple-100 text-purple-700',
    open: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>{status.replace('_', ' ')}</span>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = {
    confirmed_fraud: 'bg-red-100 text-red-700',
    false_positive: 'bg-green-100 text-green-700',
    escalated: 'bg-purple-100 text-purple-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[decision] ?? 'bg-gray-100 text-gray-500'}`}>{decision.replace('_', ' ')}</span>;
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    block: 'bg-red-100 text-red-700',
    flag: 'bg-amber-100 text-amber-700',
    review: 'bg-blue-100 text-blue-700',
    allow: 'bg-green-100 text-green-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[action] ?? 'bg-gray-100 text-gray-500'}`}>{action}</span>;
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: FraudStats | undefined }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending Review', value: stats?.pending_cases ?? '—', warn: (stats?.pending_cases ?? 0) > 0 },
          { label: 'Confirmed Fraud (SAR)', value: stats?.confirmed_fraud_sar ? `SAR ${Number(stats.confirmed_fraud_sar).toLocaleString()}` : '—', warn: true },
          { label: 'False Positive Rate', value: stats?.false_positive_rate ? `${Number(stats.false_positive_rate).toFixed(1)}%` : '—' },
          { label: 'Active Rules', value: stats?.active_rules ?? '—' },
          { label: 'Watchlist Entries', value: stats?.watchlist_entries ?? '—' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.warn && (stats?.pending_cases ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Risk Score Distribution</h3>
        <div className="flex items-end gap-4 h-20">
          {[
            { label: '0–24', color: 'bg-green-400' },
            { label: '25–49', color: 'bg-yellow-400' },
            { label: '50–74', color: 'bg-amber-500' },
            { label: '75–100', color: 'bg-red-500' },
          ].map(b => (
            <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-full rounded-t ${b.color} opacity-80`} style={{ height: '60%' }} />
              <span className="text-xs text-gray-400">{b.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Indicative distribution — connect real-time analytics for live data</p>
      </div>
    </div>
  );
}

// ─── AI Fraud Scorer Panel ────────────────────────────────────────────────────

const THREAT_CONFIG: Record<FraudThreatLevel, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: 'Critical Threat', bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-600' },
  high:     { label: 'High Risk',       bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  medium:   { label: 'Medium Risk',     bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  low:      { label: 'Low Risk',        bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
};

const VERDICT_CONFIG: Record<FraudVerdict, { label: string; bg: string; text: string }> = {
  block:    { label: 'BLOCK',    bg: 'bg-red-600',    text: 'text-white' },
  escalate: { label: 'ESCALATE', bg: 'bg-orange-500', text: 'text-white' },
  review:   { label: 'REVIEW',   bg: 'bg-amber-500',  text: 'text-white' },
  clear:    { label: 'CLEAR',    bg: 'bg-green-600',  text: 'text-white' },
};

function AIFraudPanel({ caseId }: { caseId: string }) {
  const [score,   setScore]   = useState<FraudScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getFraudScore(caseId)
      .then(r => { if (!cancelled) { setScore(r); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId, open]);

  async function handleScore() {
    setRunning(true);
    setError('');
    try {
      const res = await scoreFraudCase(caseId);
      if (res.data) setScore(res.data);
      else setError('Scoring failed. Please try again.');
    } catch {
      setError('Failed to run AI scoring. Check your connection.');
    } finally {
      setRunning(false);
    }
  }

  const threat  = score ? THREAT_CONFIG[score.threat_level] : null;
  const verdict = score ? VERDICT_CONFIG[score.verdict]     : null;

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-600 text-base">✦</span>
          <span className="text-xs font-semibold text-violet-800">AI Fraud Assessment</span>
          {score && verdict && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${verdict.bg} ${verdict.text}`}>
              {verdict.label}
            </span>
          )}
          {score && (
            <span className="text-xs text-violet-500 font-normal">
              · {new Date(score.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <span className="text-xs text-violet-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-violet-200 px-4 pb-4 pt-3 space-y-3">
          {loading && <p className="text-xs text-gray-500 italic">Loading assessment…</p>}

          {!loading && !score && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-gray-600">
                No AI assessment yet. Run AI Fraud Scoring to get threat level, verdict, evidence summary, and watchlist recommendations — cross-referenced against prior decisions and watchlist hits.
              </p>
              <button
                onClick={handleScore}
                disabled={running}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {running ? 'Scoring…' : 'Score with AI'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {score && !loading && (
            <>
              {/* Verdict + threat + confidence */}
              <div className="flex flex-wrap items-center gap-2">
                {verdict && (
                  <span className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide ${verdict.bg} ${verdict.text}`}>
                    {verdict.label}
                  </span>
                )}
                {threat && (
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${threat.bg} ${threat.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${threat.dot}`} />
                    {threat.label}
                  </span>
                )}
                <span className="text-xs text-gray-500">{score.confidence}% confidence</span>
                <button
                  onClick={handleScore}
                  disabled={running}
                  className="ms-auto rounded border border-violet-300 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Re-scoring…' : 'Re-score'}
                </button>
              </div>

              {/* Evidence summary */}
              {score.evidence_summary && (
                <p className="text-xs text-gray-700 leading-relaxed">{score.evidence_summary}</p>
              )}

              {/* Key indicators + mitigating factors */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {score.key_indicators.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                    <p className="mb-2 text-xs font-semibold text-red-800">Key Indicators</p>
                    <ul className="space-y-1">
                      {score.key_indicators.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          <span className="text-xs text-red-800 leading-relaxed">{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {score.mitigating_factors.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50/60 p-3">
                    <p className="mb-2 text-xs font-semibold text-green-800">Mitigating Factors</p>
                    <ul className="space-y-1">
                      {score.mitigating_factors.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                          <span className="text-xs text-green-800 leading-relaxed">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended action */}
              {score.recommended_action && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5">
                  <p className="text-xs font-semibold text-violet-800 mb-1">Recommended Action</p>
                  <p className="text-xs text-violet-900 leading-relaxed">{score.recommended_action}</p>
                </div>
              )}

              {/* Watchlist suggestion */}
              {score.watchlist_should_add && score.watchlist_type && (
                <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5">
                  <p className="text-xs font-bold text-orange-800 mb-0.5">
                    Watchlist Recommendation — Add {score.watchlist_type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-orange-800 leading-relaxed">{score.watchlist_reason}</p>
                </div>
              )}

              {/* Pattern note */}
              {score.pattern_note && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Pattern Match</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{score.pattern_note}</p>
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

// ─── Review Queue ─────────────────────────────────────────────────────────────

function CasePanel({ caseData, onClose, onSaved }: { caseData: FraudCase; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(caseData.status);
  const [reason, setReason] = useState(caseData.decision_reason ?? '');
  const [assignedTo, setAssignedTo] = useState(caseData.assigned_to ?? '');

  const save = useMutation({
    mutationFn: (body: Partial<FraudCase>) => updateFraudCase(caseData.id, body),
    onSuccess: () => { onSaved(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Case Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Booking Ref</span><span className="font-mono">{caseData.booking_ref ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">User Email</span><span>{caseData.user_email ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount SAR</span><span>{caseData.amount_sar ? `SAR ${Number(caseData.amount_sar).toLocaleString()}` : '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Country</span><span>{caseData.country ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">IP</span><span className="font-mono text-xs">{caseData.ip_address ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Risk Score</span><RiskBadge score={caseData.risk_score} /></div>
          {caseData.flags?.length > 0 && (
            <div><span className="text-gray-500">Flags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {caseData.flags.map(f => <span key={f} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{f}</span>)}
              </div>
            </div>
          )}
        </div>

        <h3 className="font-medium text-gray-800 mb-3">Make Decision</h3>
        <form onSubmit={e => { e.preventDefault(); save.mutate({ status, decision_reason: reason, assigned_to: assignedTo }); }} className="space-y-3">
          <div><label className="text-xs text-gray-500">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
              {CASE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-gray-500">Assigned To</label><input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          <div><label className="text-xs text-gray-500">Decision Reason {['confirmed_fraud','false_positive','escalated'].includes(status) ? '*' : ''}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save Decision</button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>

        {/* AI Fraud Assessment */}
        <AIFraudPanel caseId={caseData.id} />
      </div>
    </div>
  );
}

function ReviewQueueTab() {
  const qc = useQueryClient();
  const [minRisk, setMinRisk] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);

  const { data } = useQuery({
    queryKey: ['fraud', 'cases', minRisk, statusFilter],
    queryFn: () => getFraudCases({ min_risk: minRisk, status: statusFilter }),
  });
  const rows: FraudCase[] = (data as any)?.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => deleteFraudCase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud', 'cases'] }),
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex gap-2">
          {[{ label: 'All', val: '' }, { label: '50+ Risk', val: '50' }, { label: '75+ Risk', val: '75' }].map(f => (
            <button key={f.val} onClick={() => setMinRisk(f.val)} className={`text-xs px-3 py-1.5 rounded-full border ${minRisk === f.val ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{f.label}</button>
          ))}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          {CASE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Booking Ref</th>
              <th className="px-4 py-3">User Email</th>
              <th className="px-4 py-3">Amount SAR</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><RiskBadge score={r.risk_score} /></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.booking_ref ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.user_email ?? '—'}</td>
                <td className="px-4 py-3">{r.amount_sar ? `SAR ${Number(r.amount_sar).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.country ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.flags ?? []).slice(0, 2).map(f => <span key={f} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{f}</span>)}
                    {(r.flags ?? []).length > 2 && <span className="text-xs text-gray-400">+{r.flags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.assigned_to ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setSelectedCase(r)} className="text-blue-600 hover:underline text-xs">Review</button>
                  <button onClick={() => { if (confirm('Delete case?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No cases found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCase && (
        <CasePanel
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['fraud', 'cases'] })}
        />
      )}
    </div>
  );
}

// ─── Rules ────────────────────────────────────────────────────────────────────

function RulesTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [panel, setPanel] = useState<Partial<FraudRule> | null>(null);

  const { data } = useQuery({
    queryKey: ['fraud', 'rules', typeFilter, activeFilter],
    queryFn: () => getFraudRules({ type: typeFilter, active: activeFilter }),
  });
  const rows: FraudRule[] = (data as any)?.data ?? [];

  const save = useMutation({
    mutationFn: (body: Partial<FraudRule>) =>
      panel?.id ? updateFraudRule(panel.id!, body) : createFraudRule(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fraud', 'rules'] }); setPanel(null); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFraudRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud', 'rules'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Types</option>
          {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={() => setPanel({ condition: {} })} className="ms-auto bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700">+ New Rule</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Hit Count</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.type}</td>
                <td className="px-4 py-3"><ActionBadge action={r.action} /></td>
                <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
                <td className="px-4 py-3 text-gray-600">{r.hit_count.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.active ? 'Active' : 'Off'}</span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setPanel(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => { if (confirm('Delete rule?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No rules found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {panel !== null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{panel.id ? 'Edit Rule' : 'New Rule'}</h2>
            <form onSubmit={e => { e.preventDefault(); save.mutate(panel); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Name *</label><input required value={panel.name ?? ''} onChange={e => setPanel(p => ({ ...p!, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Type</label>
                <select value={panel.type ?? 'threshold'} onChange={e => setPanel(p => ({ ...p!, type: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Action</label>
                <select value={panel.action ?? 'flag'} onChange={e => setPanel(p => ({ ...p!, action: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {RULE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Severity</label>
                <select value={panel.severity ?? 'medium'} onChange={e => setPanel(p => ({ ...p!, severity: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Description</label><textarea value={panel.description ?? ''} onChange={e => setPanel(p => ({ ...p!, description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Condition (JSON) *</label>
                <textarea
                  required
                  value={typeof panel.condition === 'object' ? JSON.stringify(panel.condition, null, 2) : (panel.condition ?? '{}')}
                  onChange={e => { try { setPanel(p => ({ ...p!, condition: JSON.parse(e.target.value) })); } catch { setPanel(p => ({ ...p!, condition: e.target.value as any })); } }}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="rule_active" checked={panel.active !== false} onChange={e => setPanel(p => ({ ...p!, active: e.target.checked }))} />
                <label htmlFor="rule_active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setPanel(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

function WatchlistTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [addPanel, setAddPanel] = useState(false);
  const [form, setForm] = useState<{ type: string; value: string; reason: string; severity: string; expires_at: string }>({ type: 'email', value: '', reason: '', severity: 'high', expires_at: '' });

  const { data } = useQuery({
    queryKey: ['fraud', 'watchlist', typeFilter],
    queryFn: () => getFraudWatchlist({ type: typeFilter }),
  });
  const rows: FraudWatchlistEntry[] = (data as any)?.data ?? [];

  const add = useMutation({
    mutationFn: (body: typeof form) => createFraudWatchlistEntry(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fraud', 'watchlist'] }); setAddPanel(false); setForm({ type: 'email', value: '', reason: '', severity: 'high', expires_at: '' }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFraudWatchlistEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud', 'watchlist'] }),
  });

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Types</option>
          {WATCHLIST_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <button onClick={() => setAddPanel(true)} className="ms-auto bg-red-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-red-700">+ Add Entry</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Added By</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.type.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.value}</td>
                <td className="px-4 py-3 text-gray-600">{r.reason}</td>
                <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
                <td className="px-4 py-3 text-gray-500">{r.added_by}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { if (confirm('Remove from watchlist?')) remove.mutate(r.id); }} className="text-red-500 hover:underline text-xs">Remove</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Watchlist is empty</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {addPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Add Watchlist Entry</h2>
            <form onSubmit={e => { e.preventDefault(); add.mutate(form); }} className="space-y-3">
              <div><label className="text-xs text-gray-500">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {WATCHLIST_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Value *</label><input required value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. user@example.com or 192.168.1.1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Reason *</label><textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-xs text-gray-500">Severity</label>
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  {['critical','high','medium'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500">Expires At (optional)</label><input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={add.isPending} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">Add to Watchlist</button>
                <button type="button" onClick={() => setAddPanel(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Decision Audit ───────────────────────────────────────────────────────────

function DecisionAuditTab() {
  const { data } = useQuery({
    queryKey: ['fraud', 'decisions'],
    queryFn: () => getFraudDecisions(),
  });
  const rows: FraudDecision[] = (data as any)?.data ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs text-gray-500">
            <th className="px-4 py-3">Booking Ref</th>
            <th className="px-4 py-3">Decision</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Decided By</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.booking_ref ?? '—'}</td>
              <td className="px-4 py-3"><DecisionBadge decision={r.decision} /></td>
              <td className="px-4 py-3 text-gray-600 max-w-xs">{r.reason}</td>
              <td className="px-4 py-3 text-gray-500">{r.decided_by}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.decided_at).toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No decisions recorded yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FraudPage() {
  const [tab, setTab] = useState<Tab>('Overview');

  const { data: statsData } = useQuery({
    queryKey: ['fraud', 'stats'],
    queryFn: () => getFraudStats(),
  });
  const stats: FraudStats | undefined = (statsData as any)?.data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fraud & Risk</h1>
        <p className="text-sm text-gray-500 mt-1">Case review, detection rules, watchlist, and decision audit trail</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'Review Queue' && (stats?.pending_cases ?? 0) > 0 && (
              <span className="ms-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{stats!.pending_cases}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <><AIFraudAdvisorPanel /><OverviewTab stats={stats} /></>}
      {tab === 'Review Queue' && <ReviewQueueTab />}
      {tab === 'Rules' && <RulesTab />}
      {tab === 'Watchlist' && <WatchlistTab />}
      {tab === 'Decision Audit' && <DecisionAuditTab />}
    </div>
  );
}
