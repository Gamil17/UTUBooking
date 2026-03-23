'use client';

import { useState } from 'react';
import ChatBubble from './ChatBubble';
import ChatPanel from './ChatPanel';
import { useChat } from './useChat';

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, error, lang, sendMessage, clearError } = useChat();

  const handleSend = (text: string) => {
    if (!isOpen) setIsOpen(true);
    sendMessage(text);
  };

  return (
    <>
      <ChatBubble
        isOpen={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
      />
      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        isLoading={isLoading}
        error={error}
        lang={lang}
        onSend={handleSend}
        onClearError={clearError}
      />
    </>
  );
}
