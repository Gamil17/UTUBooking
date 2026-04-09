'use client';

import { useTranslations } from 'next-intl';
import type { ChatMessage as ChatMessageType } from './useChat';

interface Props {
  message: ChatMessageType;
  dir: 'ltr' | 'rtl';
}

// Minimal markdown: **bold** and newlines
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < part.split('\n').length - 1 && <br />}
      </span>
    ));
  });
}

function ToolPill({ name, done }: { name: string; done: boolean }) {
  const tc = useTranslations('common');
  const label = done
    ? (name === 'search_hotels' ? tc('foundHotels') : name === 'search_flights' ? tc('foundFlights') : tc('foundTrip'))
    : (name === 'search_hotels' ? tc('searchingHotels') : name === 'search_flights' ? tc('searchingFlights') : tc('searchingTrip'));

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 me-1 mb-1">
      {done ? '✅' : '🔍'} {label}
    </span>
  );
}

export default function ChatMessage({ message, dir }: Props) {
  const isUser = message.role === 'user';

  // Determine which tools are done (have a tool_result event)
  const doneTools = new Set(
    (message.toolEvents ?? [])
      .filter(e => e.type === 'tool_result')
      .map(e => e.name)
  );
  const startedTools = [
    ...new Set(
      (message.toolEvents ?? [])
        .filter(e => e.type === 'tool_start')
        .map(e => e.name)
    ),
  ];

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      dir={dir}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 me-2 mt-0.5">
          A
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Tool pills (assistant only) */}
        {!isUser && startedTools.length > 0 && (
          <div className="mb-1 flex flex-wrap">
            {startedTools.map(name => (
              <ToolPill key={name} name={name} done={doneTools.has(name)} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={[
            'px-3 py-2 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-emerald-500 text-white rounded-br-sm'
              : 'bg-utu-bg-card text-utu-text-primary border border-utu-border-default rounded-bl-sm shadow-sm',
          ].join(' ')}
        >
          {message.pending && !message.content ? (
            <span className="inline-flex gap-1 items-center text-utu-text-muted">
              <span className="animate-bounce delay-0">•</span>
              <span className="animate-bounce delay-75">•</span>
              <span className="animate-bounce delay-150">•</span>
            </span>
          ) : (
            renderText(message.content)
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-utu-border-default flex items-center justify-center text-utu-text-secondary text-xs font-bold flex-shrink-0 ms-2 mt-0.5">
          U
        </div>
      )}
    </div>
  );
}
