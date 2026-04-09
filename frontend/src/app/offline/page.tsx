'use client';

// Static page — pre-rendered and cached by SW as offline navigation fallback
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function OfflinePage() {
  const t = useTranslations('offline');

  return (
    <div className="min-h-screen bg-utu-bg-page flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-utu-bg-subtle rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-8 h-8 text-utu-blue"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-utu-text-primary mb-2">{t('title')}</h1>
      <p className="text-utu-text-muted text-sm max-w-sm mb-8">{t('desc')}</p>

      <Link
        href="/"
        className="bg-utu-navy text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-utu-blue transition-colors focus:outline-none focus:ring-2 focus:ring-utu-blue focus:ring-offset-2"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}
