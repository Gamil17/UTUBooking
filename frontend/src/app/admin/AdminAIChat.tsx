'use client';

/**
 * AdminAIChat — floating chat widget powered by Claude claude-sonnet-4-6.
 *
 * Renders a fixed bottom-right button that opens a slide-up panel.
 * Each turn is sent to POST /api/admin/ai-assistant with the last 10
 * messages of history so Claude has context for follow-up questions.
 *
 * Tool call indicators show the admin which live data was fetched.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  ChevronDown,
  Database,
} from 'lucide-react';
import { adminAiChat, type AiChatMessage } from '@/lib/api';

// ── Tool-name → human label ───────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  // Workflow
  get_workflow_stats:          'Task Stats',
  get_workflow_overview:       'Workflow Overview',
  get_workflow_by_department:  'Dept Breakdown',
  get_workflow_bottlenecks:    'Bottlenecks',
  get_workflow_definitions:    'Definitions',
  get_overdue_workflows:       'Overdue Items',
  get_workflow_dashboard:      'Dashboard',
  get_active_instances:        'Active Instances',
  get_workflow_trend:          'Trend Data',
  // Finance
  get_finance_summary:         'Finance Summary',
  get_pending_expense_claims:  'Expense Claims',
  // HR
  get_hr_summary:              'HR Summary',
  get_pending_leave_requests:  'Leave Requests',
  // Sales
  get_sales_pipeline:          'Sales Pipeline',
  get_deals_needing_attention: 'Deals at Risk',
  // Customer Success
  get_cs_summary:              'Account Health',
  // Procurement
  get_procurement_summary:     'Procurement',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  role:       'user' | 'assistant';
  content:    string;
  toolsUsed?: string[];
}

// ── Suggested prompts shown when chat is empty ────────────────────────────────

const SUGGESTIONS = [
  'Give me an operations briefing across all departments.',
  'What workflows are overdue and which expense claims are waiting?',
  'Show me the sales pipeline and any deals needing attention.',
  'Which customer accounts are at risk and what are the open escalations?',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminAIChat() {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  // Build API history from display messages (last 10 turns)
  const buildHistory = useCallback((): AiChatMessage[] =>
    messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
  [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: DisplayMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const history = buildHistory();
      const res = await adminAiChat(trimmed, history);

      if (res?.response) {
        const assistantMsg: DisplayMessage = {
          role:     'assistant',
          content:  res.response,
          toolsUsed: res.tool_calls_made ?? [],
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(res?.error ?? 'Empty response from AI');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      // Remove the user message on hard failure so it can be retried
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [loading, buildHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI assistant"
        className={[
          'fixed bottom-6 end-6 z-50',
          'flex items-center gap-2 rounded-full px-4 py-3',
          'bg-utu-blue text-white shadow-lg',
          'hover:bg-blue-700 active:scale-95 transition-all',
          open ? 'opacity-0 pointer-events-none' : 'opacity-100',
        ].join(' ')}
      >
        <Sparkles size={18} />
        <span className="text-sm font-medium">AI Assistant</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          className={[
            'fixed bottom-6 end-6 z-50',
            'flex flex-col',
            'w-[420px] max-w-[calc(100vw-2rem)]',
            'h-[600px] max-h-[calc(100vh-6rem)]',
            'rounded-utu-card border border-utu-border-default',
            'bg-utu-bg-card shadow-2xl',
            'overflow-hidden',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-utu-border-default bg-utu-blue px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-white" />
              <span className="text-sm font-semibold text-white">AI Executive Assistant</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">Live data</span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="rounded p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  title="Clear chat"
                >
                  <ChevronDown size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="space-y-4">
                <p className="text-xs text-utu-text-muted text-center pt-2">
                  Ask me anything about workflows, approvals, or platform operations.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className={[
                        'text-start rounded-lg border border-utu-border-default',
                        'px-3 py-2 text-xs text-utu-text-secondary',
                        'hover:border-utu-blue hover:text-utu-blue hover:bg-blue-50',
                        'transition-colors',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-utu-blue text-white rounded-br-sm'
                      : 'bg-utu-bg-muted text-utu-text-primary rounded-bl-sm border border-utu-border-default',
                  ].join(' ')}
                >
                  {/* Tool call indicator for assistant messages */}
                  {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {msg.toolsUsed.map(t => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700"
                        >
                          <Database size={9} />
                          {TOOL_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Message content — preserve newlines */}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-utu-border-default bg-utu-bg-muted px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-utu-blue" />
                    <span className="text-xs text-utu-text-muted">Fetching live data...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-utu-border-default bg-utu-bg-card p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about workflows, approvals, operations..."
                rows={1}
                disabled={loading}
                className={[
                  'flex-1 resize-none rounded-lg border border-utu-border-default',
                  'bg-utu-bg-page px-3 py-2 text-sm text-utu-text-primary',
                  'placeholder:text-utu-text-muted',
                  'focus:border-utu-blue focus:outline-none focus:ring-1 focus:ring-utu-blue',
                  'disabled:opacity-50',
                  'max-h-28 overflow-y-auto',
                ].join(' ')}
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  'bg-utu-blue text-white transition-colors',
                  'hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
                aria-label="Send"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-utu-text-muted">
              Enter to send · Shift+Enter for new line · Powered by Claude
            </p>
          </div>
        </div>
      )}
    </>
  );
}
