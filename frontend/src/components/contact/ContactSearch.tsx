'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  placeholder: string;
  btnLabel: string;
}

export default function ContactSearch({ placeholder, btnLabel }: Props) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/faq?q=${encodeURIComponent(q)}` : '/faq');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center bg-utu-bg-card rounded-xl overflow-hidden shadow-lg">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-3 text-sm text-utu-text-primary outline-none"
      />
      <button
        type="submit"
        className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-3 text-sm font-medium transition-colors"
      >
        {btnLabel}
      </button>
    </form>
  );
}
