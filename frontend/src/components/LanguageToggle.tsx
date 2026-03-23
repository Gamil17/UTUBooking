'use client';

import { useRouter } from 'next/navigation';

const LANGS = [
  { value: 'ar', label: 'ع' },
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
] as const;

type Lang = typeof LANGS[number]['value'];

interface Props {
  current: Lang;
}

/**
 * 3-way language toggle for the frontend.
 * Sets the NEXT_LOCALE cookie so the Edge Middleware and next-intl
 * request.ts will pick up the new locale on the next request.
 * Calls router.refresh() to re-render the current page with new messages.
 */
export default function LanguageToggle({ current }: Props) {
  const router = useRouter();

  function handleSelect(lang: Lang) {
    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      role="tablist"
      aria-label="Language selector"
      className="flex items-center gap-0.5 rounded-lg bg-white/20 p-0.5"
    >
      {LANGS.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={active}
            onClick={() => handleSelect(value)}
            className={[
              'min-w-[40px] rounded-md px-2 py-1 text-sm font-semibold transition-colors',
              active
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-white/80 hover:text-white',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
