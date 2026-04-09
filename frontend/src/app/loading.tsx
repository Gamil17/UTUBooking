'use client';

import { useTranslations } from 'next-intl';

export default function Loading() {
  const t = useTranslations('common');
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-utu-border-default border-t-utu-blue animate-spin" />
        <p className="text-sm text-utu-text-muted animate-pulse">{t('loading')}</p>
      </div>
    </div>
  );
}
