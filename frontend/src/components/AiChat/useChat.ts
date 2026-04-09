'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface ToolEvent {
  type: 'tool_start' | 'tool_result';
  name: string;
  result?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolEvents?: ToolEvent[];
  pending?: boolean;
}

// ─── Session ID ───────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('amec_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('amec_session', id);
  }
  return id;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<string>('en');

  const sessionId = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  // Initialise sessionId and language on mount
  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    setLang(document.documentElement.lang || 'en');

    // Watch for language changes from the HTML lang attribute
    const observer = new MutationObserver(() => {
      setLang(document.documentElement.lang || 'en');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });

    return () => observer.disconnect();
  }, []);

  // Load existing history from Redis on mount
  useEffect(() => {
    if (!sessionId.current) return;
    fetch(`/api/chat/history?sessionId=${sessionId.current}`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(({ messages: history }: { messages: { role: string; content: string }[] }) => {
        if (!Array.isArray(history) || history.length === 0) return;
        const loaded: ChatMessage[] = history
          .filter(m => typeof m.content === 'string')
          .map(m => ({
            id: crypto.randomUUID(),
            role: m.role as MessageRole,
            content: m.content,
          }));
        setMessages(loaded);
      })
      .catch(() => {/* history load failure is non-fatal */});
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      toolEvents: [],
      pending: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: sessionId.current,
          lang,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              text?: string;
              name?: string;
              result?: string;
              message?: string;
            };

            setMessages(prev => {
              const msgs = [...prev];
              const last = msgs[msgs.length - 1];
              if (!last || last.role !== 'assistant') return msgs;

              if (event.type === 'text' && event.text) {
                return [
                  ...msgs.slice(0, -1),
                  { ...last, content: last.content + event.text },
                ];
              }

              if (event.type === 'tool_start' && event.name) {
                return [
                  ...msgs.slice(0, -1),
                  {
                    ...last,
                    toolEvents: [
                      ...(last.toolEvents ?? []),
                      { type: 'tool_start', name: event.name },
                    ],
                  },
                ];
              }

              if (event.type === 'tool_result' && event.name) {
                return [
                  ...msgs.slice(0, -1),
                  {
                    ...last,
                    toolEvents: [
                      ...(last.toolEvents ?? []),
                      { type: 'tool_result', name: event.name, result: event.result },
                    ],
                  },
                ];
              }

              if (event.type === 'done') {
                return [...msgs.slice(0, -1), { ...last, pending: false }];
              }

              if (event.type === 'error') {
                setError(event.message ?? 'An error occurred');
                return [...msgs.slice(0, -1), { ...last, pending: false }];
              }

              return msgs;
            });
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Connection error. Please try again.');
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, pending: false }];
          }
          return prev;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { messages, isLoading, error, lang, sendMessage, clearError };
}
