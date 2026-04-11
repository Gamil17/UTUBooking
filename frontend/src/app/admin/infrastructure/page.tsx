'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegionHealth {
  id:           string;
  label:        string;
  awsRegion:    string;
  jurisdiction: string;
  markets:      string[];
  status:       'healthy' | 'degraded' | 'unreachable';
  latencyMs:    number | null;
  db:           { status: 'ok' | 'error' | 'unknown'; message?: string };
  redis:        { status: 'ok' | 'error' | 'unknown'; hitRatePercent?: number };
  connections:  { active: number | null; max: number | null };
  checkedAt:    string;
}

interface HealthResponse {
  overall:   'healthy' | 'degraded' | 'outage';
  checkedAt: string;
  regions:   RegionHealth[];
  summary: {
    totalRegions: number;
    healthy:      number;
    degraded:     number;
    unreachable:  number;
  };
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/admin/infrastructure/health', { credentials: 'include' });
  if (!res.ok && res.status !== 207 && res.status !== 503) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  healthy:     { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Healthy' },
  degraded:    { dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700',     label: 'Degraded' },
  unreachable: { dot: 'bg-red-500',     badge: 'bg-red-100 text-red-600',         label: 'Unreachable' },
  outage:      { dot: 'bg-red-600',     badge: 'bg-red-200 text-red-700',         label: 'Outage' },
  ok:          { dot: 'bg-emerald-500', label: 'OK' },
  error:       { dot: 'bg-red-500',     label: 'Error' },
  unknown:     { dot: 'bg-gray-300',    label: 'Unknown' },
} as const;

function StatusDot({ color }: { color: string }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} shrink-0`} />
  );
}

// ─── Overall banner ───────────────────────────────────────────────────────────

function OverallBanner({ overall, summary, checkedAt }: {
  overall: HealthResponse['overall'];
  summary: HealthResponse['summary'];
  checkedAt: string;
}) {
  const bannerColor =
    overall === 'healthy'  ? 'bg-emerald-50 border-emerald-200' :
    overall === 'degraded' ? 'bg-amber-50 border-amber-200'     :
    'bg-red-50 border-red-200';

  const textColor =
    overall === 'healthy'  ? 'text-emerald-800' :
    overall === 'degraded' ? 'text-amber-800'   :
    'text-red-800';

  return (
    <div className={`rounded-xl border px-5 py-4 ${bannerColor}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusDot color={STATUS_CONFIG[overall]?.dot ?? STATUS_CONFIG.unreachable.dot} />
          <span className={`font-bold text-lg capitalize ${textColor}`}>{overall}</span>
          <span className={`text-sm ${textColor} opacity-80`}>
            — {summary.healthy}/{summary.totalRegions} regions healthy
            {summary.degraded > 0 && `, ${summary.degraded} degraded`}
            {summary.unreachable > 0 && `, ${summary.unreachable} unreachable`}
          </span>
        </div>
        <span className="text-xs text-utu-text-muted">
          Checked {new Date(checkedAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ─── Region card ─────────────────────────────────────────────────────────────

function RegionCard({ region }: { region: RegionHealth }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[region.status];

  return (
    <div className={`rounded-xl border bg-utu-bg-card shadow-sm overflow-hidden ${
      region.status === 'unreachable' ? 'border-red-200' :
      region.status === 'degraded'   ? 'border-amber-200' :
      'border-utu-border-default'
    }`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-center gap-3 text-start hover:bg-utu-bg-muted/40 transition-colors"
      >
        <StatusDot color={sc.dot} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-utu-text-primary text-sm">{region.label}</p>
          <p className="text-xs text-utu-text-muted">{region.awsRegion} · {region.jurisdiction}</p>
        </div>
        <div className="shrink-0 text-end space-y-0.5">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.badge}`}>
            {sc.label}
          </span>
          {region.latencyMs != null && (
            <p className="text-xs text-utu-text-muted">{region.latencyMs}ms</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 shrink-0 text-utu-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-utu-border-default px-5 py-4 bg-utu-bg-muted/40 space-y-3">
          {/* DB */}
          <div className="flex items-center gap-2 text-sm">
            <StatusDot color={STATUS_CONFIG[region.db.status]?.dot ?? STATUS_CONFIG.unknown.dot} />
            <span className="text-utu-text-muted w-16 shrink-0">Database</span>
            <span className="font-medium text-utu-text-primary capitalize">{region.db.status}</span>
            {region.connections.active != null && (
              <span className="text-xs text-utu-text-muted ms-1">
                ({region.connections.active}/{region.connections.max ?? '?'} conns)
              </span>
            )}
            {region.db.message && (
              <span className="text-xs text-red-500 ms-1">{region.db.message}</span>
            )}
          </div>

          {/* Redis */}
          <div className="flex items-center gap-2 text-sm">
            <StatusDot color={STATUS_CONFIG[region.redis.status]?.dot ?? STATUS_CONFIG.unknown.dot} />
            <span className="text-utu-text-muted w-16 shrink-0">Redis</span>
            <span className="font-medium text-utu-text-primary capitalize">{region.redis.status}</span>
            {region.redis.hitRatePercent != null && (
              <span className="text-xs text-utu-text-muted ms-1">{region.redis.hitRatePercent}% hit rate</span>
            )}
          </div>

          {/* Markets */}
          <div className="flex items-start gap-2 text-sm">
            <span className="text-utu-text-muted w-16 shrink-0 pt-0.5">Markets</span>
            <div className="flex flex-wrap gap-1">
              {region.markets.map((m) => (
                <span key={m} className="rounded-md bg-utu-bg-card border border-utu-border-default px-1.5 py-0.5 text-[10px] font-medium text-utu-text-secondary">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Iran isolation types ─────────────────────────────────────────────────────

interface IranCheck {
  id:          number;
  name:        string;
  status:      'PASS' | 'FAIL' | 'SKIP';
  message:     string;
  durationMs:  number;
  violations?: { location: string; description: string; count?: number }[];
}

interface IranIsolationReport {
  runAt:         string;
  overallStatus: 'PASS' | 'FAIL';
  passedChecks:  number;
  totalChecks:   number;
  legalNote:     string;
  checks:        IranCheck[];
}

// ─── Iran isolation panel ─────────────────────────────────────────────────────

function IranIsolationPanel() {
  const [report,  setReport]  = useState<IranIsolationReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/admin/infrastructure/iran-isolation', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRunning(false);
    }
  }, []);

  const CHECK_STATUS_CONFIG = {
    PASS: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'PASS' },
    FAIL: { badge: 'bg-red-100 text-red-600',         dot: 'bg-red-500',     label: 'FAIL' },
    SKIP: { badge: 'bg-gray-100 text-gray-500',        dot: 'bg-gray-300',    label: 'SKIP' },
  } as const;

  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-utu-border-default">
        <div>
          <h2 className="text-base font-semibold text-utu-text-primary">Iran Isolation Check</h2>
          <p className="text-xs text-utu-text-muted mt-0.5">
            OFAC compliance — 5 checks across all DB shards, Redis, DNS, and finance tables
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={running}
          className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted disabled:opacity-50 transition-colors"
        >
          {running ? 'Running checks…' : 'Run check'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Idle state */}
        {!running && !report && !error && (
          <p className="text-sm text-utu-text-muted py-2">
            Click &ldquo;Run check&rdquo; to audit Iran data isolation across all shards.
            This can take up to 90 seconds.
          </p>
        )}

        {/* Running skeleton */}
        {running && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-utu-bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Check failed: {error}. Verify that ADMIN_SERVICE_URL is set and the admin service is reachable.
          </div>
        )}

        {/* Results */}
        {report && !running && (
          <>
            {/* Overall banner */}
            <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
              report.overallStatus === 'PASS'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <StatusDot color={report.overallStatus === 'PASS' ? 'bg-emerald-500' : 'bg-red-500'} />
              <div className="flex-1">
                <span className={`font-bold text-sm ${report.overallStatus === 'PASS' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {report.overallStatus} — {report.passedChecks}/{report.totalChecks} checks passed
                </span>
                <p className="text-xs text-utu-text-muted mt-0.5">
                  Checked {new Date(report.runAt).toLocaleString()}
                </p>
              </div>
              {report.overallStatus === 'FAIL' && (
                <span className="text-xs font-semibold text-red-600 bg-red-100 rounded-full px-2.5 py-1">
                  Escalate to Legal
                </span>
              )}
            </div>

            {/* Per-check rows */}
            <div className="space-y-2">
              {report.checks.map((check) => {
                const sc = CHECK_STATUS_CONFIG[check.status];
                return (
                  <details key={check.id} className="rounded-lg border border-utu-border-default overflow-hidden group">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-utu-bg-muted/40 transition-colors list-none">
                      <StatusDot color={sc.dot} />
                      <span className="flex-1 text-sm font-medium text-utu-text-primary">
                        {check.id}. {check.name}
                      </span>
                      <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${sc.badge}`}>
                        {sc.label}
                      </span>
                      <span className="text-xs text-utu-text-muted shrink-0">{check.durationMs}ms</span>
                      <svg className="w-4 h-4 shrink-0 text-utu-text-muted transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="border-t border-utu-border-default px-4 py-3 bg-utu-bg-muted/40 space-y-2">
                      <p className="text-xs text-utu-text-secondary">{check.message}</p>
                      {check.violations && check.violations.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {check.violations.map((v, i) => (
                            <div key={i} className="rounded-md bg-red-50 border border-red-100 px-3 py-2">
                              <p className="text-xs font-semibold text-red-700">{v.location}</p>
                              <p className="text-xs text-red-600">{v.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>

            {/* Legal note */}
            {report.overallStatus === 'FAIL' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <span className="font-semibold">Legal note: </span>{report.legalNote}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InfrastructurePage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey:        ['admin-infra-health'],
    queryFn:         fetchHealth,
    refetchInterval: 60_000,   // auto-refresh every 60s
    retry:           1,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-utu-text-primary">Infrastructure Health</h1>
          <p className="text-sm text-utu-text-muted mt-0.5">8-region parallel health probe · auto-refreshes every 60s</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-2 text-sm font-medium text-utu-text-primary hover:bg-utu-bg-muted disabled:opacity-50 transition-colors"
        >
          {isFetching ? 'Checking…' : 'Check now'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-xl bg-utu-bg-muted animate-pulse" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-utu-bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          Failed to run health probe. Check ADMIN_SECRET and that the frontend can reach the backend.
        </div>
      ) : data ? (
        <>
          <OverallBanner overall={data.overall} summary={data.summary} checkedAt={data.checkedAt} />

          {/* Summary stat row */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
            {[
              { label: 'Healthy',     value: data.summary.healthy,     color: 'text-emerald-700' },
              { label: 'Degraded',    value: data.summary.degraded,    color: 'text-amber-700' },
              { label: 'Unreachable', value: data.summary.unreachable, color: 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-utu-border-default bg-utu-bg-card px-4 py-3 shadow-sm text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-utu-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Region cards — sort: unreachable first, then degraded, then healthy */}
          <div className="space-y-2">
            {[...data.regions]
              .sort((a, b) => {
                const order = { unreachable: 0, degraded: 1, healthy: 2 };
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
              })
              .map((region) => (
                <RegionCard key={region.id} region={region} />
              ))}
          </div>
        </>
      ) : null}

      {/* Iran isolation compliance check — on-demand, separate from region poll */}
      <IranIsolationPanel />
    </div>
  );
}
