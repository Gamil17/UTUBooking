'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatLogEntry {
  sessionId:    string;
  userMsg:      string;
  assistantMsg: string;
  toolsUsed:    string[];
  inputTokens:  number;
  outputTokens: number;
  durationMs:   number;
  lang:         string;
  ts:           string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchChatLogs(limit: number): Promise<{ logs: ChatLogEntry[]; count: number }> {
  const res = await fetch(`/api/admin/chat-logs?limit=${limit}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load chat logs');
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
    </div>
  );
}

const LANG_LABELS: Record<string, string> = {
  en: 'EN', ar: 'AR', fr: 'FR', tr: 'TR', id: 'ID',
  ms: 'MS', ur: 'UR', hi: 'HI', fa: 'FA', de: 'DE',
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiChatLogsPage() {
  const [limit,      setLimit]      = useState(100);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [langFilter, setLangFilter] = useState('');
  const [search,     setSearch]     = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey:  ['admin-chat-logs', limit],
    queryFn:   () => fetchChatLogs(limit),
    refetchInterval: 60_000,
  });

  const logs: ChatLogEntry[] = (data?.logs ?? []).filter((l) => {
    if (langFilter && l.lang !== langFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.userMsg.toLowerCase().includes(q) || l.sessionId.toLowerCase().includes(q);
    }
    return true;
  });

  // Aggregate stats
  const totalTokens   = logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0);
  const avgDuration   = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / logs.length / 1000 * 10) / 10
    : 0;
  const toolUsageCounts = logs.reduce<Record<string, number>>((acc, l) => {
    l.toolsUsed.forEach((t) => { acc[t] = (acc[t] ?? 0) + 1; });
    return acc;
  }, {});
  const topTools = Object.entries(toolUsageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const langs = [...new Set((data?.logs ?? []).map((l) => l.lang))].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-utu-text-primary">AI Chat Logs</h1>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm text-utu-text-primary hover:bg-utu-bg-muted"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Conversations shown" value={logs.length.toLocaleString()} />
        <StatCard label="Total tokens used"   value={totalTokens.toLocaleString()} />
        <StatCard label="Avg response time"   value={`${avgDuration}s`} />
        <StatCard label="Tool calls made"     value={Object.values(toolUsageCounts).reduce((s, v) => s + v, 0).toLocaleString()} />
      </div>

      {/* ── Top tools ──────────────────────────────────────────────────────── */}
      {topTools.length > 0 && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-utu-text-primary">Top tools used</h2>
          <div className="flex flex-wrap gap-2">
            {topTools.map(([tool, count]) => (
              <span
                key={tool}
                className="inline-flex items-center gap-1.5 rounded-full bg-utu-bg-subtle px-3 py-1 text-xs font-medium text-utu-blue border border-utu-border-default"
              >
                {tool}
                <span className="rounded-full bg-utu-blue text-white text-[10px] px-1.5 py-0.5">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by message or session ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue w-64"
        />
        {langs.length > 1 && (
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-2 focus:ring-utu-blue"
          >
            <option value="">All languages</option>
            {langs.map((l) => (
              <option key={l} value={l}>{LANG_LABELS[l] ?? l.toUpperCase()}</option>
            ))}
          </select>
        )}
        {(search || langFilter) && (
          <button
            onClick={() => { setSearch(''); setLangFilter(''); }}
            className="text-xs text-utu-blue hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ms-auto text-xs text-utu-text-muted">
          {logs.length} conversation{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Logs list ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-utu-bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          Failed to load chat logs. Ensure Redis is running and ADMIN_SECRET is set.
        </p>
      ) : logs.length === 0 ? (
        <p className="rounded-xl border border-utu-border-default bg-utu-bg-card p-8 text-center text-sm text-utu-text-muted">
          No chat logs found. Logs are written to Redis as users interact with the AI chat.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const key = `${log.sessionId}-${log.ts}-${i}`;
            const isExpanded = expanded === key;
            return (
              <div
                key={key}
                className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full text-start px-4 py-3 flex items-start gap-3 hover:bg-utu-bg-muted/50 transition-colors"
                >
                  {/* Lang badge */}
                  <span className="mt-0.5 shrink-0 rounded-md bg-utu-bg-subtle border border-utu-border-default px-1.5 py-0.5 text-[10px] font-bold text-utu-blue uppercase">
                    {LANG_LABELS[log.lang] ?? log.lang}
                  </span>

                  {/* Message preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-utu-text-primary truncate">
                      {log.userMsg}
                    </p>
                    <p className="text-xs text-utu-text-muted truncate mt-0.5">
                      {log.assistantMsg}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 text-end space-y-1">
                    <p className="text-xs text-utu-text-muted">
                      {new Date(log.ts).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 justify-end text-[10px] text-utu-text-muted">
                      <span>{(log.inputTokens + log.outputTokens).toLocaleString()} tok</span>
                      <span>{(log.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>

                  <svg
                    className={`w-4 h-4 shrink-0 text-utu-text-muted transition-transform mt-0.5 ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-utu-border-default px-4 py-4 space-y-4 bg-utu-bg-muted/40">
                    <div>
                      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-1">Session ID</p>
                      <p className="font-mono text-xs text-utu-text-secondary break-all">{log.sessionId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-1">User message</p>
                      <p className="text-sm text-utu-text-primary whitespace-pre-wrap">{log.userMsg}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-1">Assistant response</p>
                      <p className="text-sm text-utu-text-secondary whitespace-pre-wrap">{log.assistantMsg}</p>
                    </div>
                    {log.toolsUsed.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wide mb-2">Tools used</p>
                        <div className="flex flex-wrap gap-1.5">
                          {log.toolsUsed.map((tool, ti) => (
                            <span
                              key={ti}
                              className="rounded-full bg-utu-bg-card border border-utu-border-default px-2.5 py-0.5 text-xs font-medium text-utu-text-secondary"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-6 text-xs text-utu-text-muted">
                      <span>Input tokens: <strong className="text-utu-text-secondary">{log.inputTokens.toLocaleString()}</strong></span>
                      <span>Output tokens: <strong className="text-utu-text-secondary">{log.outputTokens.toLocaleString()}</strong></span>
                      <span>Duration: <strong className="text-utu-text-secondary">{(log.durationMs / 1000).toFixed(2)}s</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
