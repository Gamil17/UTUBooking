'use client';

import { useEffect, useRef, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType } from './useChat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  lang: string;
  onSend: (text: string) => void;
  onClearError: () => void;
}

export default function ChatPanel({
  isOpen,
  onClose,
  messages,
  isLoading,
  error,
  lang,
  onSend,
  onClearError,
}: Props) {
  const t = useTranslations('aiChat');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRTL = lang === 'ar' || lang === 'ur' || lang === 'fa';
  const dir: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';

  const quickStarts = [t('qs1'), t('qs2'), t('qs3')];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('dialogLabel')}
        dir={dir}
        className={[
          'fixed top-0 right-0 h-full z-50 flex flex-col',
          'w-full md:w-[380px]',
          'bg-utu-bg-muted shadow-2xl border-s border-utu-border-default',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-utu-bg-subtle0 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕌</span>
            <div>
              <div className="font-bold text-sm leading-tight">{t('assistantName')}</div>
              <div className="text-white/80 text-xs">{t('assistantSubtitle')}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-utu-blue transition-colors"
            aria-label={t('closeChat')}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-live="polite"
          aria-atomic="false"
        >
          {messages.length === 0 ? (
            /* Empty state with quick-start chips */
            <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
              <div className="text-4xl">🕌</div>
              <p className="text-utu-text-muted text-sm text-center leading-relaxed">
                {t('welcomeMsg')}
              </p>
              <div className="flex flex-col gap-2 w-full">
                {quickStarts.map(qs => (
                  <button
                    key={qs}
                    onClick={() => onSend(qs)}
                    className="text-start px-3 py-2.5 rounded-xl bg-utu-bg-card border border-utu-border-default text-sm text-utu-text-secondary hover:border-utu-blue hover:bg-utu-bg-subtle transition-colors min-h-[44px]"
                  >
                    {qs}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} dir={dir} />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-2">
            <span className="text-red-700 text-xs">{error}</span>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-600 text-sm flex-shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 px-3 pb-4 pt-2 bg-utu-bg-card border-t border-utu-border-default">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={t('inputPlaceholder')}
              disabled={isLoading}
              aria-label={t('inputAriaLabel')}
              className={[
                'flex-1 resize-none rounded-xl border border-utu-border-strong px-3 py-2',
                'text-sm text-utu-text-primary placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent',
                'disabled:bg-utu-bg-muted disabled:cursor-not-allowed',
                'min-h-[44px]',
              ].join(' ')}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label={t('sendAriaLabel')}
              className={[
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                'transition-colors font-bold text-lg',
                input.trim() && !isLoading
                  ? 'bg-utu-bg-subtle0 text-white hover:bg-utu-blue'
                  : 'bg-utu-border-default text-utu-text-muted cursor-not-allowed',
              ].join(' ')}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-utu-border-strong border-t-transparent rounded-full animate-spin" />
              ) : (
                isRTL ? '←' : '→'
              )}
            </button>
          </div>
          <p className="text-center text-utu-text-muted text-xs mt-1.5">
            {t('keyboardHint')}
          </p>
        </div>
      </div>
    </>
  );
}
