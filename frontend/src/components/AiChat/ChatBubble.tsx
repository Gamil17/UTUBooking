'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export default function ChatBubble({ isOpen, onClick, hasUnread = false }: Props) {
  const [showPulse, setShowPulse] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show pulse ring after 30s of inactivity to draw attention
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing pulse on open is a direct response to isOpen prop; no viable alternative
      setShowPulse(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    idleTimer.current = setTimeout(() => setShowPulse(true), 30_000);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isOpen]);

  const handleClick = () => {
    setShowPulse(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    onClick();
  };

  return (
    // Always dir="ltr" so fixed bottom-right position is not flipped by RTL layout
    <div
      className="fixed bottom-6 right-6 z-50"
      dir="ltr"
      style={{ isolation: 'isolate' }}
    >
      {/* Pulse ring — shown when idle */}
      {showPulse && !isOpen && (
        <span
          className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping"
          aria-hidden="true"
        />
      )}

      {/* Unread dot */}
      {hasUnread && !isOpen && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
          aria-hidden="true"
        />
      )}

      <button
        onClick={handleClick}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={isOpen}
        className={[
          'relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
          'text-white text-2xl transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-emerald-300',
          'hover:scale-105 active:scale-95',
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700' /* EXCEPTION: AI chat dark action button */
            : 'bg-emerald-500 hover:bg-emerald-600',
        ].join(' ')}
      >
        <span aria-hidden="true">{isOpen ? '✕' : '💬'}</span>
      </button>
    </div>
  );
}
