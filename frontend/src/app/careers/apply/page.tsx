import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getJobDescription } from '@/lib/careers/jobDescriptions';
import CareerApplyView from '@/components/careers/CareerApplyView';

export const metadata: Metadata = {
  title: 'Apply — Careers | UTUBooking',
  description: 'Submit your application to join the UTUBooking team.',
};

interface Props {
  searchParams: Promise<{ role?: string }>;
}

export default async function CareersApplyPage({ searchParams }: Props) {
  const t = await getTranslations('careers');
  const { role } = await searchParams;
  const roleName = role?.trim() || '';
  const job = roleName ? getJobDescription(roleName) : null;

  return (
    <div className="min-h-screen bg-utu-bg-page py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back link */}
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-sm text-utu-text-muted hover:text-utu-blue transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('applyPageBack')}
        </Link>

        {job ? (
          <CareerApplyView job={job} />
        ) : (
          <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-8 text-center">
            <p className="text-utu-text-muted text-sm mb-4">
              {roleName
                ? `${t('applyPageNoRole')} "${roleName}"`
                : t('applyPageNotFound')}
            </p>
            <Link
              href="/careers"
              className="inline-block bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              {t('applyPageViewOpen')}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
