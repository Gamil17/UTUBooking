'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    // Log to error tracking service when available
    console.error('[UTUBooking] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <svg
          className="w-8 h-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-utu-text-primary mb-3">{t('errorTitle')}</h1>
      <p className="text-utu-text-muted mb-2 max-w-sm">{t('errorDesc')}</p>

      {error.digest && (
        <p className="mb-8 font-mono text-xs text-utu-text-muted">
          Error ID: {error.digest}
        </p>
      )}

      {!error.digest && <div className="mb-8" />}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white
                     hover:bg-emerald-600 transition-colors"
        >
          {t('tryAgain')}
        </button>
        <Link
          href="/"
          className="inline-block rounded-xl border border-utu-border-default px-6 py-3 text-sm font-medium
                     text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
        >
          {t('goHome')}
        </Link>
        <Link
          href="/contact"
          className="inline-block rounded-xl border border-utu-border-default px-6 py-3 text-sm font-medium
                     text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
        >
          {t('contactSupport')}
        </Link>
      </div>
    </div>
  );
}
