'use client';

import { useEffect, useRef, KeyboardEvent } from 'react';
import { useState } from 'react';
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

const QUICK_STARTS_EN = [
  'Best hotels near Haram < SAR 500/night',
  'Cheapest flights to Jeddah next month',
  'Plan a 5-night Umrah for 2 people',
];

const QUICK_STARTS_AR = [
  'أفضل فنادق قرب الحرم بأقل من 500 ريال',
  'أرخص رحلات إلى جدة الشهر القادم',
  'خطط لعمرة 5 ليالٍ لشخصين',
];

const QUICK_STARTS_UR = [
  'حرم کے قریب بہترین ہوٹل — ۵۰۰ ریال سے کم',
  'اگلے مہینے جدہ کی سستی ترین پروازیں',
  'دو افراد کے لیے ۵ راتوں کا عمرہ پلان',
];

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
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAR = lang === 'ar';
  const isUR = lang === 'ur';
  const isRTL = isAR || isUR;
  const dir: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';
  const quickStarts = isAR ? QUICK_STARTS_AR : isUR ? QUICK_STARTS_UR : QUICK_STARTS_EN;

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
        aria-label={isAR ? 'مساعد أمك' : isUR ? 'اے ایم ای سی معاون' : 'AMEC AI Assistant'}
        dir={dir}
        className={[
          'fixed top-0 right-0 h-full z-50 flex flex-col',
          'w-full md:w-[380px]',
          'bg-gray-50 shadow-2xl border-s border-gray-200',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-500 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕌</span>
            <div>
              <div className="font-bold text-sm leading-tight">
                {isAR ? 'مساعد أمك' : isUR ? 'اے ایم ای سی معاون' : 'AMEC Assistant'}
              </div>
              <div className="text-emerald-100 text-xs">
                {isAR ? 'مساعدك لرحلة الحج والعمرة' : isUR ? 'حج اور عمرہ سفر کا رہنما' : 'Your Hajj & Umrah travel guide'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-600 transition-colors"
            aria-label={isAR ? 'إغلاق' : isUR ? 'بند کریں' : 'Close chat'}
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
              <p className="text-gray-500 text-sm text-center leading-relaxed">
                {isAR
                  ? 'مرحباً! أنا هنا لمساعدتك في تخطيط رحلة حجك أو عمرتك. كيف يمكنني مساعدتك؟'
                  : isUR
                  ? 'السلام علیکم! میں آپ کے حج یا عمرہ سفر کی منصوبہ بندی میں مدد کے لیے حاضر ہوں۔'
                  : "Hi! I'm here to help plan your Hajj or Umrah journey. How can I assist you?"}
              </p>
              <div className="flex flex-col gap-2 w-full">
                {quickStarts.map(qs => (
                  <button
                    key={qs}
                    onClick={() => onSend(qs)}
                    className="text-start px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors min-h-[44px]"
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
        <div className="flex-shrink-0 px-3 pb-4 pt-2 bg-white border-t border-gray-200">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={isAR ? 'اكتب رسالتك…' : isUR ? 'اپنا سوال لکھیں…' : 'Ask about hotels, flights, packages…'}
              disabled={isLoading}
              aria-label={isAR ? 'رسالتك' : isUR ? 'آپ کا پیغام' : 'Your message'}
              className={[
                'flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2',
                'text-sm text-gray-800 placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent',
                'disabled:bg-gray-50 disabled:cursor-not-allowed',
                'min-h-[44px]',
              ].join(' ')}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label={isAR ? 'إرسال' : isUR ? 'بھیجیں' : 'Send message'}
              className={[
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                'transition-colors font-bold text-lg',
                input.trim() && !isLoading
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed',
              ].join(' ')}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                isRTL ? '←' : '→'
              )}
            </button>
          </div>
          <p className="text-center text-gray-400 text-xs mt-1.5">
            {isAR ? 'Enter للإرسال · Shift+Enter لسطر جديد' : isUR ? 'Enter سے بھیجیں · Shift+Enter نئی سطر' : 'Enter to send · Shift+Enter for new line'}
          </p>
        </div>
      </div>
    </>
  );
}
