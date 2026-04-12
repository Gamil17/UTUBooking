'use client';

import { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

export default function AffiliatesPageFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-utu-border-default border border-utu-border-default rounded-2xl overflow-hidden bg-utu-bg-card">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-start hover:bg-utu-bg-subtle transition-colors"
            aria-expanded={open === i}
          >
            <span className="text-sm font-semibold text-utu-text-primary pe-4">{item.q}</span>
            <span
              className={`shrink-0 w-5 h-5 text-utu-text-muted transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {open === i && (
            <div className="px-6 pb-5 pt-1 text-sm text-utu-text-muted leading-relaxed border-t border-utu-border-default bg-utu-bg-subtle">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
