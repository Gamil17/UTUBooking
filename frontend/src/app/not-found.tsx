import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found · UTUBooking',
};

export default async function NotFound() {
  const t = await getTranslations('common');

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Decorative number */}
      <p className="text-[120px] font-extrabold leading-none text-emerald-600 opacity-10 select-none">
        404
      </p>

      <div className="-mt-6">
        <h1 className="text-2xl font-bold text-utu-text-primary mb-3">{t('notFoundTitle')}</h1>
        <p className="text-utu-text-muted mb-8 max-w-sm">{t('notFoundDesc')}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white
                       hover:bg-emerald-600 transition-colors"
          >
            {t('goHome')}
          </Link>
          <Link
            href="/?tab=hotels"
            className="inline-block rounded-xl border border-utu-border-default px-6 py-3 text-sm font-medium
                       text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
          >
            {t('searchHotels')}
          </Link>
          <Link
            href="/?tab=flights"
            className="inline-block rounded-xl border border-utu-border-default px-6 py-3 text-sm font-medium
                       text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
          >
            {t('searchFlights')}
          </Link>
        </div>
      </div>
    </div>
  );
}
