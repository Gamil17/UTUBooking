'use client';

/**
 * /admin/briefings — AI Daily Briefings
 *
 * Lists past AI-generated executive briefings and allows manual regeneration.
 * Briefings are auto-generated at 08:00 Riyadh time by the daily-briefing cron job.
 *
 * Layout:
 *  - Header with "Generate Now" button
 *  - List of past briefings (date, preview, tool count)
 *  - Slide-in panel to read the full briefing in formatted text
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Calendar,
  ChevronRight,
  X,
  Loader2,
  Database,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  listDailyBriefings,
  getDailyBriefing,
  generateDailyBriefing,
  type DailyBriefing,
} from '@/lib/api';

// ── Simple markdown → React renderer for the briefing panel ──────────────────
// Handles: # ## ### headings, **bold**, - bullets, blank lines as paragraphs.
// Safe: no dangerouslySetInnerHTML — renders as React elements.

function BriefingContent({ md }: { md: string }) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let inList = false;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length) {
      elements.push(<ul key={key++} className="mb-3 space-y-1 ps-4">{listItems}</ul>);
      listItems = [];
      inList = false;
    }
  }

  function renderInline(text: string): React.ReactNode {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        const inner = p.slice(2, -2);
        const isUrgent = inner.startsWith('URGENT');
        return (
          <strong key={i} className={isUrgent ? 'text-red-600' : 'text-utu-text-primary'}>
            {inner}
          </strong>
        );
      }
      return p;
    });
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} className="mb-3 mt-1 text-xl font-bold text-utu-text-primary border-b border-utu-border-default pb-2">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="mb-2 mt-5 text-base font-semibold text-utu-blue">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="mb-1 mt-3 text-sm font-semibold text-utu-text-primary">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      inList = true;
      const content = line.slice(2);
      listItems.push(
        <li key={key++} className="text-sm text-utu-text-secondary leading-relaxed list-disc">
          {renderInline(content)}
        </li>,
      );
    } else if (line === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={key++} className="mb-2 text-sm text-utu-text-secondary leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushList();

  return <div>{elements}</div>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BriefingsPage() {
  const [briefings,    setBriefings]    = useState<DailyBriefing[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [selected,     setSelected]     = useState<DailyBriefing | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [generateMsg,  setGenerateMsg]  = useState<string | null>(null);

  const fetchBriefings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDailyBriefings(20, 0);
      setBriefings(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setError('Failed to load briefings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBriefings(); }, [fetchBriefings]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateMsg(null);
    setError(null);
    try {
      const res = await generateDailyBriefing();
      if (res?.data) {
        setGenerateMsg('Briefing generated successfully');
        setBriefings(prev => {
          const filtered = prev.filter(b => b.briefing_date !== res.data.briefing_date);
          return [res.data, ...filtered];
        });
        setTotal(t => t + (briefings.some(b => b.briefing_date === res.data.briefing_date) ? 0 : 1));
        setSelected(res.data);
      } else {
        setError(res?.message ?? 'Generation failed');
      }
    } catch {
      setError('Failed to generate briefing');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const isToday = (d: string) =>
    new Date(d).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

  // Fetch full briefing content when opening the panel
  const openBriefing = async (b: DailyBriefing) => {
    // If we already have the full content (e.g. freshly generated), show it immediately
    if (b.content_md && b.content_md.length > 300) {
      setSelected(b);
      return;
    }
    setSelected(b); // open panel with preview while loading
    setPanelLoading(true);
    try {
      const res = await getDailyBriefing(b.id);
      if (res?.data) setSelected(res.data);
    } catch {
      // Leave the panel open with whatever partial content exists
    } finally {
      setPanelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-utu-text-primary">
            <Sparkles className="text-utu-blue" size={24} />
            AI Daily Briefings
          </h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Auto-generated at 08:00 Riyadh time — {total} briefing{total !== 1 ? 's' : ''} stored
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={[
            'flex items-center gap-2 rounded-lg px-4 py-2',
            'bg-utu-blue text-white text-sm font-medium',
            'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          ].join(' ')}
        >
          {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {generating ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      {/* Status messages */}
      {generateMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {generateMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Briefings list */}
      <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-utu-blue" size={24} />
          </div>
        ) : briefings.length === 0 ? (
          <div className="py-16 text-center">
            <Sparkles size={40} className="mx-auto mb-3 text-utu-text-muted opacity-40" />
            <p className="text-sm text-utu-text-muted">No briefings yet.</p>
            <p className="text-xs text-utu-text-muted mt-1">
              Click "Generate Now" or wait for the 08:00 automatic run.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-utu-border-default">
            {briefings.map(b => (
              <li key={b.id}>
                <button
                  onClick={() => openBriefing(b)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-start hover:bg-utu-bg-muted transition-colors"
                >
                  {/* Date badge */}
                  <div className={[
                    'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold',
                    isToday(b.briefing_date)
                      ? 'bg-utu-blue text-white'
                      : 'bg-utu-bg-muted text-utu-text-secondary border border-utu-border-default',
                  ].join(' ')}>
                    <span>{new Date(b.briefing_date).toLocaleDateString('en-GB', { day: 'numeric' })}</span>
                    <span className="text-[10px] font-normal">
                      {new Date(b.briefing_date).toLocaleDateString('en-GB', { month: 'short' })}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-utu-text-primary">
                        {formatDate(b.briefing_date)}
                      </span>
                      {isToday(b.briefing_date) && (
                        <span className="rounded-full bg-utu-blue px-2 py-0.5 text-[10px] font-medium text-white">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-utu-text-muted">
                      {b.preview?.replace(/^#+ /gm, '').replace(/\*\*/g, '').slice(0, 180)}...
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-utu-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(b.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Database size={10} />
                        {b.tool_count ?? 0} data sources
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="mt-1 shrink-0 text-utu-text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Briefing detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col border-s border-utu-border-default bg-utu-bg-card shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-utu-border-default bg-utu-blue px-5 py-4">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-white" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Daily Briefing
                  </p>
                  <p className="text-xs text-white/70">
                    {formatDate(selected.briefing_date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Meta bar */}
            <div className="flex items-center gap-4 border-b border-utu-border-default bg-utu-bg-muted px-5 py-2">
              <span className="flex items-center gap-1 text-xs text-utu-text-muted">
                <Calendar size={11} />
                Generated {new Date(selected.generated_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1 text-xs text-utu-text-muted">
                <Database size={11} />
                {selected.tool_calls?.length ?? 0} data sources queried
              </span>
            </div>

            {/* Briefing content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {panelLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-utu-blue" size={24} />
                </div>
              ) : (
                <BriefingContent md={selected.content_md ?? selected.preview ?? ''} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
